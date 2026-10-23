import { randomUUID } from 'node:crypto';
import type { CodexRunner } from './engines/codex.ts';
import { InputError } from './agent.ts';
import type { MemoryEntry, UserProfile } from './memory.ts';
import { selectMemory } from './memory.ts';
import type { AgentStore } from './store.ts';

// The chat brain behind SOL (funcionalidad 5, descarga de pendientes). It speaks the
// temporary pilot contract that Amaru's app already uses (docs/equipo/amaru/HANDOFF_AGENTE.md
// in amaru/mobile-expo): a session with messages, the current concern, a plan and visible memory.
// Chat text comes from the user, so it may write memory, always quoting the user's own words.

export interface ChatInference { engine: string; model?: string | null; error?: string }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; inference?: ChatInference }
export interface ChatPlan { title: string; nextStep: string; minutes?: number }
export interface ChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  concern: string;
  plan: ChatPlan | null;
  /** requestIds already answered: a retry with the same id returns the stored session. */
  processed: string[];
}

/** What the app receives. */
export interface SessionView {
  id: string;
  messages: ChatMessage[];
  concern: string;
  plan: ChatPlan | null;
  memory: Array<{ key: string; value: string; evidence?: string }>;
  preference: null;
}

export const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'concern', 'has_plan', 'plan_title', 'plan_next_step', 'plan_minutes', 'memory_updates', 'forget_keys'],
  properties: {
    reply: { type: 'string' },
    concern: { type: 'string' },
    has_plan: { type: 'boolean' },
    plan_title: { type: 'string' },
    plan_next_step: { type: 'string' },
    plan_minutes: { type: 'number' },
    memory_updates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'value', 'evidence', 'kind'],
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          evidence: { type: 'string' },
          kind: { type: 'string', enum: ['rule', 'fact'] },
        },
      },
    },
    forget_keys: { type: 'array', items: { type: 'string' } },
  },
} as const;

const MAX_MESSAGES = 60;
const CONTEXT_MESSAGES = 12;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function buildChatPrompt(profile: UserProfile, session: ChatSession, memory: MemoryEntry[], text: string): string {
  const mem = memory.length
    ? memory.map(m => `${m.key ?? m.id} (${m.kind === 'rule' ? 'regla' : 'dato'}): ${m.text}`).join('\n')
    : 'Todavía no hay nada guardado.';
  const recent = session.messages.slice(-CONTEXT_MESSAGES)
    .map(m => `${m.role === 'user' ? profile.name : 'SOL'}: ${m.text.replace(/<\/?mensaje>/gi, '')}`).join('\n') || 'Es el primer mensaje.';
  return [
    `Eres SOL, el asistente de ${profile.name} (${profile.role}). Esta conversación ocurre antes de dormir. Ayudas a sacar de la cabeza un pendiente y a dejar un primer paso concreto para mañana, en menos de un minuto.`,
    'Respondes corto: máximo tres frases, cálido y directo, en español de Chile con tuteo. No diagnosticas, no prometes que dormirá mejor y no dices que algo quedó hecho si no lo hizo. No hablas por esta persona con nadie.',
    'También aprendes. Si la persona dice una preferencia, un dato de su vida o una regla sobre qué debe despertarla de noche, guárdalo en memory_updates: una clave estable en minúsculas con guiones, el valor en una frase, y en evidence una cita literal y exacta de su mensaje nuevo. kind es "rule" si cambia qué la despierta o qué va al parte de la mañana; "fact" en otro caso. Si corrige algo que ya está guardado, usa la misma clave. Si pide olvidar algo, pon su clave en forget_keys. No guardes nada que no haya dicho ella en este mensaje.',
    `Lo que ya sabes de ${profile.name}:\n${mem}`,
    `Pendiente actual: ${session.concern || 'ninguno'}${session.plan ? `\nPrimer paso acordado: ${session.plan.nextStep}` : ''}`,
    `Conversación reciente:\n${recent}`,
    `Mensaje nuevo de ${profile.name}:\n<mensaje>\n${text.replace(/<\/?mensaje>/gi, '')}\n</mensaje>`,
    'Campos: reply (tu respuesta), concern (el pendiente en una frase, o el actual si no cambió, o vacío), has_plan, plan_title, plan_next_step y plan_minutes (un primer paso realizable; si guardaste cuántos minutos prefiere, respétalo). Si no hay plan, has_plan=false y los campos del plan vacíos o en 0.',
  ].join('\n\n');
}

