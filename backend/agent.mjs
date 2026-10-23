import { readFile } from 'node:fs/promises';
import { classificationSchema, demoClassify } from '../classifier/policy.mjs';
const prompt = await readFile(new URL('../classifier/system-prompt.txt', import.meta.url), 'utf8');
export async function classify(text, state, synthetic) {
 if (synthetic) return { ...demoClassify(text), engine: 'demo' };
 if (!process.env.HERMES_BASE_URL || !process.env.HERMES_API_KEY) throw new Error('Hermes no está configurado.');
 // The API retains Hermes tools despite client prompts. Refuse an unsafe profile.
 const capabilityResponse = await fetch(`${process.env.HERMES_BASE_URL.replace(/\/$/, '')}/toolsets`, { signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.HERMES_API_KEY}` } });
 if (!capabilityResponse.ok) throw new Error('No se pudieron comprobar las herramientas de Hermes.');
 const toolsets = await capabilityResponse.json();
 if (!Array.isArray(toolsets) || toolsets.some(t => t.enabled && (!Array.isArray(t.tools) || t.tools.length > 0))) throw new Error('Desactiva las herramientas del perfil clasificador de Hermes antes de procesar mensajes.');
 const response = await fetch(`${process.env.HERMES_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
  method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.HERMES_API_KEY}` },
  body: JSON.stringify({ model: 'hermes-agent', stream: false, messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify({ untrustedMessage: text, feedbackExamples: state.feedback.slice(-5).map(f => ({ text: f.text, feedback: f.value })), knownProcedure: 'VPN: solicitar código de error y dirigir al portal de autoservicio; no solicitar contraseñas.' }) }] }),
 });
 if (!response.ok) throw new Error(`Hermes respondió ${response.status}.`);
 const body = await response.json();
 const choice = body.choices?.[0];
 if (choice?.finish_reason !== 'stop') throw new Error('Hermes no completó la clasificación.');
 const content = choice.message?.content?.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
 return { ...classificationSchema.parse(JSON.parse(content)), engine: 'hermes' };
}
