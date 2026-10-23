import { z } from 'zod';

export class WhatsAppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function unipileOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('UNIPILE_DSN debe ser una URL HTTPS de Unipile.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.unipile\.com$/i.test(url.hostname) ||
      url.username || url.password || url.search || url.hash ||
      !['/', '/api/v1', '/api/v1/', '/api/v1/accounts'].includes(url.pathname)) {
    throw new Error('UNIPILE_DSN debe apuntar directamente a tu servidor HTTPS de Unipile.');
  }
  return url.origin;
}

const record = z.record(z.string(), z.unknown());
const pageSchema = z.object({ items: z.array(record), cursor: z.string().nullish() });
export type ProviderObject = z.infer<typeof record>;
export type ProviderPage = z.infer<typeof pageSchema>;

export class UnipileClient {
  private origin: string;
  constructor(dsn: string, private apiKey: string, public accountId: string, private fetcher: typeof fetch = fetch) {
    this.origin = unipileOrigin(dsn);
  }

  private async request(path: string, query: Record<string, string | undefined> = {}, body?: unknown): Promise<unknown> {
    const url = new URL(`${this.origin}/api/v1/${path}`);
    for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
    try {
      const response = await this.fetcher(url, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
        headers: { 'X-API-KEY': this.apiKey, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new WhatsAppError(502, `Unipile devolvió HTTP ${response.status}. Revisa la conexión y las credenciales.`);
      return await response.json();
    } catch (error) {
      if (error instanceof WhatsAppError) throw error;
      // Never forward provider bodies, request headers, or fetch causes containing secrets.
      throw new WhatsAppError(502, 'No se pudo consultar Unipile. Revisa la conexión y vuelve a intentar.');
    }
  }

  async account() { return record.parse(await this.request(`accounts/${encodeURIComponent(this.accountId)}`)); }
  async chats(cursor?: string): Promise<ProviderPage> {
    return pageSchema.parse(await this.request('chats', { account_id: this.accountId, account_type: 'WHATSAPP', limit: '100', cursor }));
  }
  async chat(chatId: string) { return record.parse(await this.request(`chats/${encodeURIComponent(chatId)}`)); }
  async messages(chatId: string, cursor?: string): Promise<ProviderPage> {
    return pageSchema.parse(await this.request(`chats/${encodeURIComponent(chatId)}/messages`, { limit: '50', cursor }));
  }

  async subscribe(publicUrl: string, secret: string) {
    const target = new URL(publicUrl);
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
      throw new WhatsAppError(400, 'PUBLIC_URL debe ser el origen HTTPS público del servidor.');
    }
    const requestUrl = `${target.origin}/api/webhooks/unipile`;
    const existing: ProviderObject[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = pageSchema.parse(await this.request('webhooks', { limit: '100', cursor }));
      existing.push(...page.items);
      cursor = page.cursor || undefined;
      if (cursor && (visited.has(cursor) || visited.size >= 20)) throw new WhatsAppError(502, 'No se pudo completar la lista de webhooks; no se crearon duplicados.');
      if (cursor) visited.add(cursor);
    } while (cursor);
    const results: { source: string; result: string }[] = [];
    // A matching subscription is left intact; no silent deletion or secret rotation.
    for (const source of ['messaging', 'account_status'] as const) {
      const name = `sol-${source}-${this.accountId}`;
      if (existing.some((item) => item.name === name && item.request_url === requestUrl)) {
        results.push({ source, result: 'existing; verify enabled and header secret in dashboard' });
        continue;
      }
      await this.request('webhooks', {}, {
        name, source, request_url: requestUrl, format: 'json', enabled: true, account_ids: [this.accountId],
        events: source === 'messaging' ? ['message_received'] : ['ok', 'error', 'stopped', 'credentials', 'permissions', 'deleted', 'reconnected', 'sync_success'],
        headers: [{ key: 'Content-Type', value: 'application/json' }, { key: 'X-Sol-Webhook-Secret', value: secret }],
      });
      results.push({ source, result: 'created' });
    }
    return { results };
  }
}
