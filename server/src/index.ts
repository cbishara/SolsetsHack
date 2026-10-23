import { stubAgent } from './agent.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { Guard } from './guard.ts';
import { startEmailPolling } from './sources/email.ts';
import { PostgresStore } from './store/postgres.ts';
import { MemoryStore, type Store } from './store/store.ts';
import { FileStore } from './store/file.ts';
import { UnipileClient } from './unipile/client.ts';
import { WhatsAppService } from './unipile/service.ts';
import { loadMultiUserConfig } from './multiuser/config.ts';
import { PostgresMultiUserStore } from './multiuser/postgres.ts';
import { IdentityService } from './multiuser/identity.ts';
import { CatalogService } from './multiuser/catalog.ts';
import { UnipileMultiUserProvider } from './multiuser/provider.ts';
import { multiUserRouter } from './multiuser/routes.ts';
import { SyntheticAgentQueue, workerRouter, fixtureRouter } from './multiuser/agent-queue.ts';

const config = loadConfig();
const multiConfig = loadMultiUserConfig(process.env);
const multiStore = multiConfig ? await PostgresMultiUserStore.connect(multiConfig.databaseUrl) : undefined;
const provider = multiConfig ? new UnipileMultiUserProvider(multiConfig.dsn, multiConfig.apiKey, multiConfig.botAccountId) : undefined;
const identity = multiConfig && multiStore ? new IdentityService(multiStore, { secret: multiConfig.identitySecret }) : undefined;
const queue = multiConfig?.workerToken && multiStore && identity ? new SyntheticAgentQueue(multiStore, identity) : undefined;
const bridge = queue && identity && multiConfig?.workerToken ? {
  worker: workerRouter(queue, { workerToken: multiConfig.workerToken }), demo: fixtureRouter(queue, identity),
} : undefined;
const multiUser = multiConfig && multiStore && provider && identity ? multiUserRouter({
  store: multiStore, identity, provider, catalog: new CatalogService(multiStore, identity, provider),
  publicUrl: multiConfig.publicUrl, webhookSecret: multiConfig.webhookSecret, rateSecret: multiConfig.identitySecret,
}) : undefined;
const store: Store = config.databaseUrl ? await PostgresStore.connect(config.databaseUrl) : config.localDataFile ? await FileStore.connect(config.localDataFile) : new MemoryStore();
const guard = new Guard(store, stubAgent);
const whatsapp = config.unipile ? new WhatsAppService(store, new UnipileClient(config.unipile.dsn, config.unipile.apiKey, config.unipile.accountId)) : undefined;

if (config.email) startEmailPolling(guard, config.email);
if (config.twoChat.webhookToken) await guard.setSource('whatsapp', 'whatsapp', 'unknown', 'Esperando el primer evento de 2Chat');

const server = createApp(guard, config, whatsapp, multiUser, bridge).listen(config.port, '0.0.0.0', () => {
  console.log(
    `solsets-server · puerto ${config.port} · base ${config.databaseUrl ? 'postgres' : config.localDataFile ? 'archivo local' : 'memoria'} · ` +
      `whatsapp ${whatsapp ? 'Unipile configurado (verificar /api/whatsapp/status)' : config.twoChat.webhookToken ? '2Chat' : 'apagado'} · correo ${config.email ? 'activo' : 'apagado'}`,
  );
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
  server.close(() => { Promise.all([store.close(), multiStore?.close()]).then(() => process.exit(0)).catch(() => process.exit(1)); });
});
