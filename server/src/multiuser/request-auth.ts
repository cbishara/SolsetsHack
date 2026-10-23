import type { Request, Response } from 'express';
import { IdentityError, IdentityService } from './identity.ts';

export type SessionTransport = 'native' | 'web';
const SESSION_COOKIE = '__Host-sol_session';
const LOGIN_COOKIE = '__Host-sol_login';
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'strict' as const, path: '/' };
const mutates = (req: Request) => !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

function cookie(req: Request, name: string) {
  const values = (req.get('Cookie') ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${name}=`));
  if (values.length > 1) throw new IdentityError(401, 'invalid_session');
  return values[0]?.slice(name.length + 1);
}

/** Browser credentials stay HttpOnly. Native clients explicitly carry individual bearer tokens. */
export function clientAuth(identity: IdentityService, publicUrl?: string) {
  const expectedOrigin = publicUrl ? new URL(publicUrl).origin : undefined;
  function transport(req: Request, requested?: SessionTransport): SessionTransport {
    const origin = req.get('Origin'), site = req.get('Sec-Fetch-Site');
    const browser = !!origin || !!site || cookie(req, SESSION_COOKIE) !== undefined || cookie(req, LOGIN_COOKIE) !== undefined;
    if (origin && origin !== expectedOrigin) throw new IdentityError(403, 'invalid_origin');
    if (site && !['same-origin', 'none'].includes(site)) throw new IdentityError(403, 'invalid_origin');
    if (requested === 'native' && browser) throw new IdentityError(403, 'invalid_transport');
    const mode = browser || requested === 'web' ? 'web' : 'native';
    if (mode === 'web') {
      if (!expectedOrigin) throw new IdentityError(403, 'browser_not_enabled');
      if (mutates(req) && (origin !== expectedOrigin || req.get('X-Sol-CSRF') !== '1' || !req.is('application/json'))) {
        throw new IdentityError(403, 'invalid_csrf');
      }
    }
    return mode;
  }
  return {
    transport,
    async authenticate(req: Request) {
      const mode = transport(req);
      const authorization = req.get('Authorization');
      if (mode === 'web' && authorization) throw new IdentityError(403, 'invalid_transport');
      const token = mode === 'web' ? cookie(req, SESSION_COOKIE) : authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
      if (!token) throw new IdentityError(401, 'invalid_session');
      return identity.authenticate(token);
    },
    session(res: Response, mode: SessionTransport, session: { token: string; userId: string; sessionId: string; expiresAt: string }) {
      if (mode === 'native') return session;
      res.cookie(SESSION_COOKIE, session.token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60_000 });
      const { token: _token, ...safe } = session;
      return safe;
    },
    login(res: Response, mode: SessionTransport, login: { challengeId: string; loginToken: string; expiresAt: string }) {
      if (mode === 'native') return { status: 'accepted', ...login };
      res.cookie(LOGIN_COOKIE, `${login.challengeId}.${login.loginToken}`, { ...cookieOptions, maxAge: 5 * 60_000 });
      return { status: 'accepted', challengeId: login.challengeId, expiresAt: login.expiresAt };
    },
    loginToken(req: Request, mode: SessionTransport, challengeId: string, supplied?: string) {
      if (mode === 'native') return supplied ?? '';
      if (supplied !== undefined) throw new IdentityError(400, 'invalid_data');
      const [cookieId, token, extra] = (cookie(req, LOGIN_COOKIE) ?? '').split('.');
      return cookieId === challengeId && !extra ? token ?? '' : '';
    },
    clearLogin(res: Response) { res.clearCookie(LOGIN_COOKIE, cookieOptions); },
    clearSession(res: Response) { res.clearCookie(SESSION_COOKIE, cookieOptions); },
  };
}
