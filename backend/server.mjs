import 'dotenv/config';
import express from 'express';
import { z } from 'zod';
import { createHmac, timingSafeEqual, randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { initializeStore, getState, mutate, storageMode } from './store.mjs';
import { scenarios } from './seed.mjs';
import { integrations, googleClient, saveGoogleTokens, loadGoogleTokens, googleFetch, createCalendarAlert, sendWhatsApp } from './integrations.mjs';
import { processMessage } from './processor.mjs';
import { createDisconnectProcessor, disconnectStatus, receiptId } from './disconnect.mjs';

const app = express();
const processDisconnect = createDisconnectProcessor({ getState, mutate, sendWhatsApp });
app.disable('x-powered-by');
const port = Number(process.env.PORT || 3001);
const liveConfigured = Boolean(process.env.KAPSO_API_KEY || process.env.GOOGLE_CLIENT_SECRET || process.env.HERMES_API_KEY);
if (liveConfigured && !process.env.DASHBOARD_PASSWORD) throw new Error('Configura DASHBOARD_PASSWORD antes de habilitar integraciones reales.');
const equal = (a, b) => { const aa = Buffer.from(a || ''), bb = Buffer.from(b || ''); return aa.length === bb.length && timingSafeEqual(aa, bb); };
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'same-origin'); next(); });
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'solsets-sistem' }));

// Signed inbound queue. Acknowledge only after persisting; process outside the webhook response.
app.post('/api/webhooks/kapso', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
 if (!process.env.KAPSO_WEBHOOK_SECRET) return res.status(503).json({ error: 'Webhook no configurado.' });
 const signature = req.get('x-webhook-signature')?.replace(/^sha256=/, '');
 const expected = createHmac('sha256', process.env.KAPSO_WEBHOOK_SECRET).update(req.body).digest('hex');
 if (!equal(signature, expected)) return res.status(401).json({ error: 'Firma inválida.' });
 const payload = JSON.parse(req.body.toString('utf8'));
 const eventName = req.get('x-webhook-event') || payload.type || payload.event;
 if (eventName !== 'whatsapp.message.received') return res.json({ ignored: true });
 if (payload.batch) return res.status(422).json({ error: 'Desactiva buffering para este webhook de demostración.' });
 if (payload.phone_number_id !== process.env.KAPSO_PHONE_NUMBER_ID) return res.status(403).json({ error: 'Número receptor incorrecto.' });
 const message = payload.data?.message || payload.message;
 const conversation = payload.data?.conversation || payload.conversation;
 if (message?.type !== 'text') return res.json({ ignored: true, reason: 'Esta demo recibe solo texto.' });
 const text = message?.text?.body;
 const from = message?.from || conversation?.phone_number;
 if (message?.kapso?.passive || message?.kapso?.direction === 'outbound') return res.json({ ignored: true });
 if (typeof message?.id !== 'string' || !message.id || message.id.length > 250 || typeof text !== 'string' || !text.trim() || typeof from !== 'string') return res.status(422).json({ error: 'Se esperaba un evento Kapso v2 con mensaje de texto, id y remitente.' });
 const allowed = (process.env.KAPSO_ALLOWED_NUMBERS || process.env.RODRIGO_WHATSAPP_NUMBER || '').split(',').map(v => v.trim()).filter(Boolean);
 if (!allowed.includes(from)) return res.json({ ignored: true, reason: 'Número fuera de la demo.' });
 const received = Number(message.timestamp) * 1000;
 const item = { externalId: message.id, source: 'whatsapp', recipient: from, text: text.trim().slice(0, 2000), synthetic: false, receivedAt: Number.isFinite(received) && received > 0 ? new Date(Math.min(received, Date.now())).toISOString() : null };
 await mutate(s => { s.inbox ||= []; if (!s.inbox.some(m => m.externalId === message.id) && !s.disconnectReceipts?.includes(receiptId(item))) s.inbox.push(item); });
 res.json({ accepted: true });
});

