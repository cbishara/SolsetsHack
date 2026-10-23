import { unipileOrigin } from '../unipile/client.ts';

export function loadMultiUserConfig(env: NodeJS.ProcessEnv) {
  if (env.SOL_MULTIUSER_ENABLED !== 'true') return undefined;
  const databaseUrl = env.DATABASE_URL;
  const apiKey = env.UNIPILE_API_KEY;
  const botAccountId = env.UNIPILE_BOT_ACCOUNT_ID;
  const identitySecret = env.SOL_IDENTITY_SECRET ?? '';
  const webhookSecret = env.SOL_MULTIUSER_WEBHOOK_SECRET ?? '';
  const publicUrl = env.PUBLIC_URL ?? '';
  if (!databaseUrl || !apiKey || !botAccountId || !publicUrl || identitySecret.length < 32 || webhookSecret.length < 32) {
    throw new Error('Multiusuario requiere Postgres, Unipile, cuenta BOT, PUBLIC_URL y secretos propios de al menos 32 caracteres.');
  }
  if ([identitySecret, webhookSecret, env.API_TOKEN, env.UNIPILE_WEBHOOK_SECRET].filter(Boolean).length !== new Set([identitySecret, webhookSecret, env.API_TOKEN, env.UNIPILE_WEBHOOK_SECRET].filter(Boolean)).size) {
    throw new Error('Los secretos de identidad, webhook multiusuario y piloto deben ser distintos.');
  }
  const url = new URL(publicUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_URL debe ser un origen HTTPS.');
  return { databaseUrl, apiKey, botAccountId, identitySecret, webhookSecret, publicUrl: url.origin, dsn: unipileOrigin(env.UNIPILE_DSN ?? '') };
}
