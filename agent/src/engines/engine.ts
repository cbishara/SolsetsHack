import { isDecision } from '../contract.ts';
import type { Classification, EngineName, IncomingMessage } from '../contract.ts';

/** The model behind the agent. Swapping Codex for an API key means writing another Engine. */
export interface Engine {
  name: EngineName;
  classify(prompt: string, message: IncomingMessage): Promise<Classification>;
}

/** JSON Schema of the engine output (strict: every field required, nothing extra). */
export const CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decision', 'reason', 'is_new', 'confidence'],
  properties: {
    decision: { type: 'string', enum: ['DESPERTAR', 'PARTE', 'RUIDO'] },
    reason: { type: 'string' },
    is_new: { type: 'boolean' },
    confidence: { type: 'number' },
  },
} as const;

export function parseClassification(value: unknown): Classification {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v !== 'object') throw new Error('La respuesta del motor no es un objeto.');
  if (!isDecision(v.decision)) throw new Error(`Decisión inválida: ${String(v.decision)}`);
  if (typeof v.reason !== 'string' || !v.reason.trim()) throw new Error('Falta el motivo.');
  if (typeof v.is_new !== 'boolean') throw new Error('is_new no es booleano.');
  if (typeof v.confidence !== 'number' || Number.isNaN(v.confidence)) throw new Error('confidence no es un número.');
  return {
    decision: v.decision,
    reason: v.reason.trim().split('\n')[0].slice(0, 300),
    is_new: v.is_new,
    confidence: Math.min(1, Math.max(0, v.confidence)),
  };
}
