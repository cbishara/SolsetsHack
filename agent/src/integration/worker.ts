import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { IntegrationError, parseJob, record, string } from './contract.ts';
import type { AgentJob, JobResult } from './contract.ts';
import type { Journal, WorkState } from './journal.ts';

export class WorkerTransportError extends Error {
  readonly code: string;
  readonly fatal: boolean;
  constructor(code: string, fatal: boolean) { super(code); this.code = code; this.fatal = fatal; }
}
type LeaseJob = Pick<AgentJob, 'id' | 'leaseId' | 'leaseExpiresAt' | 'deadlineAt'>;
export interface WorkerOptions<J extends LeaseJob = AgentJob, R = JobResult> {
  url: string; token: string; workerId: string; journal: Journal<J, R>;
  process: (job: J) => Promise<R>;
  protocol?: { version: 'v0' | 'v1'; parseJob: (input: unknown) => J };
  fetcher?: typeof fetch; now?: () => number; requestTimeoutMs?: number;
}
export function workerOrigin(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Usa solo el origen del servidor, sin rutas ni credenciales.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('El trabajador exige HTTPS; HTTP solo se permite en loopback para pruebas.');
  return url.origin;
}

export function createWorker<J extends LeaseJob = AgentJob, R = JobResult>(options: WorkerOptions<J, R>) {
  const { token, workerId, journal, process: processJob, fetcher = fetch, now = Date.now, requestTimeoutMs = 10_000 } = options;
  const origin = workerOrigin(options.url);
  const protocol = options.protocol ?? { version: 'v0', parseJob: parseJob as unknown as (input: unknown) => J };
  const prefix = `/internal/agent/${protocol.version}`;
  if (!token || token.length < 24 || /\s/.test(token)) throw new Error('Falta un token exclusivo del trabajador de al menos 24 caracteres.');
  string(workerId, 100);
  let active = false;

  async function post(path: string, body: unknown, terminalConflict = false) {
    let response;
    try {
      response = await fetcher(origin + path, { method: 'POST', redirect: 'error',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(requestTimeoutMs) });
    } catch { throw new WorkerTransportError('connection_unavailable', false); }
    if (terminalConflict && response.status === 409) return { conflict: true };
    if (response.status === 401 || response.status === 403) throw new WorkerTransportError('worker_unauthorized', true);
    if (response.status === 404) throw new WorkerTransportError('contract_routes_missing', true);
    if (!response.ok) throw new WorkerTransportError(`server_http_${response.status}`, response.status < 500 && response.status !== 429);
    if (response.status === 204) return null;
    if (!response.headers.get('content-type')?.includes('application/json')) throw new WorkerTransportError('invalid_server_response', true);
    // Never print an HTTP response body: it could contain secrets or third-party data.
    let bodyText;
    try { bodyText = await response.text(); } catch { throw new WorkerTransportError('connection_unavailable', false); }
    if (bodyText.length > 128_000) throw new WorkerTransportError('invalid_server_response', true);
    try { return record(JSON.parse(bodyText)); } catch { throw new WorkerTransportError('invalid_server_response', true); }
  }

  async function step(): Promise<'idle' | 'delivered' | 'discarded'> {
    if (active) throw new Error('Solo un paso del trabajador puede ejecutarse a la vez.');
    active = true;
    try {
      let state: WorkState<J, R> | null = journal.read();
      if (!state) { state = { phase: 'claim', requestId: randomUUID() }; journal.write(state); }
      if (state.phase === 'claim') {
        const response = await post(`${prefix}/claim`, { workerId, requestId: state.requestId });
        if (response === null) { journal.write(null); return 'idle'; }
        let job;
        try { job = protocol.parseJob(response.job); }
        catch (e) { throw new WorkerTransportError(e instanceof IntegrationError ? e.code : 'invalid_job', true); }
        state = { phase: 'claimed', job }; journal.write(state);
      }
      if ('job' in state) {
        try { protocol.parseJob(state.job); }
        catch { throw new WorkerTransportError('journal_protocol_mismatch', true); }
      }
      // A previous process might have called the model already. Do not repeat an uncertain inference.
      if (state.phase === 'running') {
        state = { phase: 'failure', job: state.job, code: 'inference_interrupted' }; journal.write(state);
      }
      if (state.phase === 'claimed') {
        const job = state.job;
        if (now() >= Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt))) {
          state = { phase: 'failure', job, code: 'deadline_expired' }; journal.write(state);
        } else {
          journal.write({ phase: 'running', job });
          let result;
          try { result = await processJob(job); }
          catch (e) {
            state = { phase: 'failure', job, code: e instanceof IntegrationError ? e.code : 'engine_unavailable' };
            journal.write(state);
          }
          if (result) {
            state = now() >= Math.min(Date.parse(job.deadlineAt), Date.parse(job.leaseExpiresAt))
              ? { phase: 'failure', job, code: 'deadline_expired' }
              : { phase: 'result', job, result };
            // Persist before sending. A lost delivery response must never call the model again.
            journal.write(state);
          }
        }
      }
      if (state.phase !== 'result' && state.phase !== 'failure') throw new Error('Estado del trabajador inválido.');
      const tail = state.phase === 'result' ? 'result' : 'failure';
      const body = state.phase === 'result' ? { leaseId: state.job.leaseId, result: state.result } : { leaseId: state.job.leaseId, code: state.code };
      const response = await post(`${prefix}/jobs/${encodeURIComponent(state.job.id)}/${tail}`, body, true);
      if (!response || (!response.conflict && response.status !== (tail === 'result' ? 'accepted' : 'failed'))) throw new WorkerTransportError('invalid_acknowledgement', true);
      journal.write(null);
      return response.conflict ? 'discarded' : 'delivered';
    } finally { active = false; }
  }
  return { step };
}

/** Bounded polling; logs only status codes and never a prompt, token or job payload. */
export async function runWorker(worker: { step(): Promise<'idle' | 'delivered' | 'discarded'> }, signal: AbortSignal, log: (status: string) => void, pollMs = 1000) {
  let backoff = pollMs;
  while (!signal.aborted) {
    try { const status = await worker.step(); if (status !== 'idle') log(status); backoff = pollMs; }
    catch (error) {
      if (!(error instanceof WorkerTransportError)) throw error;
      log(error.code);
      if (error.fatal) throw error;
      backoff = Math.min(Math.max(pollMs, backoff * 2), 30_000);
    }
    try { await delay(backoff, undefined, { signal }); } catch { if (!signal.aborted) throw new Error('No se pudo esperar el siguiente trabajo.'); }
  }
}
