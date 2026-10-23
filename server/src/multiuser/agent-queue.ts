import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { IdentityError, IdentityService, type Principal } from './identity.ts';
import { scopedKey, type MultiUserStore, type MultiUserTransaction } from './store.ts';
import { clientAuth } from './request-auth.ts';

// Transport DTOs match Quito PR #31, commit 8f939ee, agent/src/integration/contract.ts.
// This queue admits synthetic CHAT fixtures only, in separate storage from real WhatsApp.
const id = z.string().trim().min(1).max(200);
const uuid = z.uuid();
const key = z.string().min(1).max(100);
const inferenceSchema = z.object({
  engine: z.enum(['codex', 'command']), model: z.string().max(200).nullable().optional(), error: z.string().max(300).optional(),
}).strict();
const messageSchema = z.object({ id, role: z.enum(['user', 'assistant']), text: z.string().min(1).max(4000), inference: inferenceSchema.optional() }).strict();
const planSchema = z.object({ title: z.string().min(1).max(300), nextStep: z.string().min(1).max(2000), minutes: z.number().finite().min(1).optional() }).strict();
const memorySchema = z.object({ key, kind: z.enum(['rule', 'fact']), value: z.string().min(1).max(300),
  source: z.enum(['chat', 'onboarding', 'feedback']), evidence: z.string().min(1).max(2000).optional() }).strict();
const resultSchema = z.object({
  kind: z.literal('chat'), reply: messageSchema, concern: z.string().max(300), plan: planSchema.nullable(),
  memoryUpdates: z.array(memorySchema).max(100), forgetKeys: z.array(key).max(100), clearHistory: z.boolean(),
}).strict();
const failureSchema = z.enum(['invalid_job', 'non_synthetic_job', 'unverified_owner', 'untrusted_origin', 'deadline_expired', 'engine_unavailable', 'inference_interrupted']);
type FailureCode = z.infer<typeof failureSchema>;
type ChatMessage = z.infer<typeof messageSchema>;
type ChatPlan = z.infer<typeof planSchema>;
type ContextMemory = z.infer<typeof memorySchema>;
export type ChatResult = z.infer<typeof resultSchema>;
export type AgentChatJob = {
  version: 'v0'; kind: 'chat'; id: string; userId: string; requestId: string; leaseId: string;
  leaseExpiresAt: string; deadlineAt: string; contextVersion: string; synthetic: true;
  payload: { conversationId: string; text: string; ownerVerified: true; messages: ChatMessage[];
    concern: string; plan: ChatPlan | null; context: { profile: { name: string; role: string }; memory: ContextMemory[]; examples: [] } };
};
type State = { conversationId: string; version: number; messages: ChatMessage[]; concern: string; plan: ChatPlan | null; memory: ContextMemory[] };
type JobStatus = 'queued' | 'claimed' | 'accepted' | 'failed' | 'uncertain';
type StoredJob = {
  id: string; userId: string; requestId: string; text: string; createdAt: string; deadlineAt: string;
  status: JobStatus; snapshot: State; lease?: AgentChatJob; workerId?: string; receiptHash?: string; failureCode?: string;
};
type Claim = { workerId: string; jobId: string | null };
const iso = (time: number) => new Date(time).toISOString();
const command = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const initialState = (): State => ({ conversationId: randomUUID(), version: 0, messages: [], concern: '', plan: null, memory: [] });

export class SyntheticAgentQueue {
  private readonly clock: () => number;
  private readonly leaseMs: number;
  constructor(private readonly store: MultiUserStore, private readonly identity: IdentityService, options: { clock?: () => number; leaseMs?: number } = {}) {
    this.clock = options.clock ?? Date.now;
    this.leaseMs = options.leaseMs ?? 90_000;
    if (!Number.isFinite(this.leaseMs) || this.leaseMs < 1000 || this.leaseMs > 180_000) throw new Error('Invalid agent lease duration.');
  }

