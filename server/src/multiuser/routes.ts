import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { IdentityError, IdentityService, type Principal, type CodeDelivery } from './identity.ts';
import { CatalogService, CatalogError, type CatalogProvider, type NormalizedMessage } from './catalog.ts';
import { scopedKey, type MultiUserStore } from './store.ts';
import { WhatsAppError } from '../unipile/client.ts';

export interface LinkingProvider extends CatalogProvider {
  botAccountId: string;
  link(connectionId: string, callbackUrl: string, expiresAt: string, reconnectAccountId?: string): Promise<string>;
  owner(accountId: string): Promise<{ accountId: string; ownerId: string; recipientId: string }>;
  sendCode(recipientId: string, code: string): Promise<{ chatId: string; messageId: string }>;
  subscribe(accountId: string, publicUrl: string, secret: string): Promise<void>;
  message(accountId: string, messageId: string): Promise<NormalizedMessage | null>;
}
type Delivery = { connectionId: string; accountId: string; recipientId: string; chatId: string; messageId: string };
type BotRoute = { userId: string; accountId: string; recipientId: string; bindingVersion: number; chatId: string; verifiedAt: string };
const identifier = z.string().min(1).max(512);
const cursor = z.string().min(1).max(8192).optional();
const emptyBody = z.object({}).strict();
const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Independent authentication boundary. Never mount behind the shared legacy owner token. */
export function multiUserRouter(options: {
  store: MultiUserStore; identity: IdentityService; catalog: CatalogService; provider: LinkingProvider;
  publicUrl: string; webhookSecret: string; rateSecret: string;
}) {
  const { store, identity, catalog, provider, publicUrl, webhookSecret, rateSecret } = options;
  const origin = new URL(publicUrl);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Multiuser public URL must be an HTTPS origin.');
  if (webhookSecret.length < 32 || rateSecret.length < 32 || webhookSecret === rateSecret) throw new Error('Separate multiuser secrets are required.');
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const principal = (res: Response) => res.locals.principal as Principal;
  const limited = async (key: string, limit: number, duration: number) => {
    const hash = createHmac('sha256', rateSecret).update(key).digest('hex');
    const now = Date.now();
    await store.transaction(async tx => {
      const old = await tx.get<{ count: number; until: number }>('api_limits', hash);
      const quota = old && old.until > now ? old : { count: 0, until: now + duration };
      if (quota.count >= limit) throw new IdentityError(429, 'rate_limited');
      await tx.put('api_limits', hash, { ...quota, count: quota.count + 1 });
    });
  };

  async function deliver(code: CodeDelivery) {
    try {
      const sent = await provider.sendCode(code.recipientId, code.code);
      await store.transaction(async tx => tx.put<Delivery>('connection_deliveries', code.connectionId, {
        connectionId: code.connectionId, accountId: code.accountId, recipientId: code.recipientId, ...sent,
      }));
      await identity.markCodeDelivery(code.challengeId, 'sent');
    } catch {
      // A failed HTTP response can mean WhatsApp accepted the send. Do not blindly retry.
      await identity.markCodeDelivery(code.challengeId, 'uncertain').catch(() => {});
      throw new IdentityError(502, 'code_delivery_uncertain');
    }
  }
  async function activate(p: Principal, connectionId: string) {
    const state = await identity.connection(p, connectionId);
    if (state.status !== 'verified') throw new IdentityError(409, 'whatsapp_not_verified');
    const binding = await identity.binding(p);
    if (binding.connectionId !== connectionId) throw new IdentityError(409, 'binding_changed');
    const delivery = await store.transaction(tx => tx.get<Delivery>('connection_deliveries', connectionId));
    if (!delivery || delivery.accountId !== binding.accountId || delivery.recipientId !== binding.recipientId) throw new IdentityError(409, 'bot_route_unavailable');
    // Creating subscriptions can fail after verification. /activate safely retries that setup.
    await provider.subscribe(binding.accountId, origin.origin, webhookSecret);
    await provider.subscribe(provider.botAccountId, origin.origin, webhookSecret);
    await store.transaction(async tx => {
      const current = await identity.bindingInTransaction(tx, p);
      if (current.version !== binding.version) throw new IdentityError(409, 'binding_changed');
      await tx.put<BotRoute>('bot_routes', scopedKey(provider.botAccountId, delivery.chatId), {
        userId: binding.userId, accountId: binding.accountId, recipientId: binding.recipientId,
        bindingVersion: binding.version, chatId: delivery.chatId, verifiedAt: binding.verifiedAt,
      });
    });
    return { status: 'verified', monitoringReady: true, agent: 'not_connected', autoReply: false };
  }

  router.post('/sessions', async (req, res) => {
    emptyBody.parse(req.body ?? {});
    // Do not trust X-Forwarded-For supplied by the caller. Configure a verified edge upstream when scaling.
    await limited(`sessions:${req.socket.remoteAddress ?? 'unknown'}`, 20, 3_600_000);
    res.status(201).json(await identity.createSession());
  });
  router.post('/webhooks/connected/:connectionId/:callbackToken', async (req, res) => {
    const connectionId = String(req.params.connectionId), token = String(req.params.callbackToken);
    const state = await identity.callbackConnection(connectionId, token);
    const body = z.object({ status: z.enum(['CREATION_SUCCESS', 'RECONNECTED']), account_id: identifier, name: identifier }).parse(req.body);
    if (body.name !== connectionId || (state.accountId && state.accountId !== body.account_id)) throw new IdentityError(409, 'callback_account_mismatch');
    const account = await provider.owner(body.account_id);
    await identity.attachAccount(connectionId, token, account);
    const code = await identity.prepareCodeFromCallback(connectionId, token);
    if (code) await deliver(code);
    res.json({ ok: true });
  });
  router.post('/webhooks/unipile', async (req, res) => {
    if (!equal(req.get('X-Sol-Webhook-Secret') ?? '', webhookSecret)) throw new IdentityError(401, 'invalid_webhook');
    const parsed = z.object({ event: z.literal('message_received'), account_type: z.literal('WHATSAPP'),
      account_id: identifier, chat_id: identifier, message_id: identifier }).safeParse(req.body);
    if (!parsed.success) return res.json({ ignored: 'unsupported_event' });
    const event = parsed.data;
    if (event.account_id !== provider.botAccountId) {
      const permission = await catalog.receivePermission(event.account_id, event.chat_id);
      if (!permission) return res.json({ ignored: 'not_selected' });
      const message = await provider.message(event.account_id, event.message_id);
      if (!message) return res.json({ ignored: 'non_text' });
      if (message.chatId !== event.chat_id || message.id !== event.message_id || message.accountId !== event.account_id) throw new IdentityError(502, 'message_identity_mismatch');
      return res.json(await catalog.ingest(message, permission));
    }
    const route = await store.transaction(async tx => {
      const r = await tx.get<BotRoute>('bot_routes', scopedKey(provider.botAccountId, event.chat_id));
      const b = r ? await identity.resolveAccountInTransaction(tx, r.accountId) : undefined;
      return r && b && b.userId === r.userId && b.version === r.bindingVersion ? r : undefined;
    });
    if (!route) return res.json({ ignored: 'unverified_sender' });
    const chat = await provider.chat(provider.botAccountId, event.chat_id);
    if (chat.id !== event.chat_id || chat.accountId !== provider.botAccountId) throw new IdentityError(502, 'chat_identity_mismatch');
    if (chat.type !== 0) return res.json({ ignored: 'bot_groups_disabled' });
    const message = await provider.message(provider.botAccountId, event.message_id);
    if (!message || message.direction !== 'incoming') return res.json({ ignored: 'not_incoming_text' });
    if (message.chatId !== event.chat_id || message.id !== event.message_id || message.accountId !== event.account_id) throw new IdentityError(502, 'message_identity_mismatch');
    if (!Number.isFinite(Date.parse(message.sentAt)) || Date.parse(message.sentAt) < Date.parse(route.verifiedAt)) return res.json({ ignored: 'historical_message' });
    const accepted = await store.transaction(async tx => {
      const current = await identity.resolveAccountInTransaction(tx, route.accountId);
      if (!current || current.userId !== route.userId || current.version !== route.bindingVersion) return false;
      const key = scopedKey(route.userId, provider.botAccountId, message.chatId, message.id);
      if (await tx.get('bot_message_ids', key)) return false;
      const reversedTime = String(8_640_000_000_000_000 - Date.parse(message.sentAt)).padStart(16, '0');
      await tx.put('bot_inbox', scopedKey(route.userId, reversedTime, message.id), { ...message, userId: route.userId, origin: 'webhook', agentStatus: 'not_connected' });
      await tx.put('bot_message_ids', key, { stored: true });
      return true;
    });
    return res.json({ accepted, agent: 'not_connected', autoReply: false });
  });

  router.use(async (req, res, next) => {
    const header = req.get('Authorization') ?? '';
    if (!header.startsWith('Bearer ')) throw new IdentityError(401, 'invalid_session');
    res.locals.principal = await identity.authenticate(header.slice(7));
    next();
  });
  router.get('/me', async (_req, res) => {
    const p = principal(res);
    let status = 'not_verified';
    try { status = (await identity.binding(p)).status; } catch (e) { if (!(e instanceof IdentityError) || e.code !== 'whatsapp_not_verified') throw e; }
    res.json({ userId: p.userId, expiresAt: p.expiresAt, whatsapp: status, agent: 'not_connected' });
  });
  router.post('/whatsapp/connections', async (req, res) => {
    emptyBody.parse(req.body ?? {});
    const p = principal(res);
    await limited(`connections:${p.userId}`, 5, 3_600_000);
    const connection = await identity.beginConnection(p);
    const callbackUrl = `${origin.origin}/api/v1/webhooks/connected/${connection.connectionId}/${connection.callbackToken}`;
    let url: string;
    try { url = await provider.link(connection.connectionId, callbackUrl, connection.expiresAt, connection.reconnectAccountId); }
    catch (error) { await identity.cancelConnection(p, connection.connectionId); throw error; }
    res.status(201).json({ connectionId: connection.connectionId, expiresAt: connection.expiresAt, url });
  });
  router.get('/whatsapp/connections/:id', async (req, res) => res.json(await identity.connection(principal(res), String(req.params.id))));
  router.post('/whatsapp/connections/:id/code', async (req, res) => {
    emptyBody.parse(req.body ?? {});
    const p = principal(res), id = String(req.params.id);
    await deliver(await identity.prepareCode(p, id));
    res.json(await identity.connection(p, id));
  });
  router.post('/whatsapp/connections/:id/verify', async (req, res) => {
    const { code } = z.object({ code: z.string().max(32) }).strict().parse(req.body);
    const p = principal(res), id = String(req.params.id);
    await identity.verifyCode(p, id, code);
    res.json(await activate(p, id));
  });
  router.post('/whatsapp/connections/:id/activate', async (req, res) => {
    emptyBody.parse(req.body ?? {});
    res.json(await activate(principal(res), String(req.params.id)));
  });
  router.delete('/whatsapp/connection', async (_req, res) => {
    await identity.disconnect(principal(res)); res.json({ status: 'disconnected' });
  });
  router.get('/whatsapp/chats', async (req, res) => res.json(await catalog.catalog(principal(res), cursor.parse(req.query.cursor))));
  router.get('/whatsapp/selections', async (_req, res) => res.json(await catalog.selections(principal(res))));
  router.put('/whatsapp/chats/:id/selection', async (req, res) => {
    const { selected } = z.object({ selected: z.boolean() }).strict().parse(req.body);
    res.json(await catalog.select(principal(res), String(req.params.id), selected));
  });
  router.post('/whatsapp/chats/:id/import', async (req, res) => {
    const body = z.object({ cursor }).strict().parse(req.body ?? {});
    res.json(await catalog.importHistory(principal(res), String(req.params.id), body.cursor));
  });
  router.get('/whatsapp/chats/:id/messages', async (req, res) => res.json(await catalog.messages(principal(res), String(req.params.id))));
  router.get('/whatsapp/catalog-snapshot', async (_req, res) => res.json(await catalog.snapshot(principal(res))));
  router.get('/whatsapp/bot/messages', async (_req, res) => {
    const p = principal(res);
    const items = await store.transaction(async tx => {
      await identity.bindingInTransaction(tx, p);
      return tx.list<NormalizedMessage>('bot_inbox', scopedKey(p.userId), 200);
    });
    items.sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
    res.json({ items, agent: 'not_connected' });
  });
  router.post('/whatsapp/recommendations', (_req, res) => res.status(503).json({ error: 'agent_not_connected', selectionAvailable: true }));
  router.post('/chat', (_req, res) => res.status(503).json({ error: 'agent_not_connected' }));
  router.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof IdentityError) return res.status(error.status).json({ error: error.code });
    if (error instanceof CatalogError) return res.status(error.status).json({ error: error.code });
    if (error instanceof WhatsAppError) return res.status(error.status).json({ error: 'whatsapp_unavailable' });
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'invalid_data' });
    // No raw request, callback capability, message text or provider error in logs.
    res.status(500).json({ error: 'operation_failed' });
  });
  return router;
}
