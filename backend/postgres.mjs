import pg from 'pg';
import { readFile } from 'node:fs/promises';

export function postgresStore(connectionString) {
 const pool = new pg.Pool({ connectionString, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
 pool.on('error', () => console.error('PostgreSQL: se perdió una conexión inactiva.'));
 return {
  async initialize() {
   const client = await pool.connect();
   try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(230026001)');
    await client.query(await readFile(new URL('./migrations/001_railway.sql', import.meta.url), 'utf8'));
    await client.query('COMMIT');
   } catch (error) { await client.query('ROLLBACK'); throw error; }
   finally { client.release(); }
  },
  async readState(id) { return (await pool.query('SELECT state FROM solsets.workspaces WHERE id=$1', [id])).rows[0]?.state; },
  async saveState(id, state) { await pool.query('INSERT INTO solsets.workspaces(id,state) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()', [id, JSON.stringify(state)]); },
  async readSecret(id, provider) { return (await pool.query('SELECT encrypted FROM solsets.integration_secrets WHERE workspace_id=$1 AND provider=$2', [id, provider])).rows[0]?.encrypted; },
  async saveSecret(id, provider, encrypted) { await pool.query('INSERT INTO solsets.integration_secrets(workspace_id,provider,encrypted) VALUES($1,$2,$3) ON CONFLICT(workspace_id,provider) DO UPDATE SET encrypted=EXCLUDED.encrypted, updated_at=now()', [id, provider, encrypted]); },
  async close() { await pool.end(); },
 };
}