  /** Internal-only trusted synthetic data entry. Public callers use fixed fixture scenarios. */
  async enqueueSyntheticChat(principal: Principal, input: { requestId: string; text: string }) {
    const { requestId, text } = z.object({ requestId: uuid, text: z.string().trim().min(1).max(2000) }).strict().parse(input);
    return this.store.transaction(async tx => {
      await this.identity.assertPrincipalInTransaction(tx, principal);
      const requestKey = scopedKey(principal.userId, requestId);
      const previous = await tx.get<{ jobId: string }>('agent_demo_requests', requestKey);
      if (previous) {
        const job = (await tx.get<StoredJob>('agent_demo_jobs', previous.jobId))!;
        if (job.text !== text) throw new IdentityError(409, 'request_id_reused');
        await this.expire(tx, job);
        return { jobId: job.id, status: job.status };
      }
      const stateKey = scopedKey(principal.userId);
      // Synthetic demo is intentionally bounded; this is not an unlimited public inference API.
      const previousJobs = await tx.list('agent_demo_user_jobs', scopedKey(principal.userId), 100);
      if (previousJobs.length >= 100) throw new IdentityError(429, 'demo_job_limit');
      const snapshot = await tx.get<State>('agent_demo_state', stateKey) ?? initialState();
      const job: StoredJob = { id: randomUUID(), userId: principal.userId, requestId, text,
        createdAt: iso(this.clock()), deadlineAt: iso(this.clock() + 180_000), status: 'queued', snapshot };
      await tx.put('agent_demo_state', stateKey, snapshot);
      await tx.put('agent_demo_jobs', job.id, job);
      await tx.put('agent_demo_requests', requestKey, { jobId: job.id });
      await tx.put('agent_demo_pending', scopedKey(job.createdAt, job.id), { jobId: job.id });
      await tx.put('agent_demo_user_jobs', scopedKey(principal.userId, job.createdAt, job.id), { jobId: job.id });
      return { jobId: job.id, status: job.status };
    });
  }

  private async expire(tx: MultiUserTransaction, job: StoredJob) {
    if (job.status === 'claimed' && job.lease && this.clock() >= Math.min(Date.parse(job.lease.leaseExpiresAt), Date.parse(job.deadlineAt))) {
      job.status = 'uncertain'; job.failureCode = 'deadline_expired';
      await tx.put('agent_demo_jobs', job.id, job);
    } else if (job.status === 'queued' && this.clock() >= Date.parse(job.deadlineAt)) {
      job.status = 'failed'; job.failureCode = 'deadline_expired';
      await tx.put('agent_demo_jobs', job.id, job);
    }
  }

  async claim(input: { workerId: string; requestId: string }): Promise<AgentChatJob | null> {
    const { workerId, requestId } = z.object({ workerId: z.string().trim().min(1).max(100), requestId: uuid }).strict().parse(input);
    return this.store.transaction(async tx => {
      await tx.put('agent_demo_worker', 'heartbeat', { at: this.clock() });
      const prior = await tx.get<Claim>('agent_demo_claims', requestId);
      if (prior) {
        if (prior.workerId !== workerId) throw new IdentityError(409, 'claim_id_reused');
        if (!prior.jobId) return null;
        const job = (await tx.get<StoredJob>('agent_demo_jobs', prior.jobId))!;
        await this.expire(tx, job);
        // A completed/expired reservation never becomes a new inference, even after a lost HTTP response.
        return job.status === 'claimed' ? job.lease! : null;
      }
      while (true) {
        const page = await tx.list<{ jobId: string }>('agent_demo_pending', '', 100);
        if (!page.length) break;
        for (const candidate of page) {
          const job = await tx.get<StoredJob>('agent_demo_jobs', candidate.jobId);
          if (!job) throw new Error('Corrupt agent queue.');
          await tx.remove('agent_demo_pending', scopedKey(job.createdAt, job.id));
          await this.expire(tx, job);
          if (job.status !== 'queued') continue;
          const lease: AgentChatJob = {
            version: 'v0', kind: 'chat', id: job.id, userId: job.userId, requestId: job.requestId,
            leaseId: randomUUID(), leaseExpiresAt: iso(Math.min(this.clock() + this.leaseMs, Date.parse(job.deadlineAt))),
            deadlineAt: job.deadlineAt, contextVersion: String(job.snapshot.version), synthetic: true,
            payload: { conversationId: job.snapshot.conversationId, text: job.text, ownerVerified: true,
              messages: job.snapshot.messages.slice(-12), concern: job.snapshot.concern, plan: job.snapshot.plan,
              context: { profile: { name: 'Rodrigo Demo', role: 'Soporte TI, escenario ficticio' }, memory: job.snapshot.memory, examples: [] } },
          };
          // Preserve stored memory, but bound the transport snapshot to the worker's 128k envelope.
          while (JSON.stringify(lease).length > 120_000 && lease.payload.context.memory.length) lease.payload.context.memory = lease.payload.context.memory.slice(1);
          job.status = 'claimed'; job.lease = lease; job.workerId = workerId;
          await tx.put('agent_demo_jobs', job.id, job);
          await tx.put<Claim>('agent_demo_claims', requestId, { workerId, jobId: job.id });
          return lease;
        }
      }
      await tx.put<Claim>('agent_demo_claims', requestId, { workerId, jobId: null });
      return null;
    });
  }

