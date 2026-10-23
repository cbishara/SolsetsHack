import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { MultiUserStore, MultiUserTransaction } from './store.ts';

const SESSION_TTL = 30 * 24 * 60 * 60_000;
const CONNECTION_TTL = 10 * 60_000;
const CODE_TTL = 5 * 60_000;
const RESEND_COOLDOWN = 60_000;
const SEND_WINDOW = 24 * 60 * 60_000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const matches = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const iso = (time: number) => new Date(time).toISOString();

export class IdentityError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

/** Created by authenticate(), never populated from a client-supplied userId. */
export type Principal = Readonly<{ userId: string; sessionId: string; expiresAt: string }>;
type Session = { id: string; userId: string; tokenHash: string; expiresAt: string; revoked?: boolean; epoch?: number };
type User = { id: string; createdAt: string; binding?: Binding; connectionEpoch: number; sessionEpoch?: number };
export type Binding = {
  userId: string; sessionId: string; connectionId: string; accountId: string; ownerId: string; recipientId: string;
  verifiedAt: string; version: number; status: 'verified' | 'disconnected';
};

/** Passed exclusively by the provider adapter after it verifies the provider account. */
export type CanonicalAccount = { accountId: string; ownerId: string; recipientId: string };
type Connection = {
  id: string; userId: string; sessionId: string; callbackHash: string; callbackExpiresAt: string; epoch: number;
  status: 'connecting' | 'awaiting_code' | 'verified' | 'disconnected';
  account?: CanonicalAccount; challengeId?: string; callbackCodeIssued?: boolean;
  pairing?: { expectedOwnerHash: string; accountId?: string; lastCheckedAt?: number };
};
type CodeStatus = 'prepared' | 'sent' | 'failed' | 'uncertain' | 'consumed' | 'invalidated';
type Challenge = {
  id: string; connectionId: string; userId: string; sessionId: string; accountId: string;
  ownerId: string; codeHash: string; expiresAt: string; createdAt: string; attempts: number; status: CodeStatus;
};
type SendQuota = { windowStart: number; lastSentAt: number; count: number };
type LoginChallenge = {
  id: string; tokenHash: string; codeHash: string; expiresAt: string; attempts: number; status: CodeStatus;
  userId?: string; accountId?: string; ownerId?: string; bindingVersion?: number; sessionEpoch?: number;
};
export type LoginDelivery = { challengeId: string; recipientId: string; code: string };
export type CodeDelivery = {
  challengeId: string; connectionId: string; accountId: string; recipientId: string; code: string; expiresAt: string;
};
export type ConnectionState = {
  connectionId: string; status: Connection['status']; expiresAt: string;
  codeStatus?: CodeStatus; codeExpiresAt?: string;
};

export class IdentityService {
  private readonly clock: () => number;
  private readonly secret: string;

  constructor(private readonly store: MultiUserStore, options: { secret: string; clock?: () => number }) {
    if (Buffer.byteLength(options.secret) < 32) throw new Error('Identity secret must contain at least 32 bytes.');
    this.secret = options.secret;
    this.clock = options.clock ?? Date.now;
  }

  /** Installation session, not account recovery. Store the returned bearer in secure client storage. */
  async createSession() {
    const token = randomBytes(32).toString('base64url');
    const session: Session = { id: randomUUID(), userId: randomUUID(), tokenHash: hash(token), expiresAt: iso(this.clock() + SESSION_TTL) };
    await this.store.transaction(async (tx) => {
      await tx.put<User>('identity_users', session.userId, { id: session.userId, createdAt: iso(this.clock()), connectionEpoch: 0 });
      await tx.put('identity_sessions', session.id, session);
      await tx.put('identity_session_tokens', session.tokenHash, { sessionId: session.id });
    });
    return { token, userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt };
  }

