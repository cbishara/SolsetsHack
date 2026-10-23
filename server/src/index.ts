import { stubAgent } from './agent.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { Guard } from './guard.ts';
import { startEmailPolling } from './sources/email.ts';
import { PostgresStore } from './store/postgres.ts';
import { MemoryStore, type Store } from './store/store.ts';

const config = loadConfig();
const store: Store = config.databaseUrl ? await PostgresStore.connect(config.databaseUrl) : new MemoryStore();
const guard = new Guard(store, stubAgent);

if (config.email) startEmailPolling(guard, config.email);
if (config.twoChat.webhookToken) await guard.setSource('whatsapp', 'whatsapp', 'unknown', 'Esperando el primer evento de 2Chat');

createApp(guard, config).listen(config.port, '0.0.0.0', () => {
  console.log(
    `solsets-server · puerto ${config.port} · base ${config.databaseUrl ? 'postgres' : 'memoria'} · ` +
      `whatsapp ${config.twoChat.webhookToken ? 'activo' : 'apagado'} · correo ${config.email ? 'activo' : 'apagado'}`,
  );
});
