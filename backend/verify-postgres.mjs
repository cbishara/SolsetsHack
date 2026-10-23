// Run inside the Railway backend: node backend/verify-postgres.mjs
// Uses an isolated synthetic workspace and removes only its own test records.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { postgresStore } from './postgres.mjs';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const id = randomUUID();
const store = postgresStore(process.env.DATABASE_URL);
let reopened;
try {
 await store.initialize();
 await store.initialize();
 const state = { verification: 'railway', tasks: [{ id: 'synthetic-test', status: 'queued' }] };
 await store.saveState(id, state);
 assert.deepEqual(await store.readState(id), state);
 await store.saveSecret(id, 'google', 'encrypted-synthetic-fixture');
 assert.equal(await store.readSecret(id, 'google'), 'encrypted-synthetic-fixture');
 reopened = postgresStore(process.env.DATABASE_URL);
 assert.deepEqual(await reopened.readState(id), state);
 console.log('PASS: migración idempotente, persistencia del estado y credenciales cifradas entre conexiones.');
} finally {
 await store.close();
 await reopened?.close();
 const cleanup = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
 try {
  await cleanup.query('DELETE FROM solsets.integration_secrets WHERE workspace_id=$1', [id]);
  await cleanup.query('DELETE FROM solsets.workspaces WHERE id=$1', [id]);
 } finally { await cleanup.end(); }
}
