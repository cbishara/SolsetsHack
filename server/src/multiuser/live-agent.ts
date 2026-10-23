import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { IdentityError, IdentityService, type Binding, type Principal } from './identity.ts';
import { scopedKey, type MultiUserStore, type MultiUserTransaction } from './store.ts';
import type { NormalizedMessage, Selection, StoredContextMessage } from './catalog.ts';
import { clientAuth } from './request-auth.ts';

// Candidate #30. Real dispatch stays disabled until Quito's exact v1 contract accepts it.
// Storage never labels user/provider data synthetic, even while the dispatch gate is closed.
const id = z.string().min(1).max(512);
const uuid = z.uuid();
const transportBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');
// Leave room for the worker's envelope inside its 128KB transport ceiling.
const MAX_PAYLOAD_BYTES = 110_000;
const messageSchema = z.object({ id, role: z.enum(['user', 'assistant']), text: z.string().min(1).max(4000),
  inference: z.object({ engine: z.enum(['codex', 'command']), model: z.string().max(200).nullable().optional(), error: z.string().max(300).optional() }).strict().optional() }).strict();
const planSchema = z.object({ title: z.string().min(1).max(300), nextStep: z.string().min(1).max(2000), minutes: z.number().finite().min(1).optional() }).strict();
const memorySchema = z.object({ key: z.string().min(1).max(100), kind: z.enum(['rule', 'fact']), value: z.string().min(1).max(300),
  source: z.enum(['chat', 'onboarding', 'feedback']), evidence: z.string().min(1).max(2000).optional() }).strict();
const chatResultSchema = z.object({ kind: z.literal('chat'), reply: messageSchema, concern: z.string().max(300), plan: planSchema.nullable(),
  memoryUpdates: z.array(memorySchema).max(100), forgetKeys: z.array(z.string().min(1).max(100)).max(100), clearHistory: z.boolean(),
  contextVersion: id, selectionVersion: id, citations: z.array(z.object({ chatId: id, messageId: id }).strict()).max(100) }).strict();
const suggestionSchema = z.object({ chatId: id, relevance: z.enum(['relevant', 'uncertain', 'not_relevant']), reason: z.string().trim().min(1).max(500) }).strict();
const suggestResultSchema = z.object({ kind: z.literal('suggest_chats'), snapshotId: id, contextVersion: id, suggestions: z.array(suggestionSchema).max(50),
  engine: z.literal('codex'), model: z.string().max(200).nullable() }).strict();
const resultSchema = z.discriminatedUnion('kind', [chatResultSchema, suggestResultSchema]);
const failureSchema = z.enum(['invalid_job', 'non_synthetic_job', 'unverified_owner', 'untrusted_origin', 'deadline_expired', 'engine_unavailable', 'inference_interrupted']);
type Message = z.infer<typeof messageSchema>;
type Memory = z.infer<typeof memorySchema>;
type Plan = z.infer<typeof planSchema>;
export type LiveResult = z.infer<typeof resultSchema>;
type Evidence = { chatId: string; messageId: string; text: string; sentAt: string; selectionGeneration: string };
type Authorization = { userId: string; contextVersion: string; selectionVersion: string; selectedChats: { chatId: string; generation: string }[] };
type State = { conversationId: string; version: number; historyEpoch: number; messages: Message[]; concern: string; plan: Plan | null; memory: Memory[] };
type Permission = { userId: string; accountId: string; bindingVersion: number; selectionVersion: string; selectedChats: { chatId: string; generation: number }[] };
type Snapshot = { id: string; userId: string; accountId: string; bindingVersion: number; catalogVersion: number;
  items: { id: string; name: string; type: number | null }[]; complete: boolean; createdAt: string };
type ChatPayload = { conversationId: string; text: string; ownerVerified: true; messages: Message[]; concern: string; plan: Plan | null;
  context: { profile: { name: string; role: string }; memory: Memory[]; examples: []; evidence: Evidence[]; authorization: Authorization } };
type SuggestPayload = { snapshotId: string; contextVersion: string; needs: string[]; chats: { id: string; name: string; type: 'direct' | 'group' | 'unknown' }[] };
export type LiveAgentJob = { version: 'v1'; id: string; userId: string; requestId: string; leaseId: string; leaseExpiresAt: string; deadlineAt: string;
  contextVersion: string; synthetic: false; ownerVerified: true; authorization: { userId: string; contextVersion: string; bindingVersion: string } } &
  ({ kind: 'chat'; payload: ChatPayload } | { kind: 'suggest_chats'; payload: SuggestPayload });
