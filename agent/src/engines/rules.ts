import type { Classification, IncomingMessage } from '../contract.ts';
import type { Engine } from './engine.ts';

// Fixed rules. Run locally without any key, and take over when the model fails.
// Order matters: wake-up signals are checked first, so "gracias, se cayó de nuevo" still wakes.

const WAKE = /\burgent[ea]?\b|\bse cay(o|ó|eron)|ca[ií]d[oa]s?\b|sin servicio|no (funciona|responde|carga) (nada|el sistema|la plataforma)|\bp1\b|\bsev ?1\b|\bdown\b|\boutage\b|incendio|ransomware|hacke|filtraci[oó]n|brecha de seguridad/i;
const NOT_URGENT = /no es urgente|nada urgente|sin urgencia|no urge/gi;
const NOT_URGENT_ONCE = new RegExp(NOT_URGENT.source, 'i');
const MORNING = /\bmañana\b|\bmanana\b|cuando puedas|la pr[oó]xima semana|sin apuro|\b(lunes|martes|mi[eé]rcoles|jueves|viernes)\b/i;
const NOISE = /^\s*(?:(?:ok(?:ey|ay)?|okis|gracias|muchas gracias|recibido|listo|dale|perfecto|vale)\b|👍|🙏|✅)|ya (funcion[oó]|qued[oó]|est[aá] (ok|listo|bien))|newsletter|bolet[ií]n|promoci[oó]n|descuento|unsubscribe|darse de baja/i;

export function classifyByRules(text: string): Classification {
  const saysNotUrgent = NOT_URGENT_ONCE.test(text);
  if (WAKE.test(text.replace(NOT_URGENT, ''))) {
    return { decision: 'DESPERTAR', reason: 'Habla de una caída, una urgencia o un riesgo de seguridad.', is_new: false, confidence: 0.85 };
  }
  if (NOISE.test(text)) {
    return { decision: 'RUIDO', reason: 'Es una confirmación o un aviso que no pide nada.', is_new: false, confidence: 0.8 };
  }
  if (saysNotUrgent || MORNING.test(text)) {
    return { decision: 'PARTE', reason: 'Es un pedido que puede esperar a la mañana.', is_new: false, confidence: 0.8 };
  }
  return { decision: 'DESPERTAR', reason: 'No reconozco el caso; ante la duda, te despierto.', is_new: true, confidence: 0.3 };
}

export const rulesEngine: Engine = {
  name: 'rules',
  async classify(_prompt: string, message: IncomingMessage) {
    return classifyByRules(message.text);
  },
};
