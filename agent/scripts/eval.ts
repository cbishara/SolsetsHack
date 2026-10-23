// Runs the simulated week and prints the hit rate on Quito-confirmed cases.
// npm run eval                 → fixed rules, no keys
// npm run eval -- --engine codex → Codex with the logged-in plan
import { createAgent } from '../src/agent.ts';
import { loadCases } from '../src/cases.ts';
import { createCodexEngine } from '../src/engines/codex.ts';
import { rulesEngine } from '../src/engines/rules.ts';
import { runWeek, summarize } from '../src/evaluate.ts';
import { MemoryStore } from '../src/store.ts';

const useCodex = process.argv.includes('codex') || process.env.AGENT_ENGINE === 'codex';
const engine = useCodex
  ? createCodexEngine({ bin: process.env.CODEX_BIN, model: process.env.CODEX_MODEL, maxConcurrent: Number(process.env.CODEX_MAX_CONCURRENT ?? 3) })
  : rulesEngine;
const week = await loadCases();
if (!week.cases.length) {
  console.log('No hay casos en agent/cases/semana-simulada.json.');
  process.exit(0);
}

const agent = createAgent({ store: new MemoryStore(), engine });
console.log(`Motor: ${engine.name} · ${week.cases.length} casos`);
const results = await runWeek(agent, week, {
  runId: `eval-${Date.now().toString(36)}`,
  onResult: r => process.stdout.write(r.ok ? '.' : r.status === 'confirmado' ? 'X' : 'x'),
});
const s = summarize(results);
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)} %` : 'sin casos');

console.log('\n');
console.log(`Confirmados por Quito: ${s.confirmed_ok} de ${s.confirmed} bien (${pct(s.confirmed_ok, s.confirmed)})`);
console.log(`Propuestos sin confirmar: coincide en ${s.proposed_agree} de ${s.proposed} (${pct(s.proposed_agree, s.proposed)})`);
if (s.fallbacks) console.log(`Respondieron las reglas fijas porque falló el motor: ${s.fallbacks}`);
for (const r of results.filter(r => !r.ok)) {
  console.log(`${r.status === 'confirmado' ? 'X' : 'x'} ${r.case_id} esperaba ${r.expected}, dio ${r.got}: "${r.text.slice(0, 70)}"`);
}
if (s.missed_wakes.length) {
  console.log(`\nNo despertó en casos confirmados que debían despertar: ${s.missed_wakes.join(', ')}`);
  process.exit(1);
}
