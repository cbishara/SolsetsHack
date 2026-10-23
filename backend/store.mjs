import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { initialState, workspaceId } from './seed.mjs';

const dir = resolve(process.env.DATA_DIR || '.data');
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
let state;
let queue = Promise.resolve();
export async function initializeStore() {
 if (supabase) {
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
 if (supabase) { const { error } = await supabase.from('demo_workspaces').upsert({ id: workspaceId, state: next, updated_at: new Date().toISOString() }); if (error) throw new Error('No se pudo guardar en Supabase.'); }
 else { await writeFile(resolve(dir, 'state.json.tmp'), JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(resolve(dir, 'state.json.tmp'), resolve(dir, 'state.json')); }
}
export function getState() { return structuredClone(state); }
export function mutate(fn) { const next = queue.then(async () => { const copy = getState(); const result = await fn(copy); await save(copy); state = copy; return result; }); queue = next.catch(() => {}); return next; }
export const storageMode = supabase ? 'supabase' : 'local';
export { supabase, dir, workspaceId };