interface ChatAnswer {
  reply: string;
  concern: string;
  plan: ChatPlan | null;
  updates: Array<{ key: string; value: string; evidence: string; kind: 'rule' | 'fact' }>;
  forget: string[];
}

export function parseChatAnswer(value: unknown, userText: string): ChatAnswer {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object' || typeof v.reply !== 'string' || !v.reply.trim()) throw new Error('El motor no devolvió una respuesta.');
  const updates = (Array.isArray(v.memory_updates) ? v.memory_updates : [])
    .filter((u): u is { key: string; value: string; evidence: string; kind: 'rule' | 'fact' } =>
      !!u && typeof u.key === 'string' && typeof u.value === 'string' && typeof u.evidence === 'string' && (u.kind === 'rule' || u.kind === 'fact'))
    // Only what the user literally said in this message can be remembered.
    .filter(u => u.evidence.trim() && userText.includes(u.evidence))
    .map(u => ({ ...u, key: normalize(u.key).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40), value: u.value.trim().slice(0, 300) }))
    .filter(u => u.key && u.value);
  const minutes = typeof v.plan_minutes === 'number' && Number.isFinite(v.plan_minutes) && v.plan_minutes >= 1 ? Math.round(v.plan_minutes) : undefined;
  const plan = v.has_plan === true && typeof v.plan_next_step === 'string' && v.plan_next_step.trim()
    ? { title: String(v.plan_title || 'Primer paso').trim(), nextStep: v.plan_next_step.trim(), ...(minutes ? { minutes } : {}) }
    : null;
  return {
    reply: v.reply.trim(),
    concern: typeof v.concern === 'string' ? v.concern.trim().slice(0, 300) : '',
    plan,
    updates,
    forget: (Array.isArray(v.forget_keys) ? v.forget_keys : []).filter((k): k is string => typeof k === 'string'),
  };
}

export interface ChatDeps {
  store: AgentStore;
  /** User the shared pilot session belongs to. */
  userId: string;
  /** Codex runner. Null runs the local rules reply, with no keys. */
  runner: CodexRunner | null;
  model?: string | null;
  now?: () => number;
}

