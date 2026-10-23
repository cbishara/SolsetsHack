import pg from 'pg';
import type { Collection, Store } from './store.ts';

// Own schema so it never touches the prototype's "solsets" schema.
const SCHEMA = 'server';

export class PostgresStore implements Store {
  private pool: pg.Pool;

  private constructor(url: string) {
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    this.pool = new pg.Pool({ connectionString: url, max: 5, ssl: local ? false : { rejectUnauthorized: false } });
  }

  static async connect(url: string) {
    const store = new PostgresStore(url);
    await store.pool.query(`
      create schema if not exists ${SCHEMA};
      create table if not exists ${SCHEMA}.documents (
        collection text not null,
        id text not null,
        data jsonb not null,
        created_at timestamptz not null default now(),
        seq bigserial,
        primary key (collection, id)
      );
      create index if not exists documents_recent on ${SCHEMA}.documents (collection, seq desc);
    `);
    return store;
  }

  async insertIfAbsent<T>(collection: Collection, id: string, data: T) {
    const r = await this.pool.query(
      `insert into ${SCHEMA}.documents (collection, id, data) values ($1, $2, $3) on conflict do nothing`,
      [collection, id, JSON.stringify(data)],
    );
    return r.rowCount === 1;
  }

  async put<T>(collection: Collection, id: string, data: T) {
    await this.pool.query(
      `insert into ${SCHEMA}.documents (collection, id, data) values ($1, $2, $3)
       on conflict (collection, id) do update set data = excluded.data`,
      [collection, id, JSON.stringify(data)],
    );
  }

  async get<T>(collection: Collection, id: string) {
    const r = await this.pool.query(`select data from ${SCHEMA}.documents where collection = $1 and id = $2`, [collection, id]);
    return r.rows[0]?.data as T | undefined;
  }

  async list<T>(collection: Collection, limit = 200) {
    const r = await this.pool.query(
      `select data from ${SCHEMA}.documents where collection = $1 order by seq desc limit $2`,
      [collection, limit],
    );
    return r.rows.map((row) => row.data as T);
  }

  async close() {
    await this.pool.end();
  }
}
