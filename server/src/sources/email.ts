// Email by IMAP polling. Works with any provider; for Gmail use an app password
// on the demo account (Google account → Security → App passwords).
// Only unread messages are read, and only those whose subject contains
// EMAIL_SUBJECT_FILTER when it is set, so a real inbox is never processed by accident.

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { Guard } from '../guard.ts';

export type EmailConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  subjectFilter?: string;
  intervalMs: number;
};

export const EMAIL_SOURCE_ID = 'email';

export function startEmailPolling(guard: Guard, config: EmailConfig) {
  let running = false;

  const poll = async () => {
    if (running) return;
    running = true;
    const client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth: { user: config.user, pass: config.password },
      logger: false,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const query = config.subjectFilter ? { seen: false, subject: config.subjectFilter } : { seen: false };
        const uids = (await client.search(query, { uid: true })) || [];
        for (const uid of uids) {
          const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
          if (!msg || !msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.value[0];
          const subject = parsed.subject ?? '(sin asunto)';
          const body = (parsed.text ?? '').trim().slice(0, 4000);
          await guard.ingest({
            externalId: parsed.messageId ?? `uid-${uid}`,
            source: 'email',
            sender: from?.name || from?.address || 'Correo',
            text: body ? `${subject}\n\n${body}` : subject,
            receivedAt: (parsed.date ?? new Date()).toISOString(),
          });
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        }
      } finally {
        lock.release();
      }
      await guard.setSource(EMAIL_SOURCE_ID, 'email', 'connected', config.user);
    } catch (error) {
      console.error('[correo] no se pudo leer:', error instanceof Error ? error.message : error);
      await guard.setSource(EMAIL_SOURCE_ID, 'email', 'disconnected', 'No pude leer el correo').catch(() => {});
    } finally {
      await client.logout().catch(() => {});
      running = false;
    }
  };

  void poll();
  const timer = setInterval(poll, config.intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