export function createChat({ store, userId, runner, model = null, now = Date.now }: ChatDeps) {
  const queues = new Map<string, Promise<unknown>>();

  function load(sessionId: string): ChatSession {
    const saved = store.getChat(sessionId);
    if (saved && saved.user_id !== userId) throw new InputError('La conversación pertenece a otro usuario.');
    // Work on a copy: GET must not expose a half-finished turn while Codex runs.
    return saved ? structuredClone(saved) : { id: sessionId, user_id: userId, messages: [], concern: '', plan: null, processed: [] };
  }

  function view(sessionId: string): SessionView {
    const s = load(sessionId);
    const memory = store.listMemory(s.user_id).filter(m => m.status === 'active')
      .map(m => ({ key: m.key ?? m.id, value: m.text, ...(m.evidence ? { evidence: m.evidence } : {}) }));
    return { id: s.id, messages: s.messages, concern: s.concern, plan: s.plan, memory, preference: null };
  }

  function command(s: ChatSession, text: string): string | null {
    const c = normalize(text);
    if (c === 'borrar') {
      store.removeMemory(s.user_id, m => m.source !== 'chat');
      s.messages = []; s.concern = ''; s.plan = null;
      return 'Borré esta conversación y lo que aprendí en el chat. No borra mensajes de tu teléfono ni de WhatsApp.';
    }
    if (c === 'nuevo') {
      s.concern = ''; s.plan = null;
      return 'Empezamos con otro pendiente. Conservo lo que ya sé de ti.';
    }
    if (c === 'memoria' || c === 'resumen') {
      const mem = store.listMemory(s.user_id).filter(m => m.status === 'active').map(m => m.text);
      return [s.concern ? `Pendiente: ${s.concern}` : 'No hay un pendiente anotado.', ...mem, s.plan?.nextStep].filter(Boolean).join('\n\n');
    }
    return null;
  }

  function localAnswer(text: string): ChatAnswer {
    const plan = { title: 'Déjalo listo para retomar', nextStep: 'Dedica 5 minutos mañana a escribir el primer paso y cuándo lo retomarás.', minutes: 5 };
    return { reply: `Lo dejamos anotado: «${text}». ${plan.nextStep}`, concern: text.slice(0, 300), plan, updates: [], forget: [] };
  }

  async function process(sessionId: string, text: string, requestId: string): Promise<SessionView> {
    const s = load(sessionId);
    if (s.processed.includes(requestId)) return view(sessionId);
    // A failed attempt with the same id is replaced, not duplicated.
    s.messages = s.messages.filter(m => m.id !== requestId && m.id !== `${requestId}:reply`);
    s.messages.push({ id: requestId, role: 'user', text });

    const fixed = command(s, text);
    let reply: ChatMessage;
    if (fixed !== null) {
      reply = { id: `${requestId}:reply`, role: 'assistant', text: fixed, inference: { engine: 'command' } };
    } else {
      try {
        const answer = runner
          ? parseChatAnswer(await runner(buildChatPrompt(store.getProfile(s.user_id), { ...s, messages: s.messages.slice(0, -1) }, selectMemory(store.listMemory(s.user_id)), text), CHAT_SCHEMA), text)
          : localAnswer(text);
        s.concern = answer.concern;
        s.plan = answer.plan;
        for (const key of answer.forget) store.removeMemory(s.user_id, m => m.source !== 'chat' || m.key !== key);
        for (const u of answer.updates) {
          store.upsertMemory({
            id: randomUUID(), user_id: s.user_id, kind: u.kind, text: u.value, source: 'chat', status: 'active',
            created_at: new Date(now()).toISOString(), key: u.key, evidence: u.evidence,
          });
        }
        reply = { id: `${requestId}:reply`, role: 'assistant', text: answer.reply, inference: { engine: runner ? 'codex' : 'rules', model } };
      } catch (error) {
        // Visible failure, previous context kept, and the same requestId can be retried.
        s.messages.push({
          id: `${requestId}:reply`, role: 'assistant',
          text: 'No pude responder ahora. Tu mensaje quedó guardado; reintenta en un momento.',
          inference: { engine: 'unavailable', model, error: (error as Error).message.slice(0, 300) },
        });
        s.messages = s.messages.slice(-MAX_MESSAGES);
        store.saveChat(s);
        return view(sessionId);
      }
    }
    s.messages.push(reply);
    s.messages = s.messages.slice(-MAX_MESSAGES);
    s.processed = [...s.processed, requestId].slice(-500);
    store.saveChat(s);
    return view(sessionId);
  }

  function send(sessionId: string, input: unknown): Promise<SessionView> {
    const v = (input ?? {}) as Record<string, unknown>;
    if (typeof v.text !== 'string' || !v.text.trim()) throw new InputError('Falta text.');
    if (v.text.length > 2000) throw new InputError('El mensaje supera 2000 caracteres.');
    if (typeof v.requestId !== 'string' || !UUID.test(v.requestId)) throw new InputError('requestId debe ser un UUID.');
    const text = v.text.trim();
    const requestId = v.requestId;
    // One turn at a time per session, in arrival order.
    const previous = queues.get(sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => process(sessionId, text, requestId));
    queues.set(sessionId, next);
    void next.finally(() => {
      if (queues.get(sessionId) === next) queues.delete(sessionId);
    }).catch(() => {});
    return next;
  }

  return { view, send };
}

export type Chat = ReturnType<typeof createChat>;