  async readiness() {
    return this.store.transaction(async tx => {
      const heartbeat = await tx.get<{ at: number }>('agent_demo_worker', 'heartbeat');
      return { connected: !!heartbeat && this.clock() - heartbeat.at < 15_000, syntheticOnly: true as const };
    });
  }

  async accept(jobId: string, input: { leaseId: string; result: unknown }) {
    const { leaseId, result } = z.object({ leaseId: id, result: resultSchema }).strict().parse(input);
    const receiptHash = digest({ leaseId, result });
    const error = await this.store.transaction(async tx => {
      const job = await tx.get<StoredJob>('agent_demo_jobs', jobId);
      if (!job) throw new IdentityError(404, 'job_not_found');
      if (job.lease?.leaseId !== leaseId) throw new IdentityError(409, 'stale_lease');
      if (job.status === 'accepted') {
        if (job.receiptHash !== receiptHash) throw new IdentityError(409, 'result_already_applied');
        return null;
      }
      await this.expire(tx, job);
      if (job.status !== 'claimed') return new IdentityError(409, 'stale_lease');
      if (result.reply.role !== 'assistant' || result.reply.id !== `${job.requestId}:reply` || !result.reply.inference || result.reply.inference.error ||
          result.clearHistory !== (command(job.text) === 'borrar')) throw new IdentityError(400, 'invalid_chat_result');
      const updates = new Set<string>();
      for (const memory of result.memoryUpdates) {
        if (updates.has(memory.key) || memory.source !== 'chat' || !memory.evidence?.trim() || !job.text.includes(memory.evidence)) {
          throw new IdentityError(400, 'invalid_memory_evidence');
        }
        updates.add(memory.key);
      }
      const stateKey = scopedKey(job.userId);
      const current = (await tx.get<State>('agent_demo_state', stateKey))!;
      if (String(current.version) !== job.lease.contextVersion) {
        job.status = 'failed'; job.failureCode = 'context_changed';
        await tx.put('agent_demo_jobs', job.id, job);
        return new IdentityError(409, 'context_changed');
      }
      const memory = new Map(current.memory.map(value => [value.key, value]));
      for (const forgotten of result.forgetKeys) {
        if (memory.get(forgotten)?.source === 'chat') memory.delete(forgotten);
      }
      if (result.clearHistory) for (const [name, value] of memory) if (value.source === 'chat') memory.delete(name);
      for (const update of result.memoryUpdates) memory.set(update.key, update);
      if (memory.size > 100) throw new IdentityError(400, 'memory_limit_exceeded');
      const messages: ChatMessage[] = result.clearHistory ? [result.reply] :
        [...current.messages, { id: job.requestId, role: 'user' as const, text: job.text }, result.reply].slice(-60);
      await tx.put<State>('agent_demo_state', stateKey, { ...current, version: current.version + 1,
        messages, memory: [...memory.values()], concern: result.concern, plan: result.plan });
      job.status = 'accepted'; job.receiptHash = receiptHash;
      await tx.put('agent_demo_jobs', job.id, job);
      return null;
    });
    if (error) throw error;
    return { status: 'accepted' as const };
  }

