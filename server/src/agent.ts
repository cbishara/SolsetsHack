import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AgentContext, Category, Classification, FeedItem, IncomingMessage, Verdict } from './contract.ts';
import { decideForServer } from './policy.ts';

// The agent (classify + decide) belongs to Quito in agent/. server/ only calls
// this interface. Until agent/ exists, a conservative stand-in is used so the
// whole flow runs locally: "when in doubt, wake".
export interface Agent {
  classify(message: IncomingMessage, context: AgentContext): Promise<Classification>;
  decide(classification: Classification, context: AgentContext, message?: IncomingMessage): Promise<Verdict>;
}

const URGENT = /caíd|caid|no carga|no pueden entrar|sin servicio|producci[oó]n|p1|seguridad|respaldo.*fall|fall[oó].*respaldo|xmrig/i;
const ROUTINE = /ticket|clave|contraseña|usuario|impresora|t[oó]ner|certificado|cuando despiertes/i;
const CHAT = /partido|jaja|gracias|buenas noches|👍/i;

export const stubAgent: Agent = {
  async classify(message) {
    const text = message.text;
    const base = { messageId: message.id, incidentKey: message.id };
    if (URGENT.test(text)) return { ...base, decision: 'wake', reason: 'Parece una caída o un tema de seguridad.', isNew: false, confidence: 0.8 };
    if (CHAT.test(text)) return { ...base, decision: 'noise', reason: 'Conversación del grupo.', isNew: false, confidence: 0.9 };
    if (ROUTINE.test(text)) return { ...base, decision: 'report', reason: 'Solicitud de rutina, puede esperar.', isNew: false, confidence: 0.85 };
    return { ...base, decision: 'wake', reason: 'No reconozco este aviso, te despierto por precaución.', isNew: true, confidence: 0.4 };
  },
  async decide(c, context) {
    const wake = c.decision === 'wake' || c.isNew || c.confidence < 0.7;
    const why: Verdict['why'] = c.isNew ? 'new' : c.confidence < 0.7 ? 'low_confidence' : wake ? 'urgent' : 'not_urgent';
    return { ...c, decision: wake ? 'wake' : c.decision, wouldWake: wake && context.night.onCall !== false, why: context.night.onCall === false && wake ? 'off_duty' : why };
  },
};

/** Used when the agent throws: the message must never be lost or silenced. */
export function fallbackVerdict(message: IncomingMessage): Verdict {
  return {
    messageId: message.id,
    decision: 'wake',
    reason: 'No pude clasificar este aviso, te despierto por precaución.',
    isNew: true,
    confidence: 0,
    incidentKey: message.id,
    wouldWake: true,
    why: 'low_confidence',
  };
}

// HTTP agent (contract app v2, #61) ----------------------------------------------
// server/ calls the `agent` service over HTTP (POST /v1/app/classify). It never
// imports agent/ code nor runs Codex. /v1/app/classify only accepts synthetic
// data (source 'simulated'), so real WhatsApp or email messages are classified
// by the conservative stand-in above and never leave the server.

export type HttpAgentOptions = {
  url: string;
  token?: string;
  /** Single-user demo: the owner id the agent keys memory and feedback by. */
  userId: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

const MAX_RECENT = 30;
const MAX_CATEGORIES = 30;

const classifyResult = z.object({
  decision: z.enum(['wake', 'report', 'noise']),
  reason: z.string().min(1).max(2000),
  isNew: z.boolean(),
  confidence: z.number().min(0).max(1),
  incidentKey: z.string().min(1).max(200),
  categoryId: z.string().max(100).nullable().optional(),
  summary: z.string().max(2000).optional(),
  context: z.string().max(4000).optional(),
});

/** Active categories only: suggested ones wait for the person and never reach the model. */
export const activeCategories = (categories: Category[] = []) => categories.filter((c) => c.status === 'active');

/**
 * Up to 30 distinct incidents, newest per key, so the agent can group a rephrased
 * report with the one that already woke Rodrigo. Only synthetic (simulated)
 * messages are sent: real messages never leave the server.
 */
export function recentIncidents(recent: FeedItem[], userId: string) {
  const seen = new Set<string>();
  const out: { userId: string; incidentKey: string; text: string; group?: string; receivedAt: string }[] = [];
  for (const item of [...recent].sort((a, b) => Date.parse(b.message.receivedAt) - Date.parse(a.message.receivedAt))) {
    if (out.length >= MAX_RECENT) break;
    if (item.message.source !== 'simulated' || !item.incidentKey || seen.has(item.incidentKey)) continue;
    seen.add(item.incidentKey);
    out.push({
      userId, incidentKey: item.incidentKey.slice(0, 200), text: item.message.text.slice(0, 2000),
      ...(item.message.group ? { group: item.message.group.slice(0, 500) } : {}), receivedAt: item.message.receivedAt,
    });
  }
  return out;
}

/** The exact body of POST /v1/app/classify (agent/APP-INTEGRATION.md). */
export function classifyRequest(message: IncomingMessage, context: AgentContext, userId: string) {
  return {
    userId,
    requestId: randomUUID(),
    ownerVerified: true,
    synthetic: true,
    message: {
      id: message.id, externalId: message.externalId, source: message.source, sender: message.sender.slice(0, 120) || 'Sin nombre',
      ...(message.group ? { group: message.group } : {}), text: message.text, receivedAt: message.receivedAt,
    },
    recent: recentIncidents(context.recent, userId),
    categories: activeCategories(context.categories).slice(0, MAX_CATEGORIES).map((c) => ({
      id: c.id, name: c.name, description: c.description, action: c.action, wakeAtNight: c.wakeAtNight,
      status: c.status, origin: c.origin, color: c.color, icon: c.icon, createdAt: c.createdAt,
    })),
  };
}

/** Classifies over HTTP; any error or timeout throws so the guard wakes with fallbackVerdict. */
export function createHttpAgent({ url, token, userId, timeoutMs = 30_000, fetch: fetcher = fetch }: HttpAgentOptions): Agent {
  const endpoint = `${url.replace(/\/+$/, '')}/v1/app/classify`;
  return {
    async classify(message, context) {
      if (message.source !== 'simulated') return stubAgent.classify(message, context);
      const res = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(classifyRequest(message, context, userId)),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`El agente respondió ${res.status}.`);
      const out = classifyResult.parse(await res.json());
      return { ...out, messageId: message.id };
    },
    async decide(c, context, message) {
      // Resolve the category from the server's own list: an unknown or suggested id counts as no category.
      const category = c.categoryId ? activeCategories(context.categories).find((x) => x.id === c.categoryId) : undefined;
      const verdict = decideForServer(c, { ...context, category }, message?.receivedAt ?? new Date().toISOString());
      return c.categoryId !== undefined ? { ...verdict, categoryId: category ? category.id : null } : verdict;
    },
  };
}
