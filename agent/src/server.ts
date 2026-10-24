import { createServer } from 'node:http';
import type { IncomingMessage as Req, Server, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual } from 'node:crypto';
import { createAgent, InputError, NotFoundError } from './agent.ts';
import type { Agent } from './agent.ts';
import type { NightContext } from './contract.ts';
import { createCodexEngine } from './engines/codex.ts';
import { rulesEngine } from './engines/rules.ts';
import { FileStore } from './store.ts';
import type { AgentStore } from './store.ts';
import { addConfirmedCase, loadCases } from './cases.ts';
import { runWeek, summarize } from './evaluate.ts';
import { createChat } from './chat.ts';
import type { Chat } from './chat.ts';
import { createCodexRunner } from './engines/codex.ts';
import type { CodexOptions } from './engines/codex.ts';
import { CapabilityUnavailable, createAppCapabilities } from './app-capabilities.ts';
import type { AppCapabilities } from './app-capabilities.ts';
import { createAppClassifier } from './app-classifier.ts';
import type { AppClassifier } from './app-classifier.ts';

/** Chat settings are independent of the guard classifier's model and effort. */
export function chatCodexOptions(env: NodeJS.ProcessEnv): CodexOptions {
  const effort = env.CHAT_REASONING_EFFORT ?? 'low';
  if (!['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) {
    throw new Error('CHAT_REASONING_EFFORT no es un nivel válido.');
  }
  if (env.CHAT_FAST !== undefined && !['true', 'false', '1', '0'].includes(env.CHAT_FAST)) {
    throw new Error('CHAT_FAST debe ser true, false, 1 o 0.');
  }
  return {
    bin: env.CODEX_BIN,
    model: env.CHAT_MODEL ?? env.CODEX_MODEL,
    reasoningEffort: effort as CodexOptions['reasoningEffort'],
    fast: env.CHAT_FAST === 'true' || env.CHAT_FAST === '1',
    timeoutMs: Number(env.CHAT_TIMEOUT_MS ?? 60_000),
  };
}

const MAX_BODY = 64 * 1024;

export interface ServerOptions {
  store: AgentStore;
  /** Agent used by the API. */
  agent: Agent;
  /** Agents the dev console can choose from (dev mode only). */
  devAgents?: Partial<Record<'codex' | 'rules', Agent>>;
  /** Bearer token required on /v1/*. Without it, the API is open (local only). */
  token?: string;
  dev: boolean;
  /** Chat brain for Amaru's app (pilot routes /api/disconnect). */
  chat?: Chat;
  /** Basic password the app sends as solsets:<password>. Without it, the chat is open (local only). */
  chatPassword?: string;
  /** Allowed browser origin for the app's web preview. '*' in dev. */
  corsOrigin?: string;
  appCapabilities?: AppCapabilities;
  appClassifier?: AppClassifier;
}

/** The pilot session the app reads (`sessions[id="demo:web"]`). */
export const PILOT_SESSION = 'demo:web';

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: Req): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new InputError('El cuerpo supera 64 KB.');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError('El cuerpo no es JSON válido.');
  }
}

