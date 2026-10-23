// Opt-in acceptance check against the real Codex engine and the pilot HTTP API.
// Uses synthetic text, a temporary state file and two separate server processes.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAgent } from '../src/agent.ts';
import { createChat } from '../src/chat.ts';
import type { SessionView } from '../src/chat.ts';
import { createCodexRunner } from '../src/engines/codex.ts';
import { rulesEngine } from '../src/engines/rules.ts';
import { createAgentServer } from '../src/server.ts';
import { FileStore } from '../src/store.ts';

if (process.argv[2] === '--serve') {
  const store = new FileStore(process.argv[3]);
  const runner = createCodexRunner({
    bin: process.env.CODEX_BIN ?? fileURLToPath(new URL('../node_modules/.bin/codex', import.meta.url)),
    model: process.env.CODEX_MODEL,
    timeoutMs: 60_000,
    maxConcurrent: 1,
  });
  const chat = createChat({
    store, userId: 'acceptance-rodrigo', model: process.env.CODEX_MODEL ?? null,
    runner: async (prompt, schema) => {
      process.send?.({ type: 'inference' });
      return runner(prompt, schema);
    },
  });
  const server = createAgentServer({
    store, chat, agent: createAgent({ store, engine: rulesEngine }), dev: false,
    token: process.env.VERIFY_API_TOKEN, chatPassword: process.env.VERIFY_CHAT_PASSWORD,
  });
  server.listen(0, '127.0.0.1', () => {
    process.send?.({ type: 'ready', port: (server.address() as AddressInfo).port });
  });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} else {
  if (!process.argv.includes('--codex')) {
    console.error('Esta prueba hace 3 llamadas reales a Codex. Ejecuta: node scripts/verify-chat.ts --codex [--report ruta.json]');
    process.exit(2);
  }

  const reportFlag = process.argv.indexOf('--report');
  if (reportFlag !== -1 && !process.argv[reportFlag + 1]) throw new Error('Falta la ruta de --report.');
  const reportPath = reportFlag === -1
    ? fileURLToPath(new URL(`../.data/verify-chat-${Date.now()}.json`, import.meta.url))
    : resolve(process.argv[reportFlag + 1]);
  const dir = await mkdtemp(join(tmpdir(), 'solsets-acceptance-'));
  const statePath = join(dir, 'state.json');
  const password = randomBytes(24).toString('hex');
  const apiToken = randomBytes(24).toString('hex');
  const headers = { authorization: `Basic ${Buffer.from(`solsets:${password}`).toString('base64')}`, 'content-type': 'application/json' };
  let inferenceCalls = 0;
  let running: Awaited<ReturnType<typeof start>> | undefined;
  const report = {
    startedAt: new Date().toISOString(), engine: 'codex', requestedModel: process.env.CODEX_MODEL ?? null,
    checks: [] as string[], turns: [] as Array<{ text: string; elapsedMs: number; session: SessionView }>,
    inferenceCalls: 0, status: 'running', error: null as string | null,
    scope: 'Piloto HTTP local, procesos y almacenamiento aislados; no verifica móvil, servidor compartido ni WhatsApp.',
  };

  async function start() {
    const child = fork(fileURLToPath(import.meta.url), ['--serve', statePath], {
      silent: true,
      env: { ...process.env, VERIFY_API_TOKEN: apiToken, VERIFY_CHAT_PASSWORD: password },
    });
    let stderr = '';
    child.stderr?.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-2000); });
    child.stdout?.resume();
    const closed = new Promise<void>(resolveClose => child.once('close', () => resolveClose()));
    const stop = async () => {
      if (child.exitCode !== null || child.signalCode !== null) { await closed; return; }
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      try { await closed; } finally { clearTimeout(timer); }
    };
    const port = await new Promise<number>((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error('El servicio de prueba no arrancó en 10 segundos.')), 10_000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`El servicio salió (${code}): ${stderr}`)); });
      child.on('message', message => {
        const event = message as { type?: string; port?: number };
        if (event?.type === 'inference') inferenceCalls++;
        if (event?.type === 'ready' && typeof event.port === 'number') {
          clearTimeout(timer); resolveReady(event.port);
        }
      });
    }).catch(async error => { await stop(); throw error; });
    return { base: `http://127.0.0.1:${port}`, stop };
  }

  function passed(label: string) {
    report.checks.push(label);
    console.log(`OK: ${label}`);
  }

  async function request(path: string, input?: { text: string; requestId: string }): Promise<SessionView> {
    assert(running, 'El servicio debe estar activo.');
    const response = await fetch(`${running.base}${path}`, {
      method: input ? 'POST' : 'GET', headers,
      ...(input ? { body: JSON.stringify(input) } : {}), signal: AbortSignal.timeout(70_000),
    });
    assert.equal(response.status, 200, `HTTP ${response.status} en ${path}`);
    const body = await response.json() as { session?: SessionView; sessions?: SessionView[] };
    const session = body.session ?? body.sessions?.[0];
    assert(session && Array.isArray(session.messages), 'Falta una sesión válida.');
    return session;
  }

  async function turn(input: { text: string; requestId: string }) {
    const started = Date.now();
    const session = await request('/api/disconnect/messages', input);
    report.turns.push({ text: input.text, elapsedMs: Date.now() - started, session });
    assert.equal(session.messages.at(-1)?.inference?.engine, 'codex', 'El turno debe responder con Codex real, sin respaldo fijo.');
    return session;
  }

  try {
    running = await start();
    const first = await turn({
      text: 'Termino mi turno a las 18:00 y prefiero primeros pasos de dos minutos. Mi pendiente para mañana es revisar la impresora.',
      requestId: randomUUID(),
    });
    const schedule = first.memory.find(m => /18:00/.test(m.value));
    assert(schedule, 'Debe guardar el horario declarado.');
    assert(first.memory.every(m => m.evidence && report.turns[0].text.includes(m.evidence)), 'La memoria nueva debe citar el mensaje del usuario.');
    assert.equal(first.plan?.minutes, 2, 'El primer paso debe respetar los dos minutos declarados.');
    passed('Respuesta real y horario guardado con evidencia literal.');

    const correction = {
      text: 'Corrijo el dato anterior: termino mi turno a las 19:00. Mantén los primeros pasos de dos minutos.',
      requestId: randomUUID(),
    };
    const corrected = await turn(correction);
    assert(corrected.memory.some(m => m.key === schedule.key && /19:00/.test(m.value)), 'La corrección debe actualizar la misma clave de memoria.');
    assert(!corrected.memory.some(m => /18:00/.test(m.value)), 'El horario anterior no debe seguir como recuerdo activo.');
    passed('Corrección a las 19:00 sin mantener activo el horario anterior.');

    const callsBeforeRetry = inferenceCalls;
    assert.deepEqual(await request('/api/disconnect/messages', correction), corrected);
    assert.equal(inferenceCalls, callsBeforeRetry, 'El reintento no debe volver a invocar el modelo.');
    passed('Mismo UUID: mismo turno y ninguna inferencia adicional.');

    await running.stop();
    running = await start();
    assert.deepEqual(await request('/api/disconnect'), corrected);
    passed('Otro proceso recupera el historial y la memoria corregida desde el archivo.');

    const recalled = await turn({
      text: '¿A qué hora termino mi turno y de cuántos minutos prefiero el primer paso? Usa lo que ya te indiqué.',
      requestId: randomUUID(),
    });
    const reply = recalled.messages.at(-1)?.text ?? '';
    assert.match(reply, /19:00|19\s*(?:h|horas)|siete.*tarde/i, 'Debe recuperar el horario corregido.');
    assert.match(reply, /(?:dos|2)\s*minutos/i, 'Debe recuperar la preferencia de esfuerzo.');
    passed('Codex recupera horario y preferencia después del reinicio.');

    const other = await fetch(`${running.base}/v1/users/acceptance-other/memory`, {
      headers: { authorization: `Bearer ${apiToken}` }, signal: AbortSignal.timeout(5000),
    });
    assert.equal(other.status, 200);
    const otherMemory = await other.json() as { memory: unknown[] };
    assert.deepEqual(otherMemory.memory, []);
    passed('El almacén del otro usuario no contiene los recuerdos de la prueba.');
    assert.equal(inferenceCalls, 3);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.error = error instanceof Error ? error.message : String(error);
    console.error(`FALLO: ${report.error}`);
    process.exitCode = 1;
  } finally {
    await running?.stop();
    await rm(dir, { recursive: true, force: true });
    report.inferenceCalls = inferenceCalls;
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`Informe: ${reportPath}`);
  }
}
