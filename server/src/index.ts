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
import { LiveAgentQueue, liveClientRouter, liveWorkerRouter } from './multiuser/live-agent.ts';

const config = loadConfig();
const multiConfig = loadMultiUserConfig(process.env);
const multiStore = multiConfig ? await PostgresMultiUserStore.connect(multiConfig.databaseUrl) : undefined;
const provider = multiConfig ? new UnipileMultiUserProvider(multiConfig.dsn, multiConfig.apiKey, multiConfig.botAccountId) : undefined;
const identity = multiConfig && multiStore ? new IdentityService(multiStore, { secret: multiConfig.identitySecret }) : undefined;
const queue = multiConfig?.demoEnabled && multiStore && identity ? new SyntheticAgentQueue(multiStore, identity) : undefined;
const liveQueue = multiConfig && multiStore && identity ? new LiveAgentQueue(multiStore, identity, { realDataEnabled: multiConfig.realDataEnabled }) : undefined;
const bridge = multiConfig && identity ? {
  ...(queue && multiConfig.workerToken ? { worker: workerRouter(queue, { workerToken: multiConfig.workerToken }), demo: fixtureRouter(queue, identity, multiConfig.publicUrl) } : {}),
  ...(liveQueue ? { liveClient: liveClientRouter(liveQueue, identity, multiConfig.publicUrl) } : {}),
  ...(liveQueue && multiConfig.workerToken ? { liveWorker: liveWorkerRouter(liveQueue, { workerToken: multiConfig.workerToken }) } : {}),
} : undefined;
const multiUser = multiConfig && multiStore && provider && identity ? multiUserRouter({
  store: multiStore, identity, provider, catalog: new CatalogService(multiStore, identity, provider),
  publicUrl: multiConfig.publicUrl, webhookSecret: multiConfig.webhookSecret, rateSecret: multiConfig.identitySecret,
  pairingEnabled: multiConfig.pairingEnabled, botQueueEnabled: multiConfig.realDataEnabled,
  agentReadiness: liveQueue ? () => liveQueue.readiness() : undefined,
}) : undefined;
// Multiuser uses sol_identity only; do not even open the pilot's server schema.
const store: Store = multiConfig ? new MemoryStore() : config.databaseUrl ? await PostgresStore.connect(config.databaseUrl) : config.localDataFile ? await FileStore.connect(config.localDataFile) : new MemoryStore();
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
// Durable indexes are drained after restart. A single tick cannot overlap itself; ambiguous
// sends stay uncertain in the queue and are never retried by this loop.
let drain: Promise<void> | undefined;
const timer = liveQueue && provider && multiConfig?.realDataEnabled ? setInterval(() => {
  if (drain) return;
  drain = (async () => {
    await liveQueue.drainBotInbox(provider.botAccountId);
    await liveQueue.dispatchNext(input => provider.sendReply(input));
  })().catch(() => { console.error('[agent-v1] queue tick failed'); }).finally(() => { drain = undefined; });
}, 2000) : undefined;
timer?.unref();
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
  if (timer) clearInterval(timer);
  server.close(() => { Promise.resolve(drain).then(() => Promise.all([store.close(), multiStore?.close()])).then(() => process.exit(0)).catch(() => process.exit(1)); });
});
