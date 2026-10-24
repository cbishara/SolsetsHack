import { createHttpAgent, stubAgent } from './agent.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { demoCategories } from './fixtures.ts';
import { Guard } from './guard.ts';
import { startEmailPolling } from './sources/email.ts';
import { PostgresStore } from './store/postgres.ts';
import { MemoryStore, type Store } from './store/store.ts';
import { FileStore } from './store/file.ts';
import { UnipileClient } from './unipile/client.ts';
import { WhatsAppService } from './unipile/service.ts';

const config = loadConfig();
const store: Store = config.databaseUrl ? await PostgresStore.connect(config.databaseUrl) : config.localDataFile ? await FileStore.connect(config.localDataFile) : new MemoryStore();
const guard = new Guard(store, config.agent ? createHttpAgent(config.agent) : stubAgent);
if (config.allowSimulate) await guard.seedCategories(demoCategories);
const whatsapp = config.unipile ? new WhatsAppService(store, new UnipileClient(config.unipile.dsn, config.unipile.apiKey, config.unipile.accountId)) : undefined;

if (config.email) startEmailPolling(guard, config.email);
if (config.twoChat.webhookToken) await guard.setSource('whatsapp', 'whatsapp', 'unknown', 'Esperando el primer evento de 2Chat');

const server = createApp(guard, config, whatsapp).listen(config.port, '0.0.0.0', () => {
  console.log(
    `solsets-server · puerto ${config.port} · base ${config.databaseUrl ? 'postgres' : config.localDataFile ? 'archivo local' : 'memoria'} · ` +
      `whatsapp ${whatsapp ? 'Unipile configurado (verificar /api/whatsapp/status)' : config.twoChat.webhookToken ? '2Chat' : 'apagado'} · correo ${config.email ? 'activo' : 'apagado'} · ` +
      `agente ${config.agent ? `HTTP ${new URL(config.agent.url).host} (${config.agent.allowWhatsApp ? 'simulated y whatsapp' : 'solo mensajes simulated'})` : 'reemplazo local'}`,
  );
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
  server.close(() => { store.close().then(() => process.exit(0)).catch(() => process.exit(1)); });
});
