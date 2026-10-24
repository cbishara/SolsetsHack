import { readFileSync, writeFileSync, renameSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { AgentJob, FailureCode, JobResult } from './contract.ts';
import { parseJob, record, UUID } from './contract.ts';

export type WorkState<J = AgentJob, R = JobResult> =
  | { phase: 'claim'; requestId: string }
  | { phase: 'claimed' | 'running'; job: J }
  | { phase: 'result'; job: J; result: R }
  | { phase: 'failure'; job: J; code: FailureCode };
export interface Journal<J = AgentJob, R = JobResult> { read(): WorkState<J, R> | null; write(state: WorkState<J, R> | null): void }
const checksum = (state: unknown) => createHash('sha256').update(JSON.stringify(state)).digest('hex');

export class MemoryJournal<J = AgentJob, R = JobResult> implements Journal<J, R> {
  private state: WorkState<J, R> | null = null;
  read() { return this.state ? structuredClone(this.state) : null; }
  write(state: WorkState<J, R> | null) { this.state = state ? structuredClone(state) : null; }
}

/** One private outbox per worker. Tokens never enter this file. Corruption fails closed. */
export class FileJournal<J = AgentJob, R = JobResult> implements Journal<J, R> {
  private readonly nonce = randomUUID();
  private state: WorkState<J, R> | null = null;
  private readonly path: string;
  private readonly identity: { url: string; workerId: string; protocol?: 'v1' };
  constructor(path: string, identity: { url: string; workerId: string; protocol?: 'v1' }, validateJob: (input: unknown) => J = parseJob as (input: unknown) => J) {
    this.path = path; this.identity = identity;
    mkdirSync(dirname(path), { recursive: true });
    this.lock();
    try {
      let raw;
      try { raw = JSON.parse(readFileSync(path, 'utf8')); }
      catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
      const data = record(raw);
      if (data.url !== identity.url || data.workerId !== identity.workerId || data.protocol !== identity.protocol) throw new Error('La bandeja pendiente pertenece a otro servidor, trabajador o protocolo.');
      if (data.version !== 1 || data.checksum !== checksum(data.state)) throw new Error('Bandeja inválida: el contenido no coincide con su comprobación.');
      if (data.state !== null) {
        const s = record(data.state);
        if (s.phase === 'claim') {
          if (typeof s.requestId !== 'string' || !UUID.test(s.requestId)) throw new Error('Bandeja inválida.');
        } else if (['claimed', 'running', 'result', 'failure'].includes(String(s.phase))) {
          validateJob(s.job);
          if (s.phase === 'result') record(s.result);
          if (s.phase === 'failure' && typeof s.code !== 'string') throw new Error('Bandeja inválida.');
        } else throw new Error('Bandeja inválida.');
      }
      this.state = data.state as WorkState<J, R> | null;
    } catch (error) { this.close(); throw error; }
  }
  private lock() {
    const lockPath = this.path + '.lock';
    const acquire = () => {
      const fd = openSync(lockPath, 'wx', 0o600);
      try { writeFileSync(fd, JSON.stringify({ pid: process.pid, nonce: this.nonce })); } finally { closeSync(fd); }
    };
    try { acquire(); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const existing = JSON.parse(readFileSync(lockPath, 'utf8'));
      if (!Number.isInteger(existing.pid) || existing.pid <= 0) throw new Error('Candado inválido: revisar antes de iniciar otro trabajador.');
      try { process.kill(existing.pid, 0); }
      catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e;
        unlinkSync(lockPath); acquire(); return;
      }
      throw new Error('Ya hay un trabajador usando esta bandeja.');
    }
  }
  read() { return this.state ? structuredClone(this.state) : null; }
  write(state: WorkState<J, R> | null) {
    const tmp = this.path + '.' + this.nonce + '.tmp';
    writeFileSync(tmp, JSON.stringify({ version: 1, ...this.identity, state, checksum: checksum(state) }), { mode: 0o600, flush: true });
    renameSync(tmp, this.path);
    this.state = state ? structuredClone(state) : null;
  }
  close() {
    const path = this.path + '.lock';
    try { if (JSON.parse(readFileSync(path, 'utf8')).nonce === this.nonce) unlinkSync(path); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
}