// The landing and its compiled assets are public; application data and account
// operations continue through the authentication middleware below.
const distDirectory = resolve('dist');
if (existsSync(resolve(distDirectory, 'index.html'))) {
 app.get(['/', '/demo'], (req, res) => res.sendFile(resolve(distDirectory, 'index.html')));
 app.get('/favicon.svg', (req, res) => res.sendFile(resolve(distDirectory, 'favicon.svg')));
 app.use('/assets', express.static(resolve(distDirectory, 'assets'), { index: false, redirect: false, dotfiles: 'deny' }));
}

app.use((req, res, next) => {
 if (!process.env.DASHBOARD_PASSWORD) return next();
 const [scheme, token] = (req.get('authorization') || '').split(' ');
 const credentials = scheme === 'Basic' ? Buffer.from(token || '', 'base64').toString() : '';
 if (!equal(credentials, `solsets:${process.env.DASHBOARD_PASSWORD}`)) { res.set('WWW-Authenticate', 'Basic realm="Solsets Sistem"'); return res.status(401).send('Accede con el usuario solsets y la contraseña del panel.'); }
 next();
});
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
 if (['POST', 'PATCH', 'DELETE'].includes(req.method) && req.get('origin')) {
  const allowed = [process.env.APP_URL || 'http://localhost:5173', `http://localhost:${port}`, `http://127.0.0.1:${port}`];
  if (!allowed.includes(req.get('origin'))) return res.status(403).json({ error: 'Origen no permitido.' });
 }
 next();
});
app.get('/api/state', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ...getState(), integrations: integrations(), scenarios, storageMode }); });
app.get('/api/disconnect', (req, res) => { res.set('Cache-Control', 'no-store'); res.json(disconnectStatus(getState())); });
app.post('/api/disconnect/messages', async (req, res) => {
 const input = z.object({ text: z.string().trim().min(1).max(2000), requestId: z.uuid() }).strict().parse(req.body);
 const result = await processDisconnect({ text: input.text, externalId: input.requestId, synthetic: true });
 res.json(result);
});
const permission = z.enum(['auto', 'ask', 'never']);
const settingsSchema = z.object({ paused: z.boolean(), shadow: z.boolean(), sleepStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), sleepEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.literal('America/Santiago'), permissions: z.object({ reply: permission, draft: permission, calendar: permission, purchase: permission }) });
app.patch('/api/settings', async (req, res) => { const settings = settingsSchema.parse(req.body); await mutate(s => { s.settings = settings; }); res.json(settings); });
app.post('/api/demo/run', async (req, res) => {
 const { scenario } = z.object({ scenario: z.string() }).parse(req.body);
 const sample = scenarios.find(s => s.id === scenario); if (!sample) return res.status(400).json({ error: 'Escenario no válido.' });
 res.json(await processMessage({ ...sample, synthetic: true }));
});
app.post('/api/messages', async (req, res) => { const input = z.object({ text: z.string().min(1).max(8000), source: z.enum(['whatsapp', 'gmail']).default('whatsapp') }).parse(req.body); res.json(await processMessage({ ...input, synthetic: true, sender: 'Consola de prueba' })); });
app.post('/api/tasks/:id/approve', async (req, res) => {
 const task = getState().tasks.find(t => t.id === req.params.id); if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' });
 if (task.status !== 'approval') return res.status(409).json({ error: 'Esta tarea no está pendiente de aprobación.' });
 if (!task.synthetic) return res.status(409).json({ error: 'Esta acción requiere completar sus datos en el servicio de origen. No se ejecutó ningún cambio.' });
 await mutate(s => { const t = s.tasks.find(t => t.id === req.params.id); t.status = 'resolved'; t.effects.push({ channel: t.source, status: 'simulated' }); });
 res.json({ ok: true, simulated: true });
});
app.post('/api/tasks/:id/feedback', async (req, res) => { const { value } = z.object({ value: z.enum(['correct', 'should-wake', 'should-wait']) }).parse(req.body); const task = getState().tasks.find(t => t.id === req.params.id); if (!task) return res.status(404).json({ error: 'Tarea no encontrada.' }); await mutate(s => { s.feedback.push({ taskId: task.id, text: task.text, value, createdAt: new Date().toISOString() }); s.feedback = s.feedback.slice(-100); }); res.json({ ok: true }); });

