import pg from 'pg';
import { validateKey, validateLimit, type MultiUserStore, type MultiUserTransaction } from './store.ts';

/** Separate tables leave the existing single-owner pilot untouched. */
export class PostgresMultiUserStore implements MultiUserStore {
  private constructor(private readonly pool: pg.Pool) {}

  static async connect(connectionString: string) {
    const pool = new pg.Pool({ connectionString, max: 5 });
    try {
      await pool.query(`
        CREATE SCHEMA IF NOT EXISTS sol_identity;
        CREATE TABLE IF NOT EXISTS sol_identity.documents (
          bucket text NOT NULL,
          key text NOT NULL,
          data jsonb NOT NULL,
          PRIMARY KEY (bucket, key)
        );
      `);
      return new PostgresMultiUserStore(pool);
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async transaction<T>(run: (tx: MultiUserTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let active = true;
    const check = (bucket: string, key: string) => {
      if (!active) throw new Error('Transaction is closed.');
      validateKey(bucket, key);
    };
    try {
      await client.query('BEGIN');
      // Serializes short identity/storage transitions across server processes. No network
      // work is permitted in the callback. This conservative lock fits the pilot load.
      await client.query('SELECT pg_advisory_xact_lock(736015891)');
      const tx: MultiUserTransaction = {
        async get<T>(bucket: string, key: string) {
          check(bucket, key);
          const result = await client.query('SELECT data FROM sol_identity.documents WHERE bucket=$1 AND key=$2', [bucket, key]);
          return result.rows[0]?.data as T | undefined;
        },
        async put<T>(bucket: string, key: string, value: T) {
          check(bucket, key);
          await client.query(`INSERT INTO sol_identity.documents(bucket,key,data) VALUES($1,$2,$3)
            ON CONFLICT(bucket,key) DO UPDATE SET data=EXCLUDED.data`, [bucket, key, JSON.stringify(value)]);
        },
        async remove(bucket: string, key: string) {
          check(bucket, key);
          await client.query('DELETE FROM sol_identity.documents WHERE bucket=$1 AND key=$2', [bucket, key]);
        },
        async list<T>(bucket: string, prefix: string, limit = 200) {
          check(bucket, prefix); validateLimit(limit);
          const result = await client.query(`SELECT data FROM sol_identity.documents
            WHERE bucket=$1 AND starts_with(key,$2) ORDER BY key LIMIT $3`, [bucket, prefix, limit]);
          return result.rows.map((row) => row.data as T);
        },
      };
      const result = await run(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      active = false;
      client.release();
    }
  }

  async close() { await this.pool.end(); }
}