type Status = 'queued' | 'claimed' | 'accepted' | 'failed' | 'uncertain';
type Destination = { botAccountId: string; chatId: string; recipientId: string };
type StoredJob = { id: string; userId: string; requestId: string; kind: 'chat' | 'suggest_chats'; createdAt: string; deadlineAt: string;
  status: Status; permission: Permission; contextVersion: string; historyEpoch: number; payload: ChatPayload | SuggestPayload;
  principal?: Principal; destination?: Destination; recommendationId?: string; lease?: LiveAgentJob; receiptHash?: string; failureCode?: string };
type BotRoute = { userId: string; accountId: string; recipientId: string; bindingVersion: number; chatId: string; verifiedAt: string };
type RecommendationRun = { requestId: string; inputHash: string; snapshotId: string; jobs: string[]; suggestions: z.infer<typeof suggestionSchema>[] };
type Outbox = { id: string; userId: string; permission: Permission; historyEpoch: number; deadlineAt: string; destination: Destination; text: string;
  status: 'pending' | 'sending' | 'sent' | 'uncertain' | 'cancelled'; startedAt?: number; messageId?: string };
type PendingBotMessage = { inboxKey: string; botAccountId: string; userId: string; messageId: string; chatId: string; bindingVersion: number; receivedAt: string };
type SendReply = (input: { botAccountId: string; chatId: string; text: string; authorize: () => Promise<boolean> }) => Promise<{ messageId: string }>;
const iso = (n: number) => new Date(n).toISOString();
function canonical(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const command = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const initial = (): State => ({ conversationId: randomUUID(), version: 0, historyEpoch: 0, messages: [], concern: '', plan: null, memory: [] });

export class LiveAgentQueue {
  private clock: () => number;
  constructor(private store: MultiUserStore, private identity: IdentityService, private options: { realDataEnabled?: boolean; clock?: () => number } = {}) {
    this.clock = options.clock ?? Date.now;
  }
  private enabled() { if (!this.options.realDataEnabled) throw new IdentityError(503, 'agent_v1_not_enabled'); }
  private async stateIn(tx: MultiUserTransaction, userId: string) {
    const key = scopedKey(userId);
    let state = await tx.get<State>('agent_live_state', key);
    if (!state) { state = initial(); await tx.put('agent_live_state', key, state); }
    return state;
  }
  private async permission(tx: MultiUserTransaction, binding: Binding): Promise<Permission> {
    const all = await tx.list<Selection>('catalog_selections', scopedKey(binding.userId, binding.accountId), 1000);
    if (all.length === 1000) throw new IdentityError(413, 'too_many_chat_selections');
    return { userId: binding.userId, accountId: binding.accountId, bindingVersion: binding.version,
      selectionVersion: digest(all), selectedChats: all.filter(s => s.selected).map(s => ({ chatId: s.chatId, generation: s.generation })) };
  }
  private async currentPermission(tx: MultiUserTransaction, expected: Permission, principal?: Principal) {
    if (principal) await this.identity.assertPrincipalInTransaction(tx, principal);
    const binding = await this.identity.resolveAccountInTransaction(tx, expected.accountId);
    if (!binding || binding.userId !== expected.userId || binding.version !== expected.bindingVersion) return false;
    return (await this.permission(tx, binding)).selectionVersion === expected.selectionVersion;
  }
  private async evidence(tx: MultiUserTransaction, permission: Permission, ownerText: string) {
    if (['borrar', 'nuevo'].includes(command(ownerText))) return [];
    const evidence: Evidence[] = [];
    // Bound context, not authorization: every selected chat remains individually revocable.
    for (const selection of permission.selectedChats) {
      const messages = await tx.list<StoredContextMessage>('catalog_messages', scopedKey(permission.userId, permission.accountId, selection.chatId), 10);
      for (const message of messages) {
        if (message.accountId !== permission.accountId || message.chatId !== selection.chatId) throw new Error('Invalid context index.');
        evidence.push({ chatId: selection.chatId, messageId: message.id, text: message.text.slice(0, 2000), sentAt: message.sentAt, selectionGeneration: String(selection.generation) });
      }
    }
    return evidence.sort((a, b) => b.sentAt.localeCompare(a.sentAt)).slice(0, 20);
  }
  private async expire(tx: MultiUserTransaction, job: StoredJob) {
    const until = job.lease ? Math.min(Date.parse(job.deadlineAt), Date.parse(job.lease.leaseExpiresAt)) : Date.parse(job.deadlineAt);
    if ((job.status === 'queued' || job.status === 'claimed') && this.clock() >= until) {
      job.status = job.status === 'claimed' ? 'uncertain' : 'failed'; job.failureCode = 'deadline_expired';
      await tx.put('agent_live_jobs', job.id, job);
    }
  }
  private async saveJob(tx: MultiUserTransaction, job: StoredJob) {
    await tx.put('agent_live_jobs', job.id, job);
    await tx.put('agent_live_pending', scopedKey(job.createdAt, job.id), { jobId: job.id });
    await tx.put('agent_live_user_jobs', scopedKey(job.userId, String(8_640_000_000_000_000 - Date.parse(job.createdAt)).padStart(16, '0'), job.id), { jobId: job.id });
  }
  private summary(job: StoredJob, exposeText = true) { return { jobId: job.id, requestId: job.requestId, kind: job.kind, status: job.status,
    ...(job.kind === 'chat' ? { ...(exposeText && job.status !== 'accepted' ? { text: (job.payload as ChatPayload).text } : {}), channel: job.destination ? 'whatsapp' : 'app' } : {}),
    ...(job.failureCode ? { error: job.failureCode } : {}) }; }
  private async enqueueChatIn(tx: MultiUserTransaction, binding: Binding, input: { requestId: string; text: string }, principal?: Principal, destination?: Destination, deadlineAt?: string) {
    const key = scopedKey(binding.userId, input.requestId);
    if (await tx.get('agent_live_recommendations', key)) throw new IdentityError(409, 'request_id_reused');
    const previous = await tx.get<{ jobId: string }>('agent_live_requests', key);
    if (previous) {
      const old = (await tx.get<StoredJob>('agent_live_jobs', previous.jobId))!;
      if (old.kind !== 'chat' || (old.payload as ChatPayload).text !== input.text || digest(old.destination) !== digest(destination)) throw new IdentityError(409, 'request_id_reused');
      await this.expire(tx, old); return this.summary(old);
    }
    const active = await tx.get<{ jobId: string }>('agent_live_active_chat', scopedKey(binding.userId));
    if (active) {
      const old = await tx.get<StoredJob>('agent_live_jobs', active.jobId);
      if (old) { await this.expire(tx, old); if (old.status === 'queued' || old.status === 'claimed') throw new IdentityError(409, 'conversation_busy'); }
    }
    const state = await this.stateIn(tx, binding.userId), permission = await this.permission(tx, binding);
    const contextVersion = String(state.version);
    const payload: ChatPayload = { conversationId: state.conversationId, text: input.text, ownerVerified: true,
      messages: state.messages.slice(-12), concern: state.concern, plan: state.plan,
      context: { profile: { name: 'Usuario', role: 'No indicado' }, memory: state.memory, examples: [], evidence: await this.evidence(tx, permission, input.text),
        authorization: { userId: binding.userId, contextVersion, selectionVersion: permission.selectionVersion,
          selectedChats: permission.selectedChats.map(s => ({ chatId: s.chatId, generation: String(s.generation) })) } } };
    // Keep the transport below the worker's 128KB limit; never silently truncate owner text.
    while (transportBytes(payload) > MAX_PAYLOAD_BYTES && payload.context.evidence.length) payload.context.evidence.pop();
    while (transportBytes(payload) > MAX_PAYLOAD_BYTES && payload.messages.length) payload.messages = payload.messages.slice(1);
    while (transportBytes(payload) > MAX_PAYLOAD_BYTES && payload.context.memory.length) payload.context.memory = payload.context.memory.slice(1);
    if (transportBytes(payload) > MAX_PAYLOAD_BYTES) throw new IdentityError(413, 'agent_context_too_large');
    const job: StoredJob = { id: randomUUID(), userId: binding.userId, requestId: input.requestId, kind: 'chat',
      createdAt: iso(this.clock()), deadlineAt: deadlineAt ?? iso(this.clock() + 180_000), status: 'queued', permission, contextVersion, historyEpoch: state.historyEpoch ?? 0, payload, principal, destination };
    await this.saveJob(tx, job);
    await tx.put('agent_live_requests', key, { jobId: job.id });
    await tx.put('agent_live_active_chat', scopedKey(binding.userId), { jobId: job.id });
    return this.summary(job);
  }
  async enqueueChat(principal: Principal, input: { requestId: string; text: string }) {
    this.enabled();
    const parsed = z.object({ requestId: uuid, text: z.string().trim().min(1).max(2000) }).strict().parse(input);
    return this.store.transaction(async tx => this.enqueueChatIn(tx, await this.identity.bindingInTransaction(tx, principal), parsed, principal));
  }
  /** Invoke only after canonical webhook message validation; the durable inbox is rechecked here. */
  async enqueueBotMessage(botAccountId: string, message: NormalizedMessage, expected?: Pick<PendingBotMessage, 'bindingVersion' | 'receivedAt'>) {
    this.enabled();
    return this.store.transaction(async tx => {
      const route = await tx.get<BotRoute>('bot_routes', scopedKey(botAccountId, message.chatId));
      const binding = route ? await this.identity.resolveAccountInTransaction(tx, route.accountId) : undefined;
      if (!route || !binding || route.userId !== binding.userId || route.bindingVersion !== binding.version || route.recipientId !== binding.recipientId ||
          message.accountId !== botAccountId || message.direction !== 'incoming' || !Number.isFinite(Date.parse(message.sentAt)) || Date.parse(message.sentAt) < Date.parse(route.verifiedAt)) throw new IdentityError(403, 'unverified_sender');
      const reversedTime = String(8_640_000_000_000_000 - Date.parse(message.sentAt)).padStart(16, '0');
      const saved = await tx.get<NormalizedMessage>('bot_inbox', scopedKey(binding.userId, reversedTime, message.id));
      if (!saved || saved.id !== message.id || saved.chatId !== message.chatId || saved.text !== message.text || saved.accountId !== botAccountId || saved.direction !== 'incoming') throw new IdentityError(409, 'bot_message_not_persisted');
      const requestKey = scopedKey(botAccountId, message.chatId, message.id);
      let request = await tx.get<{ requestId: string }>('agent_live_bot_requests', requestKey);
      if (request) {
        const existing = await tx.get<{ jobId: string }>('agent_live_requests', scopedKey(binding.userId, request.requestId));
        if (existing) { const job = (await tx.get<StoredJob>('agent_live_jobs', existing.jobId))!; await this.expire(tx, job); return this.summary(job); }
      }
      if (expected && (expected.bindingVersion !== binding.version || !Number.isFinite(Date.parse(expected.receivedAt)) || Date.parse(expected.receivedAt) + 180_000 <= this.clock())) throw new IdentityError(409, 'bot_message_expired');
      if (!request) { request = { requestId: randomUUID() }; await tx.put('agent_live_bot_requests', requestKey, request); }
      return this.enqueueChatIn(tx, binding, { requestId: request.requestId, text: z.string().trim().min(1).max(2000).parse(message.text) }, undefined,
        { botAccountId, chatId: message.chatId, recipientId: binding.recipientId }, expected ? iso(Math.min(this.clock() + 180_000, Date.parse(expected.receivedAt) + 180_000)) : undefined);
    });
  }
  /** Root webhook atomically writes bot_pending with inbox, only while real v1 is enabled. */
  async drainBotInbox(botAccountId: string) {
    this.enabled();
    const rows = await this.store.transaction(tx => tx.list<PendingBotMessage>('bot_pending', scopedKey(botAccountId), 100));
    let queued = 0, cancelled = 0, deferred = 0;
    for (const pending of rows) {
      const saved = await this.store.transaction(tx => tx.get<NormalizedMessage & { userId: string }>('bot_inbox', pending.inboxKey));
      // The index points to immutable, canonical messages; never accept a new payload from a client.
      if (!saved || saved.userId !== pending.userId || saved.id !== pending.messageId || saved.chatId !== pending.chatId || saved.accountId !== botAccountId || pending.botAccountId !== botAccountId) {
        deferred++; continue;
      }
      const indexKey = scopedKey(botAccountId, saved.sentAt, saved.id);
      let status: string, jobId: string | undefined;
      try {
        const operation = await this.enqueueBotMessage(botAccountId, saved, pending);
        status = operation.status; jobId = operation.jobId; queued++;
      } catch (error) {
        if (error instanceof IdentityError && error.code === 'conversation_busy') { deferred++; continue; }
        if (error instanceof IdentityError && ['unverified_sender', 'bot_message_expired', 'bot_message_not_persisted'].includes(error.code)) {
          status = 'cancelled'; cancelled++;
        } else if (error instanceof z.ZodError) { status = 'failed'; cancelled++; }
        else throw error;
      }
      await this.store.transaction(async tx => {
        const current = await tx.get<NormalizedMessage & { userId: string }>('bot_inbox', pending.inboxKey);
        if (current) await tx.put('bot_inbox', pending.inboxKey, { ...current, agentStatus: status, ...(jobId ? { jobId } : {}) });
        await tx.remove('bot_pending', indexKey);
      });
    }
    return { queued, cancelled, deferred };
  }
  private async snapshotIn(tx: MultiUserTransaction, permission: Permission, snapshotId: string) {
    const snapshot = await tx.get<Snapshot>('catalog_snapshots', scopedKey(permission.userId, snapshotId));
    const scan = await tx.get<{ version: number; bindingVersion: number; complete: boolean }>('catalog_scans', scopedKey(permission.userId, permission.accountId));
    if (!snapshot || snapshot.userId !== permission.userId || snapshot.accountId !== permission.accountId || snapshot.bindingVersion !== permission.bindingVersion) throw new IdentityError(404, 'snapshot_not_found');
    if (!snapshot.complete || !scan?.complete) throw new IdentityError(409, 'catalog_incomplete');
    if (snapshot.catalogVersion !== scan.version || scan.bindingVersion !== permission.bindingVersion) throw new IdentityError(409, 'catalog_changed');
    if (Date.parse(snapshot.createdAt) + 600_000 <= this.clock()) throw new IdentityError(409, 'snapshot_expired');
    if (snapshot.items.length > 1000 || new Set(snapshot.items.map(c => c.id)).size !== snapshot.items.length) throw new IdentityError(413, 'catalog_too_large');
    return snapshot;
  }
  async enqueueRecommendations(principal: Principal, input: { requestId: string; snapshotId: string; needs: string[] }) {
    this.enabled();
    const body = z.object({ requestId: uuid, snapshotId: id, needs: z.array(z.string().trim().min(1).max(500)).min(1).max(12) }).strict().parse(input);
    return this.store.transaction(async tx => {
      const binding = await this.identity.bindingInTransaction(tx, principal), permission = await this.permission(tx, binding);
      const key = scopedKey(binding.userId, body.requestId), inputHash = digest(body);
      const prior = await tx.get<RecommendationRun>('agent_live_recommendations', key);
      if (prior) { if (prior.inputHash !== inputHash) throw new IdentityError(409, 'request_id_reused'); return { requestId: body.requestId, snapshotId: prior.snapshotId, jobIds: prior.jobs }; }
      if (await tx.get('agent_live_requests', key)) throw new IdentityError(409, 'request_id_reused');
      const snapshot = await this.snapshotIn(tx, permission, body.snapshotId), state = await this.stateIn(tx, binding.userId);
      const run: RecommendationRun = { requestId: body.requestId, inputHash, snapshotId: snapshot.id, jobs: [], suggestions: [] };
      for (let offset = 0; offset < snapshot.items.length; offset += 50) {
        const payload: SuggestPayload = { snapshotId: snapshot.id, contextVersion: String(state.version), needs: body.needs,
          chats: snapshot.items.slice(offset, offset + 50).map(c => ({ id: c.id, name: c.name, type: c.type === 0 ? 'direct' : c.type === 1 ? 'group' : 'unknown' })) };
        if (transportBytes(payload) > MAX_PAYLOAD_BYTES) throw new IdentityError(413, 'agent_context_too_large');
        const job: StoredJob = { id: randomUUID(), userId: binding.userId, requestId: randomUUID(), kind: 'suggest_chats',
          createdAt: iso(this.clock() + offset / 50), deadlineAt: iso(Date.parse(snapshot.createdAt) + 600_000), status: 'queued', permission, contextVersion: String(state.version), historyEpoch: state.historyEpoch ?? 0, payload, principal, recommendationId: body.requestId };
        await this.saveJob(tx, job); run.jobs.push(job.id);
      }
      await tx.put('agent_live_recommendations', key, run);
      await tx.put('agent_live_latest_recommendation', scopedKey(binding.userId), { requestId: body.requestId });
      return { requestId: body.requestId, snapshotId: snapshot.id, jobIds: run.jobs };
    });
  }
  private async valid(tx: MultiUserTransaction, job: StoredJob) {
    try {
      if (!await this.currentPermission(tx, job.permission, job.principal)) return false;
      if (String((await this.stateIn(tx, job.userId)).version) !== job.contextVersion) return false;
      if (job.kind === 'suggest_chats') await this.snapshotIn(tx, job.permission, (job.payload as SuggestPayload).snapshotId);
      return true;
    } catch (error) { if (error instanceof IdentityError) return false; throw error; }
  }
  async claim(input: { workerId: string; requestId: string }): Promise<LiveAgentJob | null> {
    this.enabled();
    const body = z.object({ workerId: z.string().trim().min(1).max(100), requestId: uuid }).strict().parse(input);
    return this.store.transaction(async tx => {
      await tx.put('agent_live_worker', 'heartbeat', { at: this.clock() });
      const old = await tx.get<{ workerId: string; jobId: string | null }>('agent_live_claims', body.requestId);
      if (old) {
        if (old.workerId !== body.workerId) throw new IdentityError(409, 'claim_id_reused');
        if (!old.jobId) return null;
        const job = (await tx.get<StoredJob>('agent_live_jobs', old.jobId))!;
        await this.expire(tx, job);
        if (job.status !== 'claimed') return null;
        if (!await this.valid(tx, job)) { job.status = 'failed'; job.failureCode = 'context_changed'; await tx.put('agent_live_jobs', job.id, job); return null; }
        return job.lease!;
      }
      while (true) {
        const page = await tx.list<{ jobId: string }>('agent_live_pending', '', 100);
        if (!page.length) break;
        for (const item of page) {
          const job = (await tx.get<StoredJob>('agent_live_jobs', item.jobId))!;
          await tx.remove('agent_live_pending', scopedKey(job.createdAt, job.id));
          await this.expire(tx, job);
          if (job.status !== 'queued') continue;
          if (!await this.valid(tx, job)) { job.status = 'failed'; job.failureCode = 'context_changed'; await tx.put('agent_live_jobs', job.id, job); continue; }
          const lease = { version: 'v1', synthetic: false, id: job.id, userId: job.userId, requestId: job.requestId,
            leaseId: randomUUID(), leaseExpiresAt: iso(Math.min(this.clock() + 90_000, Date.parse(job.deadlineAt))), deadlineAt: job.deadlineAt,
            contextVersion: job.contextVersion, ownerVerified: true,
            authorization: { userId: job.userId, contextVersion: job.contextVersion, bindingVersion: String(job.permission.bindingVersion) }, kind: job.kind, payload: job.payload } as LiveAgentJob;
          job.status = 'claimed'; job.lease = lease;
          await tx.put('agent_live_jobs', job.id, job); await tx.put('agent_live_claims', body.requestId, { workerId: body.workerId, jobId: job.id });
          return lease;
        }
      }
      await tx.put('agent_live_claims', body.requestId, { workerId: body.workerId, jobId: null }); return null;
    });
  }
  async readiness() {
    return this.store.transaction(async tx => {
      const heartbeat = await tx.get<{ at: number }>('agent_live_worker', 'heartbeat');
      return { enabled: this.options.realDataEnabled === true, connected: this.options.realDataEnabled === true && !!heartbeat && this.clock() - heartbeat.at < 15_000, syntheticOnly: false };
    });
  }
  async accept(jobId: string, input: { leaseId: string; result: unknown }) {
    this.enabled();
    const { leaseId, result } = z.object({ leaseId: id, result: resultSchema }).strict().parse(input), receiptHash = digest(input);
    const error = await this.store.transaction(async tx => {
      const job = await tx.get<StoredJob>('agent_live_jobs', jobId);
      if (!job) throw new IdentityError(404, 'job_not_found');
      if (job.lease?.leaseId !== leaseId) throw new IdentityError(409, 'stale_lease');
      if (job.status === 'accepted') { if (job.receiptHash !== receiptHash) throw new IdentityError(409, 'result_already_applied'); return null; }
      await this.expire(tx, job);
      if (job.status !== 'claimed') return new IdentityError(409, 'stale_lease');
      if (result.kind !== job.kind || result.contextVersion !== job.contextVersion) throw new IdentityError(400, 'invalid_agent_result');
      if (!await this.valid(tx, job)) { job.status = 'failed'; job.failureCode = 'context_changed'; await tx.put('agent_live_jobs', job.id, job); return new IdentityError(409, 'context_changed'); }
      if (result.kind === 'suggest_chats') {
        const payload = job.payload as SuggestPayload, expected = new Set(payload.chats.map(c => c.id));
        if (result.snapshotId !== payload.snapshotId || result.suggestions.length !== expected.size || new Set(result.suggestions.map(s => s.chatId)).size !== expected.size || result.suggestions.some(s => !expected.has(s.chatId))) throw new IdentityError(400, 'invalid_recommendations');
        const key = scopedKey(job.userId, job.recommendationId!);
        const run = (await tx.get<RecommendationRun>('agent_live_recommendations', key))!;
        run.suggestions.push(...result.suggestions); await tx.put('agent_live_recommendations', key, run);
        // Deliberately never write catalog_selections from model output.
      } else {
        const payload = job.payload as ChatPayload;
        if (result.selectionVersion !== job.permission.selectionVersion || result.reply.role !== 'assistant' || result.reply.id !== `${job.requestId}:reply` || !result.reply.inference || result.reply.inference.error ||
            result.clearHistory !== (command(payload.text) === 'borrar')) throw new IdentityError(400, 'invalid_chat_result');
        const updateKeys = new Set<string>();
        for (const update of result.memoryUpdates) {
          if (updateKeys.has(update.key) || update.source !== 'chat' || !update.evidence?.trim() || !payload.text.includes(update.evidence)) throw new IdentityError(400, 'invalid_memory_evidence');
          updateKeys.add(update.key);
        }
        if (result.forgetKeys.length && !/\b(olvida|olvidate|borra|borrar|elimina|forget|delete|remove)\b/.test(command(payload.text))) throw new IdentityError(400, 'unrequested_memory_deletion');
        const evidenceIds = new Set(payload.context.evidence.map(e => scopedKey(e.chatId, e.messageId)));
        if (result.citations.some(c => !evidenceIds.has(scopedKey(c.chatId, c.messageId)))) throw new IdentityError(400, 'invalid_evidence_citation');
        const state = await this.stateIn(tx, job.userId), memory = new Map(state.memory.map(m => [m.key, m]));
        for (const key of result.forgetKeys) if (memory.get(key)?.source === 'chat') memory.delete(key);
        if (result.clearHistory) for (const [key, item] of memory) if (item.source === 'chat') memory.delete(key);
        for (const update of result.memoryUpdates) memory.set(update.key, update);
        if (memory.size > 100) throw new IdentityError(400, 'memory_limit_exceeded');
        const messages = result.clearHistory ? [result.reply] : [...state.messages, { id: job.requestId, role: 'user' as const, text: payload.text }, result.reply].slice(-60);
        const historyEpoch = (state.historyEpoch ?? 0) + (result.clearHistory ? 1 : 0);
        await tx.put<State>('agent_live_state', scopedKey(job.userId), { ...state, version: state.version + 1, historyEpoch, memory: [...memory.values()], messages, concern: result.concern, plan: result.plan });
        if (job.destination) {
          await tx.put<Outbox>('agent_live_outbox', job.id, { id: job.id, userId: job.userId, permission: job.permission, historyEpoch, deadlineAt: job.deadlineAt,
            destination: job.destination, text: result.reply.text, status: 'pending' });
          await tx.put('agent_live_outbox_pending', scopedKey(job.createdAt, job.id), { id: job.id, key: scopedKey(job.createdAt, job.id) });
        }
      }
      job.status = 'accepted'; job.receiptHash = receiptHash; await tx.put('agent_live_jobs', job.id, job); return null;
    });
    if (error) throw error;
    return { status: 'accepted' as const };
  }
  async fail(jobId: string, input: { leaseId: string; code: z.infer<typeof failureSchema> }) {
    this.enabled();
    const body = z.object({ leaseId: id, code: failureSchema }).strict().parse(input), receiptHash = digest(body);
    const error = await this.store.transaction(async tx => {
      const job = await tx.get<StoredJob>('agent_live_jobs', jobId);
      if (!job) throw new IdentityError(404, 'job_not_found');
      if (job.lease?.leaseId !== body.leaseId) throw new IdentityError(409, 'stale_lease');
      if (job.receiptHash === receiptHash && ['failed', 'uncertain'].includes(job.status)) return null;
      await this.expire(tx, job);
      if (job.status !== 'claimed') return new IdentityError(409, 'stale_lease');
      job.status = body.code === 'inference_interrupted' ? 'uncertain' : 'failed'; job.failureCode = body.code; job.receiptHash = receiptHash;
      await tx.put('agent_live_jobs', job.id, job); return null;
    });
    if (error) throw error;
    return { status: 'failed' as const };
  }
  async state(principal: Principal) {
    return this.store.transaction(async tx => {
      await this.identity.bindingInTransaction(tx, principal);
      const state = await this.stateIn(tx, principal.userId);
      const indexes = await tx.list<{ jobId: string }>('agent_live_user_jobs', scopedKey(principal.userId), 200), operations = [];
      for (const entry of indexes) {
        const job = (await tx.get<StoredJob>('agent_live_jobs', entry.jobId))!;
        if (job.userId !== principal.userId) throw new Error('Invalid user job index.');
        await this.expire(tx, job); const delivery = await tx.get<Outbox>('agent_live_outbox', job.id);
        if (delivery?.status === 'sending' && (delivery.startedAt ?? 0) + 60_000 < this.clock()) {
          delivery.status = 'uncertain'; await tx.put('agent_live_outbox', delivery.id, delivery);
        }
        operations.push({ ...this.summary(job, (job.historyEpoch ?? 0) === (state.historyEpoch ?? 0)), ...(delivery ? { delivery: delivery.status } : {}) });
      }
      return { ...state, operations, synthetic: false as const };
    });
  }
  async recommendations(principal: Principal) {
    return this.store.transaction(async tx => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      const latest = await tx.get<{ requestId: string }>('agent_live_latest_recommendation', scopedKey(binding.userId));
      const run = latest ? await tx.get<RecommendationRun>('agent_live_recommendations', scopedKey(binding.userId, latest.requestId)) : undefined;
      if (!run) return { items: [], operations: [] };
      const permission = await this.permission(tx, binding);
      await this.snapshotIn(tx, permission, run.snapshotId);
      const operations = [];
      for (const jobId of run.jobs) { const job = (await tx.get<StoredJob>('agent_live_jobs', jobId))!; await this.expire(tx, job); operations.push(this.summary(job)); }
      return { requestId: run.requestId, snapshotId: run.snapshotId, items: run.suggestions, operations };
    });
  }
  private async destinationValid(tx: MultiUserTransaction, row: Outbox) {
    if (!Number.isFinite(Date.parse(row.deadlineAt)) || Date.parse(row.deadlineAt) <= this.clock()) return false;
    if (!await this.currentPermission(tx, row.permission)) return false;
    if ((await this.stateIn(tx, row.userId)).historyEpoch !== row.historyEpoch) return false;
    const route = await tx.get<BotRoute>('bot_routes', scopedKey(row.destination.botAccountId, row.destination.chatId));
    return !!route && route.userId === row.userId && route.accountId === row.permission.accountId && route.bindingVersion === row.permission.bindingVersion && route.recipientId === row.destination.recipientId;
  }
  /** Sender validates canonical DM, then calls authorize immediately before POST, after any preflight I/O. */
  async dispatchNext(send: SendReply) {
    this.enabled();
    const row = await this.store.transaction(async tx => {
      const indexes = await tx.list<{ id: string; key: string }>('agent_live_outbox_pending', '', 1000);
      for (const index of indexes) {
        const item = (await tx.get<Outbox>('agent_live_outbox', index.id))!;
        await tx.remove('agent_live_outbox_pending', index.key);
        if (item.status !== 'pending') continue;
        if (!await this.destinationValid(tx, item)) { await tx.put('agent_live_outbox', item.id, { ...item, status: 'cancelled' }); continue; }
        const sending: Outbox = { ...item, status: 'sending', startedAt: this.clock() };
        await tx.put('agent_live_outbox', item.id, sending); return sending;
      }
      return null;
    });
    if (!row) return { status: 'idle' as const };
    const current = await this.store.transaction(tx => this.destinationValid(tx, row));
    if (!current) { await this.store.transaction(tx => tx.put('agent_live_outbox', row.id, { ...row, status: 'cancelled' })); return { status: 'cancelled' as const }; }
    let revokedBeforeSend = false;
    try {
      const sent = await send({ botAccountId: row.destination.botAccountId, chatId: row.destination.chatId, text: row.text,
        authorize: async () => {
          const allowed = await this.store.transaction(tx => this.destinationValid(tx, row));
          if (!allowed) revokedBeforeSend = true;
          return allowed;
        } });
      id.parse(sent.messageId);
      await this.store.transaction(tx => tx.put('agent_live_outbox', row.id, { ...row, status: 'sent', messageId: sent.messageId }));
      return { status: 'sent' as const };
    } catch {
      const status = revokedBeforeSend ? 'cancelled' as const : 'uncertain' as const;
      await this.store.transaction(tx => tx.put('agent_live_outbox', row.id, { ...row, status })).catch(() => {});
      return { status };
    }
  }
}

