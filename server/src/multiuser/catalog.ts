import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IdentityService, type Binding, type Principal } from './identity.ts';
import { scopedKey, type MultiUserStore, type MultiUserTransaction } from './store.ts';

const identifier = z.string().min(1).max(512);
const metadataSchema = z.object({ id: identifier, accountId: identifier, name: z.string().max(512), type: z.number().int().nullable() });
const messageSchema = z.object({
  id: identifier, accountId: identifier, chatId: identifier, senderId: identifier,
  text: z.string().max(64_000), direction: z.enum(['incoming', 'outgoing', 'unknown']),
  sentAt: z.iso.datetime({ offset: true }),
});
const recommendationSchema = z.object({ chatId: identifier, relevance: z.number().min(0).max(1), reason: z.string().trim().min(1).max(500) }).strict();
const cursorSchema = z.string().min(1).max(8192);
const MAX_CACHE = 10_000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

export type ChatMetadata = z.infer<typeof metadataSchema>;
export type NormalizedMessage = z.infer<typeof messageSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export interface CatalogProvider {
  catalog(accountId: string, cursor?: string): Promise<{ items: ChatMetadata[]; cursor: string | null }>;
  chat(accountId: string, chatId: string): Promise<ChatMetadata>;
  messages(accountId: string, chatId: string, cursor?: string): Promise<{ items: NormalizedMessage[]; cursor: string | null }>;
}
export class CatalogError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export type Selection = { chatId: string; selected: boolean; generation: number };
type CachedMetadata = ChatMetadata & { catalogVersion: number };
type CatalogScan = { version: number; cursor: string | null; complete: boolean; bindingVersion: number };
type CatalogPage = { items: ChatMetadata[]; cursor: string | null };
type Snapshot = {
  id: string; userId: string; accountId: string; bindingVersion: number; catalogVersion: number;
  items: { id: string; name: string; type: number | null }[]; complete: boolean; createdAt: string;
};
export type StoredContextMessage = NormalizedMessage & { origin: 'history' | 'webhook'; storedAt: string };
export type PermissionReference = { userId: string; accountId: string; chatId: string; bindingVersion: number; selectionGeneration: number };

/** No method in this service writes owner memory or invokes an agent. */
export class CatalogService {
  constructor(
    private readonly store: MultiUserStore,
    private readonly identity: IdentityService,
    private readonly provider: CatalogProvider,
    private readonly clock: () => number = Date.now,
  ) {}

  private accountKey(binding: Binding) { return scopedKey(binding.userId, binding.accountId); }
  private chatKey(binding: Binding, chatId: string) { return scopedKey(binding.userId, binding.accountId, chatId); }
  private async selectionIn(tx: MultiUserTransaction, binding: Binding, chatId: string): Promise<Selection> {
    return await tx.get<Selection>('catalog_selections', this.chatKey(binding, chatId)) ?? { chatId, selected: false, generation: 0 };
  }
  private async current(tx: MultiUserTransaction, principal: Principal, before: Binding) {
    const now = await this.identity.bindingInTransaction(tx, principal);
    if (now.accountId !== before.accountId || now.version !== before.version) throw new CatalogError(409, 'binding_changed');
    return now;
  }
  private owned(raw: ChatMetadata, accountId: string, chatId?: string) {
    const chat = metadataSchema.parse(raw); // Strip provider fields, especially previews/messages.
    if (chat.accountId !== accountId || (chatId !== undefined && chat.id !== chatId)) throw new CatalogError(403, 'chat_not_owned');
    return chat;
  }

