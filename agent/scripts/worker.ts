import { FileJournal } from '../src/integration/journal.ts';
import { createWorker, runWorker, workerOrigin } from '../src/integration/worker.ts';
import { createJobProcessor } from '../src/integration/processor.ts';
import { createCodexRunner } from '../src/engines/codex.ts';

let journal: FileJournal | undefined;
try {
  const url = workerOrigin(process.env.AGENT_WORKER_URL ?? '');
  const workerId = process.env.AGENT_WORKER_ID ?? 'quito-mac-demo';
  const token = process.env.AGENT_WORKER_TOKEN ?? '';
  if (token.length < 24) throw new Error('Configura AGENT_WORKER_TOKEN por canal privado. No uses el token móvil.');
  journal = new FileJournal(process.env.AGENT_WORKER_STATE ?? new URL('../.data/worker.json', import.meta.url).pathname, { url, workerId });
  const processor = createJobProcessor({ model: process.env.CODEX_MODEL ?? null,
    runnerFor: timeoutMs => createCodexRunner({ bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL, timeoutMs, maxConcurrent: 1 }) });
  const worker = createWorker({ url, token, workerId, journal, process: processor });
  const controller = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => controller.abort());
  console.log('Trabajador v0 listo para trabajos sintéticos. Codex permanece en el Mac.');
  await runWorker(worker, controller.signal, status => console.log(`worker: ${status}`));
} catch (e) {
  // These are configuration/transport codes only. Provider errors are mapped to fixed failure codes.
  console.error(`No se pudo continuar el trabajador: ${(e as Error).message}`);
  process.exitCode = 1;
} finally { journal?.close(); }
