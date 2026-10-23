import { createHash } from 'node:crypto';
import { advanceConversation } from './disconnect-flow.mjs';

export function conversationId(input) {
  return input.synthetic ? 'demo:web' : 'wa:' + createHash('sha256').update(input.recipient).digest('hex').slice(0, 24);
}

export function receiptId(input) { return (input.synthetic ? 'web:' : 'wa:') + input.externalId; }

// Dependency injection keeps transport tests offline while exercising the same
// processor used by the signed webhook and the browser.
export function createDisconnectProcessor({ getState, mutate, sendWhatsApp, now = () => new Date().toISOString() }) {
  let queue = Promise.resolve();
  return function process(input) {
    const next = queue.then(() => processOne(input));
    queue = next.catch(() => {});
    return next;
  };

  async function processOne(input) {
    const id = conversationId(input), receipt = receiptId(input);
    const state = getState();
    if (state.disconnectReceipts?.includes(receipt)) {
      // Recovery after a crash between preparing a response and attempting it.
      // There is no delivery evidence, so never leave it promising a later send.
      if (state.disconnectSessions?.[id]?.messages.find(m => m.id === receipt)?.delivery === 'pending') {
        await mutate(s => { s.disconnectSessions[id].messages.find(m => m.id === receipt).delivery = 'unknown'; });
      }
      return { duplicate: true, session: getState().disconnectSessions?.[id] };
    }
    const timestamp = now();
    const result = advanceConversation(state.disconnectSessions?.[id], input.text, timestamp);
    const settings = state.settings;
    const received = Date.parse(input.receivedAt);
    const withinWindow = Number.isFinite(received) && Date.parse(timestamp) - received >= 0 && Date.parse(timestamp) - received < 23 * 3600000;
    let delivery = input.synthetic ? 'simulated' : settings.paused ? 'paused' : settings.shadow ? 'shadow' : settings.permissions.reply !== 'auto' ? 'not-authorized' : !withinWindow ? 'expired' : 'pending';
    const session = {
      ...result.session, id, channel: input.synthetic ? 'web' : 'whatsapp',
      label: input.synthetic ? 'Prueba web · datos ficticios' : 'WhatsApp · …' + input.recipient.slice(-4),
      updatedAt: timestamp,
      messages: [...result.session.messages,
        ...(!result.erased ? [{ id: receipt + ':user', role: 'user', text: input.text, at: timestamp }] : []),
        { id: receipt, role: 'assistant', text: result.reply, at: timestamp, delivery },
      ].slice(-60),
    };
    // Persist the answer and deduplication marker together BEFORE external work.
    await mutate(s => {
      s.disconnectSessions ||= {};
      s.disconnectSessions[id] = session;
      s.disconnectReceipts = [...(s.disconnectReceipts || []), receipt].slice(-2000);
    });
    const updateDelivery = async (status, extra = {}) => mutate(s => {
      const message = s.disconnectSessions[id]?.messages.find(m => m.id === receipt);
      if (message) Object.assign(message, { delivery: status }, extra);
    });
    if (delivery === 'pending') {
      // A process crash or ambiguous network failure must never auto-resend.
      await updateDelivery('unknown');
      // Check permissions AFTER the last awaited write, directly before sending.
      const latest = getState().settings;
      if (latest.paused || latest.shadow || latest.permissions.reply !== 'auto') {
        delivery = 'not-authorized';
        await updateDelivery(delivery);
      } else {
        try {
          const response = await sendWhatsApp(input.recipient, result.reply);
          const providerMessageId = response?.messages?.[0]?.id;
          delivery = providerMessageId ? 'accepted' : 'unknown';
          await updateDelivery(delivery, providerMessageId ? { providerMessageId } : {});
        } catch {
          delivery = 'unknown';
          await updateDelivery(delivery);
        }
      }
    }
    return { duplicate: false, session: getState().disconnectSessions[id] };
  }
}

export function disconnectStatus(state) {
  const required = ['KAPSO_API_KEY', 'KAPSO_PHONE_NUMBER_ID', 'KAPSO_WEBHOOK_SECRET', 'KAPSO_ALLOWED_NUMBERS', 'DASHBOARD_PASSWORD'];
  const missing = required.filter(key => !process.env[key]?.trim() && !(key === 'KAPSO_ALLOWED_NUMBERS' && process.env.RODRIGO_WHATSAPP_NUMBER?.trim()));
  const number = process.env.WHATSAPP_DEMO_NUMBER || '';
  const inbound = Object.values(state.disconnectSessions || {}).filter(s => s.channel === 'whatsapp');
  return {
    sessions: Object.values(state.disconnectSessions || {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    settings: state.settings,
    connection: {
      configured: missing.length === 0, missing,
      webhookUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '') + '/api/webhooks/kapso',
      chatUrl: missing.length === 0 && /^[1-9]\d{7,14}$/.test(number) ? 'https://wa.me/' + number + '?text=Hola%20SOL' : null,
      receivedCount: inbound.reduce((n, s) => n + s.messages.filter(m => m.role === 'user').length, 0),
      acceptedCount: inbound.reduce((n, s) => n + s.messages.filter(m => m.delivery === 'accepted').length, 0),
      queuedCount: state.inbox?.length || 0,
    },
  };
}
