import { open, mkdir, readFile, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { MemoryStore, type Collection, type Store } from './store.ts';

// Local demo only: append + fsync before acknowledging, one process per file.
// Railway uses Postgres. Never deploy this journal on an ephemeral filesystem.
export class FileStore implements Store {
  private memory = new MemoryStore();
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(private path: string, private file: Awaited<ReturnType<typeof open>>) {}

  static async connect(path: string) {
    path = resolve(path);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const lockPath = `${path}.lock`;
    try {
      const pid = Number(await readFile(lockPath, 'utf8'));
      if (!Number.isInteger(pid) || pid < 1) throw new Error('Lock local inválido. Revisa el archivo .lock.');
      try { process.kill(pid, 0); } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ESRCH') await unlink(lockPath);
        else throw e;
      }
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const lock = await open(lockPath, 'wx', 0o600).catch(() => { throw new Error('La base local ya está abierta por otro servidor.'); });
    await lock.writeFile(String(process.pid));
    await lock.close();
    try {
      const content = await readFile(path, 'utf8').catch((e: NodeJS.ErrnoException) => { if (e.code === 'ENOENT') return ''; throw e; });
      const file = await open(path, 'a', 0o600);
      const store = new FileStore(path, file);
      try {
        for (const line of content.split('\n')) {
          if (!line) continue;
          const row = JSON.parse(line) as { collection: Collection; id: string; data: unknown };
          await store.memory.put(row.collection, row.id, row.data);
        }
      } catch { await file.close(); throw new Error('La base local no se pudo leer. Conserva el archivo para recuperarlo.'); }
      return store;
    } catch (e) { await unlink(lockPath); throw e; }
  }

  private mutate<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  private async write<T>(collection: Collection, id: string, data: T) {
    await this.file.appendFile(JSON.stringify({ collection, id, data }) + '\n');
    await this.file.sync();
    await this.memory.put(collection, id, data);
  }
  insertIfAbsent<T>(collection: Collection, id: string, data: T) {
    return this.mutate(async () => {
      if (await this.memory.get(collection, id) !== undefined) return false;
      await this.write(collection, id, data); return true;
    });
  }
  put<T>(collection: Collection, id: string, data: T) { return this.mutate(() => this.write(collection, id, data)); }
  async get<T>(collection: Collection, id: string) { await this.queue; return this.memory.get<T>(collection, id); }
  async list<T>(collection: Collection, limit?: number, idPrefix?: string, orderBy?: 'sentAt') { await this.queue; return this.memory.list<T>(collection, limit, idPrefix, orderBy); }
  async close() { await this.queue; await this.file.close(); await unlink(`${this.path}.lock`); }
}
