import { loadConfig } from '../src/config.ts';
import { UnipileClient } from '../src/unipile/client.ts';

try {
  const config = loadConfig();
  if (!config.unipile) throw new Error('Falta UNIPILE_API_KEY en server/.env.local o en las variables del servidor.');
  const u = config.unipile;
  const client = new UnipileClient(u.dsn, u.apiKey, u.accountId);
  const [command = 'check', chatId, cursor] = process.argv.slice(2);
  if (command === 'check') {
    const account = await client.account();
    if (account.id !== u.accountId || account.type !== 'WHATSAPP') throw new Error('La cuenta configurada no corresponde a WhatsApp.');
    const sources = Array.isArray(account.sources) ? account.sources as { status?: string }[] : [];
    console.log(JSON.stringify({ account: 'WhatsApp', statuses: sources.map((s) => s.status ?? 'UNKNOWN'), verified: true }, null, 2));
  } else if (command === 'subscribe') {
    if (!u.publicUrl) throw new Error('Configura PUBLIC_URL con el servidor HTTPS desplegado.');
    console.log(JSON.stringify(await client.subscribe(u.publicUrl, u.webhookSecret), null, 2));
  } else {
    const base = u.publicUrl || `http://127.0.0.1:${config.port}`;
    const chatPath = `/api/whatsapp/chats/${encodeURIComponent(chatId ?? '')}`;
    let path: string, method = 'GET', body: unknown;
    if (command === 'chats') path = '/api/whatsapp/chats' + (chatId ? `?cursor=${encodeURIComponent(chatId)}` : '');
    else if (command === 'status') path = '/api/whatsapp/status';
    else if (chatId && ['select', 'unselect'].includes(command)) { path = `${chatPath}/selection`; method = 'PUT'; body = { selected: command === 'select' }; }
    else if (chatId && command === 'import') { path = `${chatPath}/import`; method = 'POST'; body = { cursor }; }
    else if (chatId && command === 'inbox') path = `${chatPath}/messages`;
    else throw new Error('Usa: check | status | chats [cursor] | select ID | unselect ID | import ID [cursor] | inbox ID | subscribe');
    const response = await fetch(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(25_000), headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`El servidor devolvió HTTP ${response.status}. Comprueba que esté iniciado y configurado.`);
    console.log(JSON.stringify(await response.json(), null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo completar la conexión.');
  process.exitCode = 1;
}
