export interface MultiUserTransaction {
  get<T>(bucket: string, key: string): Promise<T | undefined>;
  put<T>(bucket: string, key: string, value: T): Promise<void>;
  remove(bucket: string, key: string): Promise<void>;
  list<T>(bucket: string, prefix: string, limit?: number): Promise<T[]>;
}

/** Transactions must contain storage work only: never call a provider or model inside one. */
export interface MultiUserStore {
  transaction<T>(run: (tx: MultiUserTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export const scopedKey = (...parts: string[]) => parts.map(encodeURIComponent).join(':') + ':';

export function validateKey(bucket: string, key: string) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(bucket) || key.length > 4096 || key.includes('\0')) {
    throw new Error('Invalid storage namespace.');
  }
}

export function validateLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) throw new Error('Invalid storage limit.');
}

/** Isolated snapshots + a queue give the same atomic commit/rollback semantics as Postgres. */
export class MemoryMultiUserStore implements MultiUserStore {
  private data = new Map<string, Map<string, unknown>>();
  private tail: Promise<void> = Promise.resolve();

  async transaction<T>(run: (tx: MultiUserTransaction) => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshot = structuredClone(this.data);
    let active = true;
    const bucketFor = (bucket: string, key: string) => {
      if (!active) throw new Error('Transaction is closed.');
      validateKey(bucket, key);
      let values = snapshot.get(bucket);
      if (!values) snapshot.set(bucket, values = new Map());
      return values;
    };
    const tx: MultiUserTransaction = {
      async get<T>(bucket: string, key: string) { return structuredClone(bucketFor(bucket, key).get(key)) as T | undefined; },
      async put<T>(bucket: string, key: string, value: T) { bucketFor(bucket, key).set(key, structuredClone(value)); },
      async remove(bucket: string, key: string) { bucketFor(bucket, key).delete(key); },
      async list<T>(bucket: string, prefix: string, limit = 200) {
        validateLimit(limit);
        return [...bucketFor(bucket, prefix).entries()].filter(([key]) => key.startsWith(prefix))
          .sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([, value]) => structuredClone(value) as T);
      },
    };
    try {
      const result = await run(tx);
      this.data = snapshot;
      return result;
    } finally {
      active = false;
      release();
    }
  }

  async close() { await this.tail; }
}
