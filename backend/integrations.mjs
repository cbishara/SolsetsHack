import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';
import { readSecret, saveSecret } from './store.mjs';

let googleTokens = null;
export function googleClient() { return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.APP_URL || 'http://localhost:5173'}/auth/google/callback`); }
function encryptionKey() { const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || '', 'hex'); if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY debe tener 64 caracteres hexadecimales.'); return key; }
export async function saveGoogleTokens(tokens) {
 const merged = { ...googleTokens, ...tokens };
 const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
 const data = Buffer.concat([cipher.update(JSON.stringify(merged), 'utf8'), cipher.final()]);
 const encrypted = [iv, cipher.getAuthTag(), data].map(x => x.toString('base64')).join('.');
 await saveSecret('google', encrypted);
 googleTokens = merged;
}
export async function loadGoogleTokens() {
 const encrypted = await readSecret('google');
 if (!encrypted) return;
 const [iv, tag, data] = encrypted.split('.').map(x => Buffer.from(x, 'base64'));
 const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv); cipher.setAuthTag(tag);
 googleTokens = JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
}
export async function googleFetch(path, options = {}) {
 if (!googleTokens) throw new Error('Conecta una cuenta Google de prueba primero.');
 const client = googleClient(); client.setCredentials(googleTokens);
 const { token } = await client.getAccessToken();
 if (client.credentials.access_token !== googleTokens.access_token) await saveGoogleTokens(client.credentials);
 const response = await fetch(`https://www.googleapis.com/${path}`, { ...options, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } });
 if (!response.ok) throw new Error(`Google respondió ${response.status}. Revisa permisos y conexión.`);
 return response.status === 204 ? {} : response.json();
}
export async function sendWhatsApp(to, body) {
 if (!process.env.KAPSO_API_KEY || !process.env.KAPSO_PHONE_NUMBER_ID) throw new Error('Kapso no está configurado.');
 if (!to) throw new Error('Falta el número de destino.');
 const client = new WhatsAppClient({ baseUrl: 'https://api.kapso.ai/meta/whatsapp', kapsoApiKey: process.env.KAPSO_API_KEY });
 return client.messages.sendText({ phoneNumberId: process.env.KAPSO_PHONE_NUMBER_ID, to, body });
}
export function calendarEvent(summary, description, start = new Date(Date.now() + 120000)) {
 return { summary, description, start: { dateTime: start.toISOString(), timeZone: 'America/Santiago' }, end: { dateTime: new Date(start.getTime() + 600000).toISOString(), timeZone: 'America/Santiago' }, reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] } };
}
export async function createCalendarAlert(title, text) { return googleFetch(`calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary')}/events`, { method: 'POST', body: JSON.stringify(calendarEvent(title, text)) }); }
export function integrations() {
 const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY);
 return [
  { id: 'whatsapp', name: 'WhatsApp', subtitle: 'Tu canal de todos los días', ready: Boolean(process.env.KAPSO_API_KEY && process.env.KAPSO_PHONE_NUMBER_ID && process.env.KAPSO_WEBHOOK_SECRET), connected: false, detail: 'Configura Kapso y registra el webhook. El estado de entrega se registra por cada envío.', keys: ['KAPSO_API_KEY', 'KAPSO_PHONE_NUMBER_ID', 'KAPSO_WEBHOOK_SECRET', 'RODRIGO_WHATSAPP_NUMBER'], docs: 'https://docs.kapso.ai/docs/platform/webhooks/overview' },
  { id: 'gmail', name: 'Gmail', subtitle: 'Correos que pueden esperar', ready: googleReady, connected: Boolean(googleTokens), detail: 'OAuth con una cuenta de prueba. Lectura y preparación de borradores; sin enviar correos automáticamente.', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'APP_URL'], docs: 'https://console.cloud.google.com/apis/credentials' },
  { id: 'calendar', name: 'Google Calendar', subtitle: 'Tus horarios, en un lugar', ready: googleReady, connected: Boolean(googleTokens), detail: 'Crea eventos con recordatorio. La recepción en el reloj depende del dispositivo y su configuración.', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALENDAR_ID'], docs: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com' },
  { id: 'hermes', name: 'Hermes Agent', subtitle: 'El motor de tu asistente', ready: Boolean(process.env.HERMES_BASE_URL && process.env.HERMES_API_KEY), connected: false, detail: 'Servicio privado en Docker. El panel usa su API; los permisos se validan antes de actuar.', keys: ['HERMES_BASE_URL', 'HERMES_API_KEY'], docs: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server' },
 ];
}