function authorized(req: Req, token: string | undefined): boolean {
  if (!token) return true;
  const given = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function nightContext(value: unknown): NightContext {
  const v = (value ?? {}) as Record<string, unknown>;
  // Shadow by default: until the user graduates the agent, nothing is silenced.
  return { shadow: v.shadow !== false };
}

function chatAuthorized(req: Req, password: string | undefined): boolean {
  if (!password) return true;
  const given = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Basic ${Buffer.from(`solsets:${password}`).toString('base64')}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createAgentServer({ store, agent, devAgents = {}, token, dev, chat, chatPassword, corsOrigin, appCapabilities, appClassifier }: ServerOptions): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    try {
      if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, dev });

      if (chat && path.startsWith('/api/disconnect')) {
        const origin = corsOrigin ?? (dev ? '*' : undefined);
        if (origin) {
          res.setHeader('access-control-allow-origin', origin);
          res.setHeader('access-control-allow-headers', 'authorization, content-type, accept');
          res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
        }
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
        if (!chatAuthorized(req, chatPassword)) return send(res, 401, { error: 'Contraseña de testing incorrecta.' });
        if (req.method === 'GET' && path === '/api/disconnect') return send(res, 200, { sessions: [chat.view(PILOT_SESSION)] });
        if (req.method === 'POST' && path === '/api/disconnect/messages') return send(res, 200, { session: await chat.send(PILOT_SESSION, await readJson(req)) });
        return send(res, 404, { error: 'Ruta no encontrada.' });
      }

      if (path.startsWith('/v1/')) {
        if (!authorized(req, token)) return send(res, 401, { error: 'Falta el token del agente.' });
        if (req.method === 'POST' && path.startsWith('/v1/app/')) {
          if (path === '/v1/app/classify' && appClassifier) return send(res, 200, await appClassifier(await readJson(req)));
          if (path === '/v1/app/dump' && appCapabilities) return send(res, 200, await appCapabilities.dump(await readJson(req)));
          if (path === '/v1/app/training' && appCapabilities) return send(res, 200, await appCapabilities.training(await readJson(req)));
        }
        if (req.method === 'POST' && path === '/v1/classify') {
          const body = (await readJson(req)) as Record<string, unknown>;
          return send(res, 200, await agent.classify(body.message, nightContext(body.context)));
        }
        if (req.method === 'POST' && path === '/v1/feedback') return send(res, 200, agent.feedback(await readJson(req)));
        if (req.method === 'POST' && path === '/v1/memory') return send(res, 201, agent.remember(await readJson(req)));
        const user = path.match(/^\/v1\/users\/([^/]+)\/(memory|decisions)$/);
        if (req.method === 'GET' && user) {
          const userId = decodeURIComponent(user[1]);
          if (user[2] === 'memory') return send(res, 200, agent.memoryOf(userId));
          return send(res, 200, agent.decisionsOf(userId, url.searchParams.get('since') ?? undefined));
        }
        return send(res, 404, { error: 'Ruta no encontrada.' });
      }

      if (dev) {
        if (req.method === 'GET' && (path === '/' || path === '/tools')) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          const page = path === '/' ? 'index.html' : 'tools.html';
          return res.end(await readFile(new URL(`../console/${page}`, import.meta.url)));
        }
        if (req.method === 'POST' && path === '/dev/classify') {
          const body = (await readJson(req)) as Record<string, unknown>;
          const chosen = devAgents[body.engine === 'codex' ? 'codex' : 'rules'];
          if (!chosen) return send(res, 400, { error: `El motor ${String(body.engine)} no está disponible.` });
          const started = Date.now();
          const decision = await chosen.classify(body.message, nightContext(body.context));
          return send(res, 200, { decision, ms: Date.now() - started });
        }
        if (req.method === 'POST' && path === '/dev/feedback') return send(res, 200, agent.feedback(await readJson(req)));
        if (req.method === 'POST' && path === '/dev/memory') return send(res, 201, agent.remember(await readJson(req)));
        const devUser = path.match(/^\/dev\/users\/([^/]+)\/(memory|decisions)$/);
        if (req.method === 'GET' && devUser) {
          const userId = decodeURIComponent(devUser[1]);
          return send(res, 200, devUser[2] === 'memory' ? agent.memoryOf(userId) : agent.decisionsOf(userId));
        }
        if (req.method === 'GET' && path === '/dev/cases') return send(res, 200, await loadCases());
        if (req.method === 'POST' && path === '/dev/cases') return send(res, 201, await addConfirmedCase(await readJson(req)));
        if (req.method === 'POST' && path === '/dev/run-week') {
          const body = (await readJson(req)) as Record<string, unknown>;
          const chosen = devAgents[body.engine === 'codex' ? 'codex' : 'rules'];
          if (!chosen) return send(res, 400, { error: `El motor ${String(body.engine)} no está disponible.` });
          const week = await loadCases();
          // One JSON line per case as it finishes, then the summary.
          res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8' });
          const results = await runWeek(chosen, week, {
            runId: `consola-${Date.now().toString(36)}`,
            userId: typeof body.user_id === 'string' && body.user_id ? body.user_id : undefined,
            onResult: result => res.write(JSON.stringify({ type: 'result', result }) + '\n'),
          });
          return res.end(JSON.stringify({ type: 'summary', summary: summarize(results) }) + '\n');
        }
      }

      return send(res, 404, { error: 'Ruta no encontrada.' });
    } catch (error) {
      if (res.headersSent) {
        console.error(error);
        return res.end();
      }
      if (error instanceof InputError) return send(res, 400, { error: error.message });
      if (error instanceof NotFoundError) return send(res, 404, { error: error.message });
      if (error instanceof CapabilityUnavailable) return send(res, 503, { error: 'engine_unavailable' });
      console.error(error);
      return send(res, 500, { error: 'Error interno del agente.' });
    }
  });
}