  async authenticate(token: string): Promise<Principal> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new IdentityError(401, 'invalid_session');
    return this.store.transaction(async (tx) => {
      const index = await tx.get<{ sessionId: string }>('identity_session_tokens', hash(token));
      const session = index ? await tx.get<Session>('identity_sessions', index.sessionId) : undefined;
      if (!session || !matches(session.tokenHash, hash(token))) {
        throw new IdentityError(401, 'invalid_session');
      }
      await this.assertPrincipal(tx, { userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt });
      return { userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt };
    });
  }

  private async assertPrincipal(tx: MultiUserTransaction, principal: Principal) {
    const session = await tx.get<Session>('identity_sessions', principal.sessionId);
    const user = session ? await tx.get<User>('identity_users', session.userId) : undefined;
    if (!session || !user || session.userId !== principal.userId || session.revoked || Date.parse(session.expiresAt) <= this.clock() ||
        (session.epoch ?? 0) !== (user.sessionEpoch ?? 0)) {
      throw new IdentityError(401, 'invalid_session');
    }
    return session;
  }

  /** Recheck an authenticated application principal inside the caller's atomic write/read. */
  async assertPrincipalInTransaction(tx: MultiUserTransaction, principal: Principal): Promise<void> {
    await this.assertPrincipal(tx, principal);
  }

  /** Revoke only this device, or every session without a bounded scan of session records. */
  async logout(principal: Principal, allDevices = false) {
    await this.store.transaction(async tx => {
      const session = await this.assertPrincipal(tx, principal);
      await tx.put('identity_sessions', session.id, { ...session, revoked: true });
      if (allDevices) {
        const user = (await tx.get<User>('identity_users', principal.userId))!;
        await tx.put('identity_users', user.id, { ...user, sessionEpoch: (user.sessionEpoch ?? 0) + 1 });
      }
    });
  }

  private loginHash(challenge: LoginChallenge, code: string) {
    return createHmac('sha256', this.secret).update(JSON.stringify([
      'sol-whatsapp-login-v1', challenge.id, challenge.tokenHash, challenge.userId, challenge.accountId,
      challenge.ownerId, challenge.bindingVersion, challenge.sessionEpoch, code,
    ])).digest('hex');
  }

  /** Phone is a lookup only. Only a previously verified canonical recipient can receive a code. */
  async prepareLogin(phone: string) {
    const canonical = phone.replace(/^\+/, '');
    if (!/^[1-9][0-9]{6,14}$/.test(canonical)) throw new IdentityError(400, 'invalid_phone');
    const loginToken = randomBytes(32).toString('base64url');
    const challengeId = randomUUID();
    const expiresAt = iso(this.clock() + CODE_TTL);
    const delivery = await this.store.transaction(async tx => {
      const indexed = await tx.get<Binding>('identity_whatsapp_owners', `whatsapp:${canonical}`);
      const binding = await this.currentIndexedBinding(tx, indexed);
      const challenge: LoginChallenge = { id: challengeId, tokenHash: hash(loginToken), codeHash: '', expiresAt, attempts: 0, status: 'invalidated' };
      let send: LoginDelivery | undefined;
      if (binding) {
        const now = this.clock(), quotaKey = hash(binding.ownerId);
        const previousQuota = await tx.get<SendQuota>('identity_send_quotas', quotaKey);
        const quota = !previousQuota || previousQuota.windowStart + SEND_WINDOW <= now ? { windowStart: now, lastSentAt: now - RESEND_COOLDOWN, count: 0 } : previousQuota;
        // Quotas have the same public outcome as an unknown identity; no account enumeration.
        if (quota.lastSentAt + RESEND_COOLDOWN <= now && quota.count < MAX_SENDS) {
          const previous = await tx.get<{ id: string }>('identity_pending_logins', quotaKey);
          const old = previous ? await tx.get<LoginChallenge>('identity_login_challenges', previous.id) : undefined;
          if (old && old.status !== 'consumed') await tx.put('identity_login_challenges', old.id, { ...old, status: 'invalidated' });
          const user = (await tx.get<User>('identity_users', binding.userId))!;
          Object.assign(challenge, { userId: binding.userId, accountId: binding.accountId, ownerId: binding.ownerId,
            bindingVersion: binding.version, sessionEpoch: user.sessionEpoch ?? 0, status: 'prepared' });
          const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
          challenge.codeHash = this.loginHash(challenge, code);
          send = { challengeId, recipientId: binding.recipientId, code };
          await tx.put('identity_send_quotas', quotaKey, { ...quota, lastSentAt: now, count: quota.count + 1 });
          await tx.put('identity_pending_logins', quotaKey, { id: challengeId });
        }
      }
      await tx.put('identity_login_challenges', challengeId, challenge);
      return send;
    });
    // delivery is server-only. The route returns the same envelope for every accepted request.
    return { challengeId, loginToken, expiresAt, delivery };
  }

  async markLoginDelivery(challengeId: string, status: 'sent' | 'uncertain') {
    await this.store.transaction(async tx => {
      const challenge = await tx.get<LoginChallenge>('identity_login_challenges', challengeId);
      if (!challenge) throw new IdentityError(404, 'challenge_not_found');
      if (challenge.status === status) return;
      if (challenge.status !== 'prepared') throw new IdentityError(409, 'delivery_already_resolved');
      await tx.put('identity_login_challenges', challenge.id, { ...challenge, status });
    });
  }

  /** A login grants a new session for the same user; never merges or reassigns an installation. */
  async verifyLogin(challengeId: string, loginToken: string, code: string) {
    const result = await this.store.transaction(async tx => {
      const challenge = await tx.get<LoginChallenge>('identity_login_challenges', challengeId);
      const fail = { error: new IdentityError(400, 'invalid_or_expired_code') };
      if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(loginToken) || !matches(challenge.tokenHash, hash(loginToken)) ||
          challenge.status !== 'sent' || Date.parse(challenge.expiresAt) <= this.clock() || challenge.attempts >= MAX_ATTEMPTS) return fail;
      // Do not let a different initiating client burn this challenge's attempts.
      if (!/^\d{6}$/.test(code) || !matches(challenge.codeHash, this.loginHash(challenge, code))) {
        await tx.put('identity_login_challenges', challenge.id, { ...challenge, attempts: challenge.attempts + 1 });
        return fail;
      }
      const user = challenge.userId ? await tx.get<User>('identity_users', challenge.userId) : undefined;
      const binding = user?.binding;
      if (!user || !binding || binding.status !== 'verified' || binding.accountId !== challenge.accountId || binding.ownerId !== challenge.ownerId ||
          binding.version !== challenge.bindingVersion || (user.sessionEpoch ?? 0) !== challenge.sessionEpoch) return fail;
      const token = randomBytes(32).toString('base64url');
      const session: Session = { id: randomUUID(), userId: user.id, tokenHash: hash(token), expiresAt: iso(this.clock() + SESSION_TTL), epoch: user.sessionEpoch ?? 0 };
      await tx.put('identity_sessions', session.id, session);
      await tx.put('identity_session_tokens', session.tokenHash, { sessionId: session.id });
      await tx.put('identity_login_challenges', challenge.id, { ...challenge, status: 'consumed' });
      return { token, userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt };
    });
    if ('error' in result) throw result.error;
    return result;
  }

  async beginConnection(principal: Principal, options: { pairingPhone?: string } = {}) {
    if (options.pairingPhone && !/^[1-9][0-9]{6,14}$/.test(options.pairingPhone)) throw new IdentityError(400, 'invalid_phone');
    const connectionId = randomUUID();
    const callbackToken = randomBytes(32).toString('base64url');
    const expiresAt = iso(this.clock() + CONNECTION_TTL);
    const reconnectAccountId = await this.store.transaction(async (tx) => {
      await this.assertPrincipal(tx, principal);
      const user = (await tx.get<User>('identity_users', principal.userId))!;
      if (options.pairingPhone && user.binding) throw new IdentityError(409, 'pairing_reconnect_requires_hosted');
      const key = principal.sessionId;
      const previousId = await tx.get<{ connectionId: string }>('identity_pending_connections', key);
      const previous = previousId ? await tx.get<Connection>('identity_connections', previousId.connectionId) : undefined;
      if (previous && previous.epoch === user.connectionEpoch && previous.status !== 'verified' && previous.status !== 'disconnected' && Date.parse(previous.callbackExpiresAt) > this.clock()) {
        throw new IdentityError(409, 'connection_in_progress');
      }
      await tx.put<Connection>('identity_connections', connectionId, {
        id: connectionId, userId: principal.userId, sessionId: principal.sessionId,
        callbackHash: hash(callbackToken), callbackExpiresAt: expiresAt, epoch: user.connectionEpoch, status: 'connecting',
        ...(options.pairingPhone ? { pairing: { expectedOwnerHash: hash(`whatsapp:${options.pairingPhone}`) } } : {}),
      });
      await tx.put('identity_pending_connections', key, { connectionId });
      return user.binding?.accountId;
    });
    // reconnectAccountId is server adapter input only; never choose it from the browser body.
    return { connectionId, callbackToken, expiresAt, reconnectAccountId };
  }

  /** Cancel a failed link creation so the caller can retry without waiting for expiry. */
  async cancelConnection(principal: Principal, connectionId: string) {
    await this.store.transaction(async (tx) => {
      const connection = await this.ownedConnection(tx, principal, connectionId);
      if (connection.status === 'verified') throw new IdentityError(409, 'connection_already_verified');
      await tx.put('identity_connections', connection.id, { ...connection, status: 'disconnected' });
      if (connection.challengeId) {
        const challenge = await tx.get<Challenge>('identity_challenges', connection.challengeId);
        if (challenge && challenge.status !== 'consumed') await tx.put('identity_challenges', challenge.id, { ...challenge, status: 'invalidated' });
      }
    });
  }

  private async ownedConnection(tx: MultiUserTransaction, principal: Principal, connectionId: string) {
    await this.assertPrincipal(tx, principal);
    const connection = await tx.get<Connection>('identity_connections', connectionId);
    if (!connection || connection.userId !== principal.userId || connection.sessionId !== principal.sessionId) {
      throw new IdentityError(404, 'connection_not_found');
    }
    const user = await tx.get<User>('identity_users', principal.userId);
    if (connection.epoch !== user?.connectionEpoch) return { ...connection, status: 'disconnected' as const };
    return connection;
  }

  private async trustedCallback(tx: MultiUserTransaction, connectionId: string, callbackToken: string) {
    const connection = await tx.get<Connection>('identity_connections', connectionId);
    if (!connection || !/^[A-Za-z0-9_-]{43}$/.test(callbackToken) || !matches(connection.callbackHash, hash(callbackToken)) ||
        Date.parse(connection.callbackExpiresAt) <= this.clock()) throw new IdentityError(401, 'invalid_connection_callback');
    await this.assertPrincipal(tx, { userId: connection.userId, sessionId: connection.sessionId, expiresAt: connection.callbackExpiresAt });
    const user = await tx.get<User>('identity_users', connection.userId);
    if (connection.epoch !== user?.connectionEpoch || connection.status === 'disconnected') throw new IdentityError(409, 'connection_disconnected');
    return connection;
  }

  /** Validate BEFORE an external account lookup; returned identifiers stay on the server. */
  async callbackConnection(connectionId: string, callbackToken: string) {
    return this.store.transaction(async (tx) => {
      const connection = await this.trustedCallback(tx, connectionId, callbackToken);
      return { connectionId: connection.id, status: connection.status, accountId: connection.account?.accountId };
    });
  }

  /** Trust boundary: no route may pass an account/recipient supplied by the browser here. */
  async attachAccount(connectionId: string, callbackToken: string, account: CanonicalAccount) {
    for (const value of Object.values(account)) if (typeof value !== 'string' || !value || value.length > 512) throw new IdentityError(400, 'invalid_provider_identity');
    return this.store.transaction(async (tx) => {
      const connection = await this.trustedCallback(tx, connectionId, callbackToken);
      if (connection.pairing) throw new IdentityError(409, 'pairing_requires_status_check');
      await this.attachInTransaction(tx, connection, account);
      return this.publicConnection(tx, connection);
    });
  }

  private async attachInTransaction(tx: MultiUserTransaction, connection: Connection, account: CanonicalAccount) {
    if (connection.account && (connection.account.accountId !== account.accountId || connection.account.ownerId !== account.ownerId ||
        connection.account.recipientId !== account.recipientId)) throw new IdentityError(409, 'connection_account_changed');
    await this.assertOwnershipAvailable(tx, connection.userId, account);
    if (connection.status === 'disconnected') throw new IdentityError(409, 'connection_disconnected');
    connection.account = { ...account };
    if (connection.status === 'connecting') connection.status = 'awaiting_code';
    await tx.put('identity_connections', connection.id, connection);
  }

  private async ownedPairing(tx: MultiUserTransaction, principal: Principal, connectionId: string) {
    const connection = await this.ownedConnection(tx, principal, connectionId);
    if (!connection.pairing) throw new IdentityError(409, 'not_a_pairing_connection');
    if (connection.status === 'disconnected') throw new IdentityError(409, 'connection_disconnected');
    if (connection.status !== 'verified' && Date.parse(connection.callbackExpiresAt) <= this.clock()) throw new IdentityError(410, 'connection_expired');
    return connection as Connection & { pairing: NonNullable<Connection['pairing']> };
  }

  /** Account ID comes only from our provider create request, never from a client body. */
  async setPairingAccount(principal: Principal, connectionId: string, accountId: string) {
    if (!accountId || accountId.length > 512) throw new IdentityError(400, 'invalid_provider_identity');
    await this.store.transaction(async tx => {
      const connection = await this.ownedPairing(tx, principal, connectionId);
      if (connection.status !== 'connecting' || (connection.pairing.accountId && connection.pairing.accountId !== accountId)) throw new IdentityError(409, 'connection_account_changed');
      connection.pairing.accountId = accountId;
      await tx.put('identity_connections', connection.id, connection);
    });
  }

  /** At most one provider poll per two seconds; caller may only poll its own pending connection. */
  async checkPairing(principal: Principal, connectionId: string) {
    return this.store.transaction(async tx => {
      const connection = await this.ownedPairing(tx, principal, connectionId);
      if (!connection.pairing.accountId) throw new IdentityError(409, 'connection_not_ready');
      if (connection.status !== 'connecting' || (connection.pairing.lastCheckedAt !== undefined && connection.pairing.lastCheckedAt + 2000 > this.clock())) return undefined;
      connection.pairing.lastCheckedAt = this.clock();
      await tx.put('identity_connections', connection.id, connection);
      return connection.pairing.accountId;
    });
  }

  /** Only canonical connected provider identity can advance pairing to a SOL verification code. */
  async completePairing(principal: Principal, connectionId: string, account: CanonicalAccount) {
    for (const value of Object.values(account)) if (typeof value !== 'string' || !value || value.length > 512) throw new IdentityError(400, 'invalid_provider_identity');
    return this.store.transaction(async tx => {
      const connection = await this.ownedPairing(tx, principal, connectionId);
      if (account.accountId !== connection.pairing.accountId || !matches(hash(account.ownerId), connection.pairing.expectedOwnerHash)) throw new IdentityError(409, 'pairing_identity_mismatch');
      await this.attachInTransaction(tx, connection, account);
      if (connection.callbackCodeIssued || connection.status === 'verified') return null;
      connection.callbackCodeIssued = true;
      return this.prepare(tx, connection);
    });
  }

  private async assertOwnershipAvailable(tx: MultiUserTransaction, userId: string, account: CanonicalAccount) {
    // A transaction owns one pg client; issue its queries sequentially (pg 9 rejects overlapping queries).
    const accountOwner = await tx.get<Binding>('identity_account_owners', account.accountId);
    const identityOwner = await tx.get<Binding>('identity_whatsapp_owners', account.ownerId);
    const user = await tx.get<User>('identity_users', userId);
    if (!user || (accountOwner && accountOwner.userId !== userId) || (identityOwner && identityOwner.userId !== userId) ||
      (user.binding && (user.binding.accountId !== account.accountId || user.binding.ownerId !== account.ownerId))) {
      throw new IdentityError(409, 'identity_already_linked');
    }
  }

  private async publicConnection(tx: MultiUserTransaction, connection: Connection): Promise<ConnectionState> {
    const challenge = connection.challengeId ? await tx.get<Challenge>('identity_challenges', connection.challengeId) : undefined;
    return { connectionId: connection.id, status: connection.status, expiresAt: connection.callbackExpiresAt,
      ...(challenge ? { codeStatus: connection.status === 'disconnected' ? 'invalidated' : challenge.status, codeExpiresAt: challenge.expiresAt } : {}) };
  }

  async connection(principal: Principal, connectionId: string) {
    return this.store.transaction(async (tx) => this.publicConnection(tx, await this.ownedConnection(tx, principal, connectionId)));
  }

  private codeHash(challenge: Pick<Challenge, 'id' | 'connectionId' | 'userId' | 'sessionId' | 'accountId' | 'ownerId'>, code: string) {
    return createHmac('sha256', this.secret).update(JSON.stringify([
      'sol-whatsapp-code-v1', challenge.id, challenge.connectionId, challenge.userId, challenge.sessionId, challenge.accountId, challenge.ownerId, code,
    ])).digest('hex');
  }

  private async prepare(tx: MultiUserTransaction, connection: Connection): Promise<CodeDelivery> {
    const account = connection.account;
    if (connection.status !== 'awaiting_code' || !account || Date.parse(connection.callbackExpiresAt) <= this.clock()) {
      throw new IdentityError(409, 'connection_not_ready');
    }
    await this.assertOwnershipAvailable(tx, connection.userId, account);
    const now = this.clock();
    const quotaKey = hash(account.ownerId);
    const previousQuota = await tx.get<SendQuota>('identity_send_quotas', quotaKey);
    const quota = !previousQuota || previousQuota.windowStart + SEND_WINDOW <= now ? { windowStart: now, lastSentAt: now - RESEND_COOLDOWN, count: 0 } : previousQuota;
    if (quota.lastSentAt + RESEND_COOLDOWN > now) throw new IdentityError(429, 'code_resend_cooldown');
    if (quota.count >= MAX_SENDS) throw new IdentityError(429, 'code_send_limit');
    if (connection.challengeId) {
      const previous = await tx.get<Challenge>('identity_challenges', connection.challengeId);
      if (previous && previous.status !== 'consumed') await tx.put('identity_challenges', previous.id, { ...previous, status: 'invalidated' });
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const challenge: Challenge = {
      id: randomUUID(), connectionId: connection.id, userId: connection.userId, sessionId: connection.sessionId,
      accountId: account.accountId, ownerId: account.ownerId, codeHash: '',
      expiresAt: iso(Math.min(now + CODE_TTL, Date.parse(connection.callbackExpiresAt))), createdAt: iso(now), attempts: 0, status: 'prepared',
    };
    challenge.codeHash = this.codeHash(challenge, code);
    connection.challengeId = challenge.id;
    await tx.put('identity_challenges', challenge.id, challenge);
    await tx.put('identity_connections', connection.id, connection);
    await tx.put('identity_send_quotas', quotaKey, { ...quota, lastSentAt: now, count: quota.count + 1 });
    return { challengeId: challenge.id, connectionId: connection.id, accountId: account.accountId,
      recipientId: account.recipientId, code, expiresAt: challenge.expiresAt };
  }

  /** Explicit initial send/resend. Adapter must never return this object's code to a client. */
  async prepareCode(principal: Principal, connectionId: string) {
    return this.store.transaction(async (tx) => this.prepare(tx, await this.ownedConnection(tx, principal, connectionId)));
  }

  /** Automatic callback send occurs once; retries never rotate the code or send it twice. */
  async prepareCodeFromCallback(connectionId: string, callbackToken: string): Promise<CodeDelivery | null> {
    return this.store.transaction(async (tx) => {
      const connection = await this.trustedCallback(tx, connectionId, callbackToken);
      if (connection.callbackCodeIssued || connection.status === 'verified') return null;
      connection.callbackCodeIssued = true;
      return this.prepare(tx, connection);
    });
  }

  /** Only the sender adapter calls this after the provider result. Unknown delivery cannot verify. */
  async markCodeDelivery(challengeId: string, status: 'sent' | 'failed' | 'uncertain') {
    return this.store.transaction(async (tx) => {
      const challenge = await tx.get<Challenge>('identity_challenges', challengeId);
      if (!challenge) throw new IdentityError(404, 'challenge_not_found');
      if (challenge.status === status) return;
      if (challenge.status !== 'prepared') throw new IdentityError(409, 'delivery_already_resolved');
      const connection = await tx.get<Connection>('identity_connections', challenge.connectionId);
      if (!connection || connection.challengeId !== challenge.id) throw new IdentityError(409, 'challenge_replaced');
      await tx.put('identity_challenges', challenge.id, { ...challenge, status });
    });
  }

  async verifyCode(principal: Principal, connectionId: string, code: string): Promise<Binding> {
    const result = await this.store.transaction(async (tx): Promise<{ binding: Binding } | { error: IdentityError }> => {
      const connection = await this.ownedConnection(tx, principal, connectionId);
      const challenge = connection.challengeId ? await tx.get<Challenge>('identity_challenges', connection.challengeId) : undefined;
      if (!connection.account || connection.status !== 'awaiting_code' || !challenge || challenge.status !== 'sent' ||
          Date.parse(challenge.expiresAt) <= this.clock() || challenge.attempts >= MAX_ATTEMPTS) {
        return { error: new IdentityError(400, 'invalid_or_expired_code') };
      }
      // Attempt counters commit even on an incorrect code. Throwing inside this transaction would roll them back.
      if (!/^\d{6}$/.test(code) || !matches(challenge.codeHash, this.codeHash(challenge, code))) {
        await tx.put('identity_challenges', challenge.id, { ...challenge, attempts: challenge.attempts + 1 });
        return { error: new IdentityError(400, 'invalid_or_expired_code') };
      }
      await this.assertOwnershipAvailable(tx, principal.userId, connection.account);
      const user = (await tx.get<User>('identity_users', principal.userId))!;
      const binding: Binding = {
        userId: principal.userId, sessionId: principal.sessionId, connectionId: connection.id, ...connection.account,
        verifiedAt: iso(this.clock()), version: (user.binding?.version ?? 0) + 1, status: 'verified',
      };
      await tx.put('identity_users', user.id, { ...user, binding });
      await tx.put('identity_account_owners', binding.accountId, binding);
      await tx.put('identity_whatsapp_owners', binding.ownerId, binding);
      await tx.put('identity_challenges', challenge.id, { ...challenge, status: 'consumed' });
      await tx.put('identity_connections', connection.id, { ...connection, status: 'verified' });
      return { binding };
    });
    if ('error' in result) throw result.error;
    return result.binding;
  }

  async bindingInTransaction(tx: MultiUserTransaction, principal: Principal): Promise<Binding> {
    await this.assertPrincipal(tx, principal);
    const user = await tx.get<User>('identity_users', principal.userId);
    if (!user?.binding || user.binding.status !== 'verified') throw new IdentityError(409, 'whatsapp_not_verified');
    return user.binding;
  }

  async binding(principal: Principal) {
    return this.store.transaction(async (tx) => this.bindingInTransaction(tx, principal));
  }

  async resolveAccountInTransaction(tx: MultiUserTransaction, accountId: string): Promise<Binding | undefined> {
    const binding = await tx.get<Binding>('identity_account_owners', accountId);
    return this.currentIndexedBinding(tx, binding);
  }

  private async currentIndexedBinding(tx: MultiUserTransaction, indexed: Binding | undefined): Promise<Binding | undefined> {
    if (!indexed || indexed.status !== 'verified') return undefined;
    const current = (await tx.get<User>('identity_users', indexed.userId))?.binding;
    if (!current || current.status !== 'verified' || current.accountId !== indexed.accountId || current.ownerId !== indexed.ownerId ||
        current.version !== indexed.version || current.connectionId !== indexed.connectionId) return undefined;
    return current;
  }

  async resolveAccount(accountId: string) {
    return this.store.transaction(async (tx) => this.resolveAccountInTransaction(tx, accountId));
  }

  async resolveOwner(ownerId: string): Promise<Binding | undefined> {
    return this.store.transaction(async (tx) => {
      const binding = await tx.get<Binding>('identity_whatsapp_owners', ownerId);
      return this.currentIndexedBinding(tx, binding);
    });
  }

  async disconnect(principal: Principal) {
    return this.store.transaction(async (tx) => {
      const binding = await this.bindingInTransaction(tx, principal);
      const next: Binding = { ...binding, status: 'disconnected', version: binding.version + 1 };
      const user = (await tx.get<User>('identity_users', principal.userId))!;
      // Epoch invalidates every older callback/challenge atomically without scanning
      // other users' connections or relying on a bounded list of pending records.
      await tx.put('identity_users', user.id, { ...user, connectionEpoch: user.connectionEpoch + 1, binding: next });
      const pending = await tx.get<{ connectionId: string }>('identity_pending_connections', principal.sessionId);
      for (const connectionId of new Set([binding.connectionId, pending?.connectionId].filter((id): id is string => !!id))) {
        const connection = await tx.get<Connection>('identity_connections', connectionId);
        if (!connection || connection.userId !== principal.userId) continue;
        await tx.put('identity_connections', connection.id, { ...connection, status: 'disconnected' });
        if (connection.challengeId) {
          const challenge = await tx.get<Challenge>('identity_challenges', connection.challengeId);
          if (challenge && challenge.status !== 'consumed') await tx.put('identity_challenges', challenge.id, { ...challenge, status: 'invalidated' });
        }
      }
      await tx.put('identity_account_owners', binding.accountId, next);
      await tx.put('identity_whatsapp_owners', binding.ownerId, next);
      return next;
    });
  }
}
