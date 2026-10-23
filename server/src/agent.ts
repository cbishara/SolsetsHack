import type { AgentContext, Classification, IncomingMessage, Verdict } from './contract.ts';

// The agent (classify + decide) belongs to Quito in agent/. server/ only calls
// this interface. Until agent/ exists, a conservative stand-in is used so the
// whole flow runs locally: "when in doubt, wake".
export interface Agent {
  classify(message: IncomingMessage, context: AgentContext): Promise<Classification>;
  decide(classification: Classification, context: AgentContext): Promise<Verdict>;
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
