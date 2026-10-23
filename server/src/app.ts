import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { Config } from './config.ts';
import { syntheticNight } from './fixtures.ts';
import type { Guard } from './guard.ts';
import { parseTwoChat } from './sources/twochat.ts';
import { unipileWebhook, whatsappRoutes } from './unipile/routes.ts';
import { WhatsAppError } from './unipile/client.ts';
import type { WhatsAppService } from './unipile/service.ts';

const WHATSAPP_SOURCE_ID = 'whatsapp';

const safeEqual = (a = '', b = '') => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const fail = (res: Response, code: number, error: string) => res.status(code).json({ error });

export function createApp(guard: Guard, config: Pick<Config, 'apiToken' | 'twoChat' | 'allowSimulate'> & Pick<Partial<Config>, 'unipile'>, whatsapp?: WhatsAppService, multiUser?: express.Router, bridge?: { worker: express.Router; demo: express.Router }) {
  if (whatsapp && !config.apiToken) throw new Error('La API de WhatsApp requiere autenticación.');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'solsets-server' }));
  if (bridge) {
    app.use('/internal/agent/v0', bridge.worker);
    app.use('/api/v1/demo', bridge.demo);
  }
  if (multiUser) app.use('/api/v1', multiUser);
  else app.use('/api/v1', (_req, res) => res.status(503).json({ error: 'multiuser_not_enabled' }));
  app.use('/api/webhooks/unipile', unipileWebhook(whatsapp, config.unipile?.webhookSecret));

  // Webhooks: authenticated by the secret in the URL, not by the app token.
  app.post('/api/webhooks/2chat/:token', async (req, res) => {
    if (!config.twoChat.webhookToken) return fail(res, 503, 'Webhook de 2Chat no configurado.');
    if (!safeEqual(String(req.params.token), config.twoChat.webhookToken)) return fail(res, 401, 'Token inválido.');

    // Persist first, so a parser bug never loses a message.
    await guard.saveRawEvent('2chat', req.body);
    const event = parseTwoChat(req.body ?? {}, typeof req.query.event === 'string' ? req.query.event : undefined);

    if (event.kind === 'status') {
      await guard.setSource(WHATSAPP_SOURCE_ID, 'whatsapp', event.status, event.detail);
      return res.json({ ok: true, status: event.status });
    }
    if (event.kind === 'ignored') return res.json({ ok: true, ignored: event.reason });

    await guard.touchSource(WHATSAPP_SOURCE_ID, 'whatsapp');
    // Reply fast; the agent may take seconds. The raw event is already stored.
    res.json({ ok: true, accepted: true });
    guard.ingest(event.message).catch((e) => console.error('[2chat] no se procesó:', e));
  });

  // Everything below is the app's API.
  app.use('/api', (req, res, next) => {
    if (!config.apiToken) return next();
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !safeEqual(token, config.apiToken)) return fail(res, 401, 'Falta el token de la app.');
    next();
  });
  app.use('/api/whatsapp', whatsappRoutes(whatsapp));

  app.get('/api/night/today', async (_req, res) => res.json(await guard.night()));
  app.put('/api/night/today', async (req, res) => {
    const { onCall } = z.object({ onCall: z.boolean() }).parse(req.body);
    res.json(await guard.setNight(onCall));
  });

  app.get('/api/feed', async (req, res) => {
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    res.json(await guard.feed(since));
  });

  app.post('/api/alerts/:id/seen', async (req, res) => {
    const alert = await guard.alertSeen(String(req.params.id));
    return alert ? res.json(alert) : fail(res, 404, 'Alerta no encontrada.');
  });

  app.post('/api/messages/:id/feedback', async (req, res) => {
    const { value } = z.object({ value: z.enum(['right', 'should_have_woken', 'should_not_have_woken']) }).parse(req.body);
    return (await guard.feedback(String(req.params.id), value)) ? res.json({ ok: true }) : fail(res, 404, 'Mensaje no encontrado.');
  });

  app.post('/api/worries', async (req, res) => {
    const { text } = z.object({ text: z.string().trim().min(1).max(2000) }).parse(req.body);
    res.json(await guard.addWorry(text));
  });

  app.get('/api/report', async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    res.json(await guard.report(date));
  });

  app.get('/api/metrics', async (_req, res) => res.json(await guard.metrics()));

  app.get('/api/settings', async (_req, res) => res.json(await guard.settings()));
  app.put('/api/settings', async (req, res) => {
    res.json(await guard.setSettings(z.object({ mode: z.enum(['shadow', 'active']) }).parse(req.body)));
  });

  app.get('/api/sources', async (_req, res) => res.json(await guard.sources()));

  app.post('/api/devices', async (req, res) => {
    const { expoPushToken } = z.object({ expoPushToken: z.string().min(10).max(300) }).parse(req.body);
    await guard.registerDevice(expoPushToken);
    res.json({ ok: true });
  });

  // Chat belongs to agent/ (Quito). Placeholder so the app can wire the screen.
  app.post('/api/chat', (req, res) => {
    z.object({ text: z.string().min(1) }).parse(req.body);
    res.status(503).json({ error: 'agent_not_connected', message: 'El chat todavía no está conectado al agente.' });
  });

  // Backup console: push a message by hand, and replay the synthetic night.
  app.post('/api/messages', async (req, res) => {
    const body = z
      .object({ text: z.string().trim().min(1).max(4000), sender: z.string().max(120).default('Consola'), group: z.string().max(120).optional() })
      .parse(req.body);
    const result = await guard.ingest({
      ...body, source: 'simulated', externalId: `console-${Date.now()}`, receivedAt: new Date().toISOString(),
    });
    res.json(result);
  });

  app.post('/api/simulate/night', async (_req, res) => {
    if (!config.allowSimulate) return fail(res, 403, 'Simulación desactivada.');
    const results = [];
    for (const m of syntheticNight()) results.push(await guard.ingest(m));
    res.json({ count: results.length, results });
  });

  app.use('/api', (_req, res) => fail(res, 404, 'Ruta no encontrada.'));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof WhatsAppError) return fail(res, err.status, err.message);
    if (err instanceof z.ZodError || err instanceof SyntaxError) return fail(res, 400, 'Datos inválidos. Revisa los campos enviados.');
    console.error(err);
    fail(res, 500, 'No se pudo completar la acción.');
  });

  return app;
}
