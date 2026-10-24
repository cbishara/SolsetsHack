// A small document store: every collection keeps JSON documents by id.
// Memory for local work without keys, Postgres in Railway.

export type Collection =
  | 'messages'
  | 'verdicts'
  | 'alerts'
  | 'feedback'
  | 'worries'
  | 'nights'
  | 'settings'
  | 'sources'
  | 'devices'
  | 'whatsapp_messages'
  | 'whatsapp_selections'
  | 'whatsapp_status'
  | 'raw_events'
  | 'categories';

export interface Store {
  /** Inserts only if the id is new. Returns false when it already existed. */
  insertIfAbsent<T>(collection: Collection, id: string, data: T): Promise<boolean>;
  put<T>(collection: Collection, id: string, data: T): Promise<void>;
  get<T>(collection: Collection, id: string): Promise<T | undefined>;
  /** Newest first. */
  list<T>(collection: Collection, limit?: number, idPrefix?: string, orderBy?: 'sentAt'): Promise<T[]>;
  /** Deletes one document. Returns false when it did not exist. */
  remove(collection: Collection, id: string): Promise<boolean>;
  close(): Promise<void>;
}

type Row = { data: unknown; createdAt: number; seq: number };

export class MemoryStore implements Store {
  private data = new Map<string, Map<string, Row>>();
  private seq = 0;

  private col(name: Collection) {
    let c = this.data.get(name);
    if (!c) this.data.set(name, (c = new Map()));
    return c;
  }

  async insertIfAbsent<T>(collection: Collection, id: string, data: T) {
    const c = this.col(collection);
    if (c.has(id)) return false;
    c.set(id, { data: structuredClone(data), createdAt: Date.now(), seq: this.seq++ });
    return true;
  }

  async put<T>(collection: Collection, id: string, data: T) {
    const c = this.col(collection);
    const prev = c.get(id);
    c.set(id, { data: structuredClone(data), createdAt: prev?.createdAt ?? Date.now(), seq: prev?.seq ?? this.seq++ });
  }

  async get<T>(collection: Collection, id: string) {
    const row = this.col(collection).get(id);
    return row ? (structuredClone(row.data) as T) : undefined;
  }

  async list<T>(collection: Collection, limit = 200, idPrefix = '', orderBy?: 'sentAt') {
    return [...this.col(collection).entries()]
      .filter(([id]) => id.startsWith(idPrefix)).map(([, row]) => row)
      .sort((a, b) => (orderBy ? String((b.data as Record<string, unknown>)[orderBy] ?? '').localeCompare(String((a.data as Record<string, unknown>)[orderBy] ?? '')) : 0) || b.seq - a.seq)
      .slice(0, limit)
      .map((r) => structuredClone(r.data) as T);
  }

  async remove(collection: Collection, id: string) {
    return this.col(collection).delete(id);
  }

  async close() {}
}
