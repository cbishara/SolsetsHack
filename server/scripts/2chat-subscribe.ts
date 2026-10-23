// Registers the 2Chat webhooks for the deployed server. Run once per URL:
//   TWOCHAT_API_KEY=... TWOCHAT_NUMBER=+56... TWOCHAT_WEBHOOK_TOKEN=... PUBLIC_URL=https://... npm run 2chat:subscribe
import { subscribe } from '../src/sources/twochat.ts';

const { TWOCHAT_API_KEY, TWOCHAT_NUMBER, TWOCHAT_WEBHOOK_TOKEN, PUBLIC_URL } = process.env;
if (!TWOCHAT_API_KEY || !TWOCHAT_NUMBER || !TWOCHAT_WEBHOOK_TOKEN || !PUBLIC_URL) {
  console.error('Faltan TWOCHAT_API_KEY, TWOCHAT_NUMBER, TWOCHAT_WEBHOOK_TOKEN o PUBLIC_URL.');
  process.exit(1);
}

const hookUrl = `${PUBLIC_URL.replace(/\/$/, '')}/api/webhooks/2chat/${TWOCHAT_WEBHOOK_TOKEN}`;
for (const r of await subscribe(TWOCHAT_API_KEY, TWOCHAT_NUMBER, hookUrl)) {
  console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.event} (${r.status})`, r.ok ? r.body?.data?.uuid ?? '' : JSON.stringify(r.body));
}