  async fail(jobId: string, input: { leaseId: string; code: FailureCode }) {
    const { leaseId, code } = z.object({ leaseId: id, code: failureSchema }).strict().parse(input);
    const receiptHash = digest({ leaseId, code });
    const error = await this.store.transaction(async tx => {
      const job = await tx.get<StoredJob>('agent_demo_jobs', jobId);
      if (!job) throw new IdentityError(404, 'job_not_found');
      if (job.lease?.leaseId !== leaseId) throw new IdentityError(409, 'stale_lease');
      if (job.receiptHash === receiptHash && (job.status === 'failed' || job.status === 'uncertain')) return null;
      await this.expire(tx, job);
      if (job.status !== 'claimed') return new IdentityError(409, 'stale_lease');
      job.status = code === 'inference_interrupted' ? 'uncertain' : 'failed';
      job.failureCode = code; job.receiptHash = receiptHash;
      await tx.put('agent_demo_jobs', job.id, job);
      return null;
    });
    if (error) throw error;
    return { status: 'failed' as const };
  }

  async state(principal: Principal) {
    return this.store.transaction(async tx => {
      await this.identity.assertPrincipalInTransaction(tx, principal);
      const key = scopedKey(principal.userId);
      let state = await tx.get<State>('agent_demo_state', key);
      if (!state) {
        state = initialState();
        await tx.put('agent_demo_state', key, state);
      }
      const indexes = await tx.list<{ jobId: string }>('agent_demo_user_jobs', scopedKey(principal.userId), 200);
      const operations = [];
      for (const index of indexes) {
        const job = (await tx.get<StoredJob>('agent_demo_jobs', index.jobId))!;
        if (job.userId !== principal.userId) throw new Error('Corrupt user job index.');
        await this.expire(tx, job);
        operations.push({ jobId: job.id, requestId: job.requestId, status: job.status, ...(job.failureCode ? { error: job.failureCode } : {}) });
      }
      return { ...state, operations, synthetic: true as const };
    });
  }
}

function errors(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof IdentityError) return res.status(error.status).json({ error: error.code });
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'invalid_data' });
  return res.status(500).json({ error: 'agent_operation_failed' });
}

/** Mount at /internal/agent/v0, separately from application/session authentication. */
export function workerRouter(queue: SyntheticAgentQueue, options: { workerToken: string }) {
  const { workerToken } = options;
  if (workerToken.length < 32 || /\s/.test(workerToken)) throw new Error('A dedicated worker token of at least 32 characters is required.');
  const router = Router();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const expected = Buffer.from(`Bearer ${workerToken}`), actual = Buffer.from(req.get('Authorization') ?? '');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new IdentityError(401, 'invalid_worker_token');
    next();
  });
  router.post('/claim', async (req, res) => { const job = await queue.claim(req.body); return job ? res.json({ job }) : res.sendStatus(204); });
  router.post('/jobs/:id/result', async (req, res) => res.json(await queue.accept(String(req.params.id), req.body)));
  router.post('/jobs/:id/failure', async (req, res) => res.json(await queue.fail(String(req.params.id), req.body)));
  router.use(errors);
  return router;
}

export const CHAT_SCENARIOS = {
  two_minute_steps: 'Prefiero pasos de dos minutos. Me preocupa preparar la reunión de mañana.',
  correct_routine: 'Corrijo mi preferencia: ahora prefiero pasos de cinco minutos.',
  new_concern: 'nuevo',
  forget_chat: 'borrar',
} as const;

/** Mount only when an operator explicitly enables the synthetic demo, e.g. /api/v1/demo. */
export function fixtureRouter(queue: SyntheticAgentQueue, identity: IdentityService, publicUrl?: string) {
  const router = Router();
  const auth = clientAuth(identity, publicUrl);
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.locals.principal = await auth.authenticate(req); next();
  });
  router.post('/chat', async (req, res) => {
    const body = z.object({ requestId: uuid, scenario: z.enum(['two_minute_steps', 'correct_routine', 'new_concern', 'forget_chat']) }).strict().parse(req.body);
    if (!(await queue.readiness()).connected) throw new IdentityError(503, 'agent_not_connected');
    res.status(202).json(await queue.enqueueSyntheticChat(res.locals.principal as Principal, { requestId: body.requestId, text: CHAT_SCENARIOS[body.scenario] }));
  });
  router.get('/chat', async (_req, res) => res.json(await queue.state(res.locals.principal as Principal)));
  router.use(errors);
  return router;
}