  /** Traverse the returned cursor until null. A fresh first page starts a new metadata snapshot. */
  async catalog(principal: Principal, cursor?: string) {
    if (cursor !== undefined) cursorSchema.parse(cursor);
    const before = await this.store.transaction(async (tx) => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      const key = this.accountKey(binding);
      let scan = await tx.get<CatalogScan>('catalog_scans', key);
      if (cursor === undefined) {
        scan = { version: (scan?.version ?? 0) + 1, cursor: null, complete: false, bindingVersion: binding.version };
        await tx.put('catalog_scans', key, scan);
      } else {
        if (!scan || scan.bindingVersion !== binding.version) throw new CatalogError(409, 'catalog_refresh_required');
        const cached = await tx.get<CatalogPage>('catalog_pages', scopedKey(binding.userId, binding.accountId, String(scan.version), digest(cursor)));
        if (cached) return { binding, scan, cached };
        if (scan.complete || scan.cursor !== cursor) throw new CatalogError(400, 'invalid_catalog_cursor');
      }
      return { binding, scan };
    });
    const raw = before.cached ?? await this.provider.catalog(before.binding.accountId, cursor);
    const page: CatalogPage = {
      items: raw.items.map((item) => this.owned(item, before.binding.accountId)),
      cursor: raw.cursor === null ? null : cursorSchema.parse(raw.cursor),
    };
    return this.store.transaction(async (tx) => {
      const binding = await this.current(tx, principal, before.binding);
      const scan = await tx.get<CatalogScan>('catalog_scans', this.accountKey(binding));
      if (!scan || scan.version !== before.scan.version) throw new CatalogError(409, 'catalog_changed');
      if (!before.cached) {
        // A cyclic provider cursor cannot silently make a partial catalog appear complete.
        if (page.cursor && (page.cursor === cursor || await tx.get('catalog_pages', scopedKey(binding.userId, binding.accountId, String(scan.version), digest(page.cursor))))) {
          throw new CatalogError(502, 'provider_cursor_cycle');
        }
        for (const chat of page.items) await tx.put<CachedMetadata>('catalog_metadata', this.chatKey(binding, chat.id), { ...chat, catalogVersion: scan.version });
        if (cursor !== undefined) await tx.put('catalog_pages', scopedKey(binding.userId, binding.accountId, String(scan.version), digest(cursor)), page);
        scan.cursor = page.cursor;
        scan.complete = page.cursor === null;
        await tx.put('catalog_scans', this.accountKey(binding), scan);
      }
      const items = await Promise.all(page.items.map(async (chat) => ({ ...chat, ...await this.selectionIn(tx, binding, chat.id) })));
      return { items, cursor: page.cursor, complete: scan.complete, catalogVersion: scan.version };
    });
  }

  async select(principal: Principal, chatId: string, selected: boolean) {
    identifier.parse(chatId); z.boolean().parse(selected);
    const before = await this.store.transaction(async (tx) => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      return { binding, selection: await this.selectionIn(tx, binding, chatId) };
    });
    // Revocation must work even when the provider is unavailable.
    const chat = selected ? this.owned(await this.provider.chat(before.binding.accountId, chatId), before.binding.accountId, chatId) : undefined;
    return this.store.transaction(async (tx) => {
      const binding = await this.current(tx, principal, before.binding);
      const current = await this.selectionIn(tx, binding, chatId);
      if (selected && current.generation !== before.selection.generation) throw new CatalogError(409, 'selection_changed');
      const next: Selection = { chatId, selected, generation: current.generation + 1 };
      await tx.put('catalog_selections', this.chatKey(binding, chatId), next);
      if (chat) {
        const scan = await tx.get<CatalogScan>('catalog_scans', this.accountKey(binding));
        await tx.put<CachedMetadata>('catalog_metadata', this.chatKey(binding, chatId), { ...chat, catalogVersion: scan?.version ?? 0 });
      }
      return next;
    });
  }

  async selections(principal: Principal) {
    return this.store.transaction(async (tx) => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      const items = await tx.list<Selection>('catalog_selections', this.accountKey(binding), MAX_CACHE);
      if (items.length === MAX_CACHE) throw new CatalogError(413, 'selection_catalog_too_large');
      return { accountId: binding.accountId, bindingVersion: binding.version, items };
    });
  }

  private async permitted(tx: MultiUserTransaction, principal: Principal, chatId: string) {
    const binding = await this.identity.bindingInTransaction(tx, principal);
    const selection = await this.selectionIn(tx, binding, chatId);
    if (!selection.selected) throw new CatalogError(403, 'chat_not_selected');
    return { binding, selection };
  }
  private async stillPermitted(tx: MultiUserTransaction, principal: Principal, before: { binding: Binding; selection: Selection }) {
    const binding = await this.current(tx, principal, before.binding);
    const selection = await this.selectionIn(tx, binding, before.selection.chatId);
    if (!selection.selected || selection.generation !== before.selection.generation) throw new CatalogError(409, 'selection_changed');
    return binding;
  }
  private async save(tx: MultiUserTransaction, binding: Binding, message: NormalizedMessage, origin: 'history' | 'webhook') {
    const unique = scopedKey(binding.userId, binding.accountId, message.chatId, message.id);
    if (await tx.get('catalog_message_ids', unique)) return false;
    const saved: StoredContextMessage = { ...message, sentAt: new Date(message.sentAt).toISOString(), origin, storedAt: new Date(this.clock()).toISOString() };
    // Lexically ascending key = newest first. Filter the user/chat prefix BEFORE the 200 limit.
    const reverseTime = String(Number.MAX_SAFE_INTEGER - Date.parse(saved.sentAt)).padStart(17, '0');
    await tx.put('catalog_messages', scopedKey(binding.userId, binding.accountId, message.chatId, reverseTime, message.id), saved);
    await tx.put('catalog_message_ids', unique, { id: message.id });
    return true;
  }

  async importHistory(principal: Principal, chatId: string, cursor?: string) {
    identifier.parse(chatId); if (cursor !== undefined) cursorSchema.parse(cursor);
    const before = await this.store.transaction((tx) => this.permitted(tx, principal, chatId));
    this.owned(await this.provider.chat(before.binding.accountId, chatId), before.binding.accountId, chatId);
    await this.store.transaction((tx) => this.stillPermitted(tx, principal, before));
    const page = await this.provider.messages(before.binding.accountId, chatId, cursor);
    return this.store.transaction(async (tx) => {
      const binding = await this.stillPermitted(tx, principal, before);
      let imported = 0, skipped = 0;
      for (const raw of page.items) {
        const parsed = messageSchema.safeParse(raw);
        if (!parsed.success || parsed.data.accountId !== binding.accountId || parsed.data.chatId !== chatId || !parsed.data.text.trim()) { skipped++; continue; }
        if (await this.save(tx, binding, parsed.data, 'history')) imported++; else skipped++;
      }
      return { imported, skipped, cursor: page.cursor === null ? null : cursorSchema.parse(page.cursor), notifications: 0 };
    });
  }

  /** Capture before canonical REST lookup; pass this reference back to ingest afterwards. */
  async receivePermission(accountId: string, chatId: string): Promise<PermissionReference | undefined> {
    identifier.parse(accountId); identifier.parse(chatId);
    return this.store.transaction(async (tx) => {
      const binding = await this.identity.resolveAccountInTransaction(tx, accountId);
      if (!binding) return undefined;
      const selection = await this.selectionIn(tx, binding, chatId);
      if (!selection.selected) return undefined;
      return { userId: binding.userId, accountId, chatId, bindingVersion: binding.version, selectionGeneration: selection.generation };
    });
  }

  async mayReceive(accountId: string, chatId: string) {
    return (await this.receivePermission(accountId, chatId)) !== undefined;
  }

  /** Input is a fresh authenticated webhook's canonical message, never a history replay. */
  async ingest(raw: NormalizedMessage, expectedPermission?: PermissionReference) {
    const parsed = messageSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.text.trim()) return { ignored: 'invalid_message' as const };
    const message = parsed.data;
    const before = await this.store.transaction(async (tx) => {
      const binding = await this.identity.resolveAccountInTransaction(tx, message.accountId);
      if (!binding) return undefined;
      const selection = await this.selectionIn(tx, binding, message.chatId);
      if (expectedPermission && (expectedPermission.userId !== binding.userId || expectedPermission.accountId !== message.accountId ||
          expectedPermission.chatId !== message.chatId || expectedPermission.bindingVersion !== binding.version ||
          expectedPermission.selectionGeneration !== selection.generation)) return undefined;
      return selection.selected ? { binding, selection } : undefined;
    });
    if (!before) return { ignored: 'not_authorized' as const };
    this.owned(await this.provider.chat(message.accountId, message.chatId), message.accountId, message.chatId);
    return this.store.transaction(async (tx) => {
      const binding = await this.identity.resolveAccountInTransaction(tx, message.accountId);
      if (!binding || binding.userId !== before.binding.userId || binding.version !== before.binding.version) return { ignored: 'not_authorized' as const };
      const selection = await this.selectionIn(tx, binding, message.chatId);
      if (!selection.selected || selection.generation !== before.selection.generation) return { ignored: 'not_authorized' as const };
      const inserted = await this.save(tx, binding, message, 'webhook');
      const permission: PermissionReference = { userId: binding.userId, accountId: binding.accountId, chatId: message.chatId, bindingVersion: binding.version, selectionGeneration: selection.generation };
      return { accepted: true as const, duplicate: !inserted, eligibleForAgent: inserted && message.direction === 'incoming', permission };
    });
  }

  async messages(principal: Principal, chatId: string) {
    identifier.parse(chatId);
    return this.store.transaction(async (tx) => {
      const { binding, selection } = await this.permitted(tx, principal, chatId);
      const items = await tx.list<StoredContextMessage>('catalog_messages', this.chatKey(binding, chatId), 200);
      items.sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id));
      return { items, limit: 200, bindingVersion: binding.version, selectionGeneration: selection.generation };
    });
  }

  async snapshot(principal: Principal) {
    return this.store.transaction(async (tx) => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      const scan = await tx.get<CatalogScan>('catalog_scans', this.accountKey(binding));
      const cached = await tx.list<CachedMetadata>('catalog_metadata', this.accountKey(binding), MAX_CACHE);
      if (cached.length === MAX_CACHE) throw new CatalogError(413, 'metadata_catalog_too_large');
      const items = cached.filter((chat) => chat.catalogVersion === (scan?.version ?? 0))
        .map(({ id, name, type }) => ({ id, name, type }));
      const snapshot: Snapshot = {
        id: randomUUID(), userId: binding.userId, accountId: binding.accountId, bindingVersion: binding.version,
        catalogVersion: scan?.version ?? 0, items, complete: scan?.complete === true && scan.bindingVersion === binding.version,
        createdAt: new Date(this.clock()).toISOString(),
      };
      await tx.put('catalog_snapshots', scopedKey(binding.userId, snapshot.id), snapshot);
      return { id: snapshot.id, items, complete: snapshot.complete, catalogVersion: snapshot.catalogVersion, cachedCount: items.length };
    });
  }

  async applyRecommendations(principal: Principal, snapshotId: string, raw: Recommendation[]) {
    identifier.parse(snapshotId);
    const recommendations = z.array(recommendationSchema).max(MAX_CACHE).parse(raw);
    return this.store.transaction(async (tx) => {
      const binding = await this.identity.bindingInTransaction(tx, principal);
      const snapshot = await tx.get<Snapshot>('catalog_snapshots', scopedKey(binding.userId, snapshotId));
      if (!snapshot || snapshot.accountId !== binding.accountId || snapshot.bindingVersion !== binding.version) throw new CatalogError(404, 'snapshot_not_found');
      if (Date.parse(snapshot.createdAt) + 10 * 60_000 <= this.clock()) throw new CatalogError(409, 'snapshot_expired');
      const scan = await tx.get<CatalogScan>('catalog_scans', this.accountKey(binding));
      if ((scan?.version ?? 0) !== snapshot.catalogVersion) throw new CatalogError(409, 'catalog_changed');
      const known = new Set(snapshot.items.map((chat) => chat.id));
      const seen = new Set<string>();
      for (const item of recommendations) {
        if (!known.has(item.chatId) || seen.has(item.chatId)) throw new CatalogError(400, 'invalid_recommendations');
        seen.add(item.chatId);
      }
      await tx.put('catalog_recommendations', scopedKey(binding.userId, snapshotId), { snapshotId, items: recommendations });
      // Suggestions never change selected/generation, including explicitly revoked chats.
      return { snapshotId, items: recommendations };
    });
  }
}
