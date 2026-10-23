import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { WhatsAppService } from './service.ts';

const cursorSchema = z.string().min(1).max(8192).optional();
const equal = (a: string, b: string) => a.length > 0 && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function unipileWebhook(service?: WhatsAppService, secret?: string) {
  const router = Router();
  router.post('/', async (req, res) => {
    if (!service || !secret) return res.status(503).json({ error: 'Unipile no configurado.' });
    if (!equal(req.get('X-Sol-Webhook-Secret') ?? '', secret)) return res.status(401).json({ error: 'Webhook no autorizado.' });
    res.json({ ok: true, ...await service.receive(req.body) });
  });
  return router;
}

// Mounted AFTER the owner's Bearer authentication. Single-owner pilot only.
export function whatsappRoutes(service?: WhatsAppService) {
  const router = Router();
  router.use((_req, res, next) => {
    if (!service) return res.status(503).json({ error: 'Unipile no configurado. Completa las variables del servidor.' });
    next();
  });
  router.get('/status', async (_req, res) => res.json(await service!.status()));
  router.get('/chats', async (req, res) => res.json(await service!.chats(cursorSchema.parse(req.query.cursor))));
  router.put('/chats/:chatId/selection', async (req, res) => {
    const { selected } = z.object({ selected: z.boolean() }).parse(req.body);
    res.json(await service!.select(String(req.params.chatId), selected));
  });
  router.post('/chats/:chatId/import', async (req, res) => {
    const { cursor } = z.object({ cursor: cursorSchema }).parse(req.body ?? {});
    res.json(await service!.importHistory(String(req.params.chatId), cursor));
  });
  router.get('/chats/:chatId/messages', async (req, res) => res.json(await service!.messages(String(req.params.chatId))));
  return router;
}
