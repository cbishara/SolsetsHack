import { randomUUID, createHash } from 'node:crypto';
import { classify } from './agent.mjs';
import { applyPolicy } from '../classifier/policy.mjs';
import { getState, mutate } from './store.mjs';
import { sendWhatsApp, createCalendarAlert, googleFetch } from './integrations.mjs';

let processing = Promise.resolve();
export function processMessage(input) { const result = processing.then(() => processOne(input)); processing = result.catch(() => {}); return result; }
async function processOne(input) {
 const existing = getState().tasks.find(t => input.externalId && t.externalId === input.externalId);
 if (existing) return existing;
 let classification;
 try { classification = await classify(input.text, getState(), input.synthetic); }
 catch { classification = { decision: 'DESPERTAR', reason: 'El motor no está disponible o no devolvió una clasificación válida. Revisión humana necesaria.', isNew: true, confidence: 0, reply: 'No pude evaluar este mensaje. Necesito que lo revises; no ejecuté cambios.', action: 'none', engine: 'fallback' }; }
 const state = getState();
 const key = input.incidentKey || createHash('sha256').update([input.source, input.recipient || input.sender, input.text.trim().toLowerCase().replace(/\s+/g, ' ')].join('|')).digest('hex');
 const duplicate = Boolean(state.lastWake[key] && Date.now() - state.lastWake[key] < 30 * 60000);
 const result = applyPolicy(classification, state.settings, { duplicate });
 const task = { id: randomUUID(), title: input.subject || input.text.slice(0, 70), text: input.text, source: input.source, sender: input.sender || 'Contacto de prueba', recipient: input.recipient, externalId: input.externalId, threadId: input.threadId, synthetic: Boolean(input.synthetic), createdAt: new Date().toISOString(), ...result, engine: classification.engine, effects: [], status: state.settings.paused ? 'queued' : result.decision === 'DESPERTAR' ? (duplicate ? 'queued' : 'escalated') : result.blocked ? 'blocked' : result.requiresApproval ? 'approval' : state.settings.shadow ? 'shadow' : 'queued' };
 await mutate(s => { s.tasks.unshift(task); s.tasks = s.tasks.slice(0, 500); });
 if (result.wake) {
  if (input.synthetic) { task.effects.push({ channel: 'whatsapp', status: 'simulated' }); if (state.settings.permissions.calendar === 'auto') task.effects.push({ channel: 'calendar', status: 'simulated' }); }
  else {
   for (const [channel, action] of [['whatsapp', () => sendWhatsApp(process.env.RODRIGO_WHATSAPP_NUMBER, `${task.reply}\nMotivo: ${task.reason}`)], ['calendar', () => createCalendarAlert('Solsets · Revisar incidente de guardia', task.reason)]]) {
    if (channel === 'calendar' && state.settings.permissions.calendar !== 'auto') continue;
    try { await action(); task.effects.push({ channel, status: 'accepted' }); } catch (error) { task.effects.push({ channel, status: 'failed', error: error.message }); }
   }
  }
  if (task.effects.some(e => ['accepted', 'simulated'].includes(e.status))) await mutate(s => { s.lastWake[key] = Date.now(); });
 } else if (result.execute && !duplicate) {
  if (input.synthetic) { task.status = result.action === 'none' ? 'queued' : 'resolved'; task.effects.push({ channel: task.source, status: 'simulated' }); }
  else if (result.action === 'reply' && input.source === 'whatsapp') {
   try { await sendWhatsApp(input.recipient, result.reply); task.status = 'resolved'; task.effects.push({ channel: 'whatsapp', status: 'accepted' }); } catch (e) { task.status = 'failed'; task.effects.push({ channel: 'whatsapp', status: 'failed', error: e.message }); }
  } else if (['reply', 'draft'].includes(result.action) && input.source === 'gmail') {
   // Gmail content is kept as a draft; no arbitrary recipient can be injected via a header.
   const raw = Buffer.from(`Subject: Solsets - borrador de respuesta\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${result.reply}`).toString('base64url');
   try { await googleFetch('gmail/v1/users/me/drafts', { method: 'POST', body: JSON.stringify({ message: { raw, threadId: input.threadId } }) }); task.status = 'draft'; task.effects.push({ channel: 'gmail', status: 'accepted' }); } catch (e) { task.status = 'failed'; task.effects.push({ channel: 'gmail', status: 'failed', error: e.message }); }
  } else task.status = 'approval';
 }
 await mutate(s => { const index = s.tasks.findIndex(t => t.id === task.id); s.tasks[index] = task; s.activity.unshift({ id: randomUUID(), title: task.title, description: task.reason, type: task.decision === 'DESPERTAR' ? 'alert' : 'success', createdAt: task.createdAt }); s.activity = s.activity.slice(0, 200); });
 return task;
}