function errors(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof IdentityError) return res.status(error.status).json({ error: error.code });
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'invalid_data' });
  return res.status(500).json({ error: 'agent_operation_failed' });
}
export function liveWorkerRouter(queue: LiveAgentQueue, options: { workerToken: string }) {
  if (options.workerToken.length < 32 || /\s/.test(options.workerToken)) throw new Error('Dedicated worker token required.');
  const router = Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const actual = Buffer.from(req.get('Authorization') ?? ''), expected = Buffer.from(`Bearer ${options.workerToken}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new IdentityError(401, 'invalid_worker_token');
    next();
  });
  router.post('/claim', async (req, res) => { const job = await queue.claim(req.body); return job ? res.json({ job }) : res.sendStatus(204); });
  router.post('/jobs/:id/result', async (req, res) => res.json(await queue.accept(String(req.params.id), req.body)));
  router.post('/jobs/:id/failure', async (req, res) => res.json(await queue.fail(String(req.params.id), req.body)));
  router.use(errors); return router;
}
/** Mount before multiUserRouter's fallback at /api/v1. Leaves unrelated paths to next router. */
export function liveClientRouter(queue: LiveAgentQueue, identity: IdentityService, publicUrl: string) {
  const router = Router(), auth = clientAuth(identity, publicUrl);
  router.use(['/chat', '/whatsapp/recommendations'], async (req, res, next) => {
    res.set('Cache-Control', 'no-store'); res.locals.principal = await auth.authenticate(req); next();
  });
  router.post('/chat', async (req, res) => {
    if (!(await queue.readiness()).connected) throw new IdentityError(503, 'agent_not_connected');
    res.status(202).json(await queue.enqueueChat(res.locals.principal, req.body));
  });
  router.get('/chat', async (_req, res) => res.json({ ...await queue.state(res.locals.principal), agent: await queue.readiness() }));
  router.post('/whatsapp/recommendations', async (req, res) => {
    if (!(await queue.readiness()).connected) throw new IdentityError(503, 'agent_not_connected');
    res.status(202).json(await queue.enqueueRecommendations(res.locals.principal, req.body));
  });
  router.get('/whatsapp/recommendations', async (_req, res) => res.json(await queue.recommendations(res.locals.principal)));
  router.use(errors); return router;
}
