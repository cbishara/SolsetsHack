import type { EmailConfig } from './sources/email.ts';

const env = process.env;

export type Config = {
  port: number;
  apiToken?: string; // Bearer token for the app; open when unset (local only)
  databaseUrl?: string;
  twoChat: { apiKey?: string; number?: string; webhookToken?: string; publicUrl?: string };
  email?: EmailConfig;
  allowSimulate: boolean;
};

export function loadConfig(): Config {
  const email: EmailConfig | undefined =
    env.EMAIL_IMAP_USER && env.EMAIL_IMAP_PASSWORD
      ? {
          host: env.EMAIL_IMAP_HOST || 'imap.gmail.com',
          port: Number(env.EMAIL_IMAP_PORT || 993),
          user: env.EMAIL_IMAP_USER,
          password: env.EMAIL_IMAP_PASSWORD,
          // Safe default: only demo emails. Set it to an empty string to read every unread email.
          subjectFilter: env.EMAIL_SUBJECT_FILTER ?? '[SOLSETS-DEMO]',
          intervalMs: Number(env.EMAIL_POLL_SECONDS || 30) * 1000,
        }
      : undefined;

  const config: Config = {
    port: Number(env.PORT || 3002),
    apiToken: env.API_TOKEN || undefined,
    databaseUrl: env.DATABASE_URL || undefined,
    twoChat: {
      apiKey: env.TWOCHAT_API_KEY || undefined,
      number: env.TWOCHAT_NUMBER || undefined,
      webhookToken: env.TWOCHAT_WEBHOOK_TOKEN || undefined,
      publicUrl: env.PUBLIC_URL || undefined,
    },
    email,
    allowSimulate: env.ALLOW_SIMULATE !== 'false',
  };

  const live = config.databaseUrl || config.twoChat.webhookToken || config.email;
  if (live && !config.apiToken) throw new Error('Configura API_TOKEN antes de conectar una base o una fuente real.');
  return config;
}