const oauthStates = new Map();
app.get('/auth/google', async (req, res) => {
 if (!integrations().find(i => i.id === 'gmail').ready) return res.status(503).send('Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY y APP_URL en Railway.');
 const state = randomBytes(32).toString('hex'); const client = googleClient(); const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
 for (const [key, value] of oauthStates) if (value.expires < Date.now()) oauthStates.delete(key);
 oauthStates.set(state, { codeVerifier, expires: Date.now() + 600000 });
 res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: (process.env.APP_URL || '').startsWith('https:'), maxAge: 600000, path: '/auth' });
 res.redirect(client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', state, code_challenge: codeChallenge, code_challenge_method: 'S256', scope: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/calendar.events'] }));
});
app.get('/auth/google/callback', async (req, res) => {
 const state = String(req.query.state || ''); const saved = oauthStates.get(state); oauthStates.delete(state);
 const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('oauth_state='))?.slice(12);
 if (!saved || saved.expires < Date.now() || !equal(cookie, state) || typeof req.query.code !== 'string') return res.status(400).send('Autorización vencida o inválida. Conecta Google nuevamente.');
 const { tokens } = await googleClient().getToken({ code: req.query.code, codeVerifier: saved.codeVerifier }); await saveGoogleTokens(tokens);
 res.clearCookie('oauth_state', { path: '/auth' }); res.redirect('/app?connected=google');
});
app.post('/api/google/sync', async (req, res) => {
 const response = await googleFetch('gmail/v1/users/me/messages?maxResults=10&q=' + encodeURIComponent('is:unread subject:[SOLSETS-DEMO]'));
 let count = 0;
 for (const item of response.messages || []) { if (getState().tasks.some(t => t.externalId === `gmail:${item.id}`)) continue; const mail = await googleFetch(`gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata`); const header = name => mail.payload?.headers?.find(h => h.name.toLowerCase() === name)?.value; await processMessage({ source: 'gmail', externalId: `gmail:${item.id}`, threadId: mail.threadId, sender: header('from') || 'Correo de prueba', subject: header('subject') || 'Correo de prueba', text: mail.snippet || header('subject') || '', synthetic: false }); count++; }
 res.json({ count });
});
app.post('/api/google/calendar-test', async (req, res) => { const event = await createCalendarAlert('Solsets · Prueba de notificación', 'Evento de prueba. Confirma la notificación en tu teléfono y reloj.'); res.json({ url: event.htmlLink, message: 'Evento creado para dentro de dos minutos. La recepción en el reloj todavía debe verificarse.' }); });

if (existsSync(resolve('dist/index.html'))) { app.use(express.static(resolve('dist'))); app.get('/{*path}', (req, res) => res.sendFile(resolve('dist/index.html'))); }
app.use((err, req, res, next) => { if (res.headersSent) return next(err); const validation = err instanceof z.ZodError || err instanceof SyntaxError; res.status(validation ? 400 : 500).json({ error: validation ? 'Datos inválidos. Revisa los campos enviados.' : err.message || 'No se pudo completar la acción.' }); });
await initializeStore(); await loadGoogleTokens();
let draining = false;
setInterval(async () => {
 if (draining || getState().settings.paused) return;
 draining = true;
 try {
  for (const item of getState().inbox || []) {
   if (getState().settings.paused) break;
   await processDisconnect(item);
   await mutate(s => { s.inbox = s.inbox.filter(m => m.externalId !== item.externalId); });
  }
 } catch { console.error('No se pudo procesar un mensaje; permanece en la cola.'); }
 finally { draining = false; }
}, 2000).unref();
app.listen(port, '0.0.0.0', () => console.log(`Solsets Sistem · http://localhost:${port} · almacenamiento ${storageMode}`));
