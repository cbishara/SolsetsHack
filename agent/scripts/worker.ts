import { FileJournal } from '../src/integration/journal.ts';
import { createWorker, runWorker, workerOrigin } from '../src/integration/worker.ts';
import { createJobProcessor } from '../src/integration/processor.ts';
import { createCodexRunner } from '../src/engines/codex.ts';
import { createV1Protocol } from '../src/integration/contract-v1.ts';
import type { AgentJobV1, JobResultV1 } from '../src/integration/contract-v1.ts';
import { createJobProcessorV1 } from '../src/integration/processor-v1.ts';

let journal: { close(): void } | undefined;
try {
  const version = process.env.AGENT_WORKER_VERSION ?? 'v0';
  if (version !== 'v0' && version !== 'v1') throw new Error('AGENT_WORKER_VERSION debe ser v0 o v1.');
  const allowReal = process.env.AGENT_WORKER_ALLOW_REAL === 'true';
  if (allowReal && version !== 'v1') throw new Error('El modo real solo existe en v1; v0 permanece sintético.');
  const url = workerOrigin(process.env.AGENT_WORKER_URL ?? '');
  const workerId = process.env.AGENT_WORKER_ID ?? (version === 'v1' ? 'quito-mac-demo-v1' : 'quito-mac-demo');
  const token = process.env.AGENT_WORKER_TOKEN ?? '';
  if (token.length < 24) throw new Error('Configura AGENT_WORKER_TOKEN por canal privado. No uses el token móvil.');
  const statePath = process.env.AGENT_WORKER_STATE ?? new URL(version === 'v1' ? '../.data/worker-v1.json' : '../.data/worker.json', import.meta.url).pathname;
  const processorOptions = { model: process.env.CODEX_MODEL ?? null,
    runnerFor: (timeoutMs: number) => createCodexRunner({ bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL, timeoutMs, maxConcurrent: 1 }) };
  const worker = version === 'v1' ? (() => {
    const protocol = createV1Protocol(allowReal);
    const outbox = new FileJournal<AgentJobV1, JobResultV1>(statePath, { url, workerId, protocol: 'v1' }, protocol.parseJob);
    journal = outbox;
    return createWorker({ url, token, workerId, journal: outbox, protocol, process: createJobProcessorV1({ ...processorOptions, allowReal }) });
  })() : (() => {
    const outbox = new FileJournal(statePath, { url, workerId });
    journal = outbox;
    return createWorker({ url, token, workerId, journal: outbox, process: createJobProcessor(processorOptions) });
  })();
  const controller = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
  console.log(`Trabajador ${version} listo; datos reales ${allowReal ? 'habilitados por operador' : 'deshabilitados'}. Codex permanece en el Mac.`);
  await runWorker(worker, controller.signal, status => console.log(`worker: ${status}`));
} catch (e) {
  // These are configuration/transport codes only. Provider errors are mapped to fixed failure codes.
  console.error(`No se pudo continuar el trabajador: ${(e as Error).message}`);
  process.exitCode = 1;
} finally { journal?.close(); }