// Entry point: `node src/server.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  const production = process.env.NODE_ENV === 'production';
  const token = process.env.AGENT_TOKEN;
  if (production && (!token || token.length < 24)) {
    console.error('AGENT_TOKEN es obligatorio en producción (24 caracteres o más): la API gasta el plan de Codex.');
    process.exit(1);
  }
  const store = new FileStore(process.env.AGENT_DATA_FILE ?? new URL('../.data/state.json', import.meta.url).pathname);
  const codex = createCodexEngine({
    bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL,
    timeoutMs: Number(process.env.CODEX_TIMEOUT_MS ?? 25_000),
  });
  const engineName = process.env.AGENT_ENGINE === 'codex' ? 'codex' : 'rules';
  const agents = {
    codex: createAgent({ store, engine: codex }),
    rules: createAgent({ store, engine: rulesEngine }),
  };
  const dev = !production;
  const chatPassword = process.env.CHAT_PASSWORD;
  if (production && (!chatPassword || chatPassword.length < 16)) {
    console.error('CHAT_PASSWORD es obligatoria en producción (16 caracteres o más): el chat gasta el plan de Codex.');
    process.exit(1);
  }
  const chatOptions = chatCodexOptions(process.env);
  const chat = createChat({
    store, userId: process.env.CHAT_USER_ID ?? 'rodrigo-demo', model: chatOptions.model ?? null,
    runner: engineName === 'codex'
      ? createCodexRunner(chatOptions)
      : null,
  });
  const server = createAgentServer({
    store, agent: agents[engineName], devAgents: agents, token, dev,
    chat, chatPassword, corsOrigin: process.env.CHAT_CORS_ORIGIN,
    appCapabilities: createAppCapabilities({ runner: engineName === 'codex' ? createCodexRunner(chatOptions) : null, model: chatOptions.model ?? null }),
    appClassifier: createAppClassifier({ store, runner: engineName === 'codex' ? createCodexRunner({ bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL, timeoutMs: Number(process.env.CODEX_TIMEOUT_MS ?? 25_000) }) : null, model: process.env.CODEX_MODEL ?? null }),
  });
  const port = Number(process.env.PORT ?? 4180);
  const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
  server.listen(port, host, () => {
    console.log(`Agente escuchando en http://localhost:${port} · motor de la API: ${engineName}${dev ? ` · consola: http://localhost:${port}/` : ''}`);
    if (engineName === 'codex') console.log(`Chat: ${chatOptions.model ?? 'modelo predeterminado'} · razonamiento: ${chatOptions.reasoningEffort} · Fast solicitado: ${chatOptions.fast ? 'sí' : 'no'}`);
  });
}
