import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { initialState, workspaceId } from './seed.mjs';
import { postgresStore } from './postgres.mjs';

const dir = resolve(process.env.DATA_DIR || '.data');
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
if (process.env.DATABASE_URL && supabase) throw new Error('Configura DATABASE_URL o Supabase, no ambos, para evitar cambiar de base sin intención.');
const postgres = process.env.DATABASE_URL ? postgresStore(process.env.DATABASE_URL) : null;
let state;
let queue = Promise.resolve();
export async function initializeStore() {
 if (postgres) {
  await postgres.initialize();
  state = await postgres.readState(workspaceId) || initialState();
 } else if (supabase) {
  const { data, error } = await supabase.from('demo_workspaces').select('state').eq('id', workspaceId).maybeSingle();
  if (error) throw new Error('Supabase no disponible. Ejecuta las migraciones y revisa la configuración.');
  state = data?.state || initialState();
 } else {
  await mkdir(dir, { recursive: true });
  try { state = JSON.parse(await readFile(resolve(dir, 'state.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; state = initialState(); }
 }
 await save(state);
}
async function save(next) {
 if (postgres) await postgres.saveState(workspaceId, next);
 else if (supabase) { const { error } = await supabase.from('demo_workspaces').upsert({ id: workspaceId, state: next, updated_at: new Date().toISOString() }); if (error) throw new Error('No se pudo guardar en Supabase.'); }
 else { await writeFile(resolve(dir, 'state.json.tmp'), JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(resolve(dir, 'state.json.tmp'), resolve(dir, 'state.json')); }
}
export function getState() { return structuredClone(state); }
export function mutate(fn) { const next = queue.then(async () => { const copy = getState(); const result = await fn(copy); await save(copy); state = copy; return result; }); queue = next.catch(() => {}); return next; }
export async function saveSecret(provider, encrypted) {
 if (postgres) return postgres.saveSecret(workspaceId, provider, encrypted);
 if (supabase) { const { error } = await supabase.from('integration_secrets').upsert({ workspace_id: workspaceId, provider, encrypted }); if (error) throw new Error('No se pudieron guardar las credenciales.'); }
 else { await mkdir(dir, { recursive: true }); await writeFile(resolve(dir, `${provider}.enc`), encrypted, { mode: 0o600 }); }
}
export async function readSecret(provider) {
 if (postgres) return postgres.readSecret(workspaceId, provider);
 if (supabase) { const { data, error } = await supabase.from('integration_secrets').select('encrypted').eq('workspace_id', workspaceId).eq('provider', provider).maybeSingle(); if (error) throw new Error('No se pudieron consultar las integraciones.'); return data?.encrypted; }
 try { return await readFile(resolve(dir, `${provider}.enc`), 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
export const storageMode = postgres ? 'postgres' : supabase ? 'supabase' : 'local';
