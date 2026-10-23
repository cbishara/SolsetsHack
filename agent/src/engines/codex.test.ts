import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codexArgs, createCodexEngine } from './codex.ts';
import type { IncomingMessage } from '../contract.ts';

const message: IncomingMessage = { id: 'm', user_id: 'u', source: 'whatsapp', text: 'x', received_at: '2026-10-23T23:00:00-03:00' };

/** A fake `codex` binary: writes `answer` to the -o file, or sleeps, or fails. */
async function fakeCodex(behaviour: 'answer' | 'sleep' | 'fail', answer: unknown = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'fake-codex-'));
  const bin = join(dir, 'codex');
  await writeFile(bin, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const stdin = fs.readFileSync(0, 'utf8');
fs.writeFileSync(${JSON.stringify(join(dir, 'seen.json'))}, JSON.stringify({ args, stdin }));
if (${JSON.stringify(behaviour)} === 'sleep') setTimeout(() => {}, 10000);
else if (${JSON.stringify(behaviour)} === 'fail') { console.error('auth expired'); process.exit(2); }
else fs.writeFileSync(args[args.indexOf('-o') + 1], ${JSON.stringify(JSON.stringify(answer))});
`);
  await chmod(bin, 0o755);
  return { bin, seen: join(dir, 'seen.json') };
}

test('runs codex without tools or personal config, and reads the JSON answer', async () => {
  const { bin, seen } = await fakeCodex('answer', { decision: 'PARTE', reason: 'Mañana.\nsegunda línea', is_new: false, confidence: 1.4 });
  const engine = createCodexEngine({ bin, timeoutMs: 5000 });
  const r = await engine.classify('PROMPT', message);
  assert.deepEqual(r, { decision: 'PARTE', reason: 'Mañana.', is_new: false, confidence: 1 });
  const { args, stdin } = JSON.parse(await (await import('node:fs/promises')).readFile(seen, 'utf8'));
  assert.equal(stdin, 'PROMPT');
  for (const flag of ['--ignore-user-config', '--ignore-rules', '--ephemeral', 'features.shell_tool=false', 'web_search="disabled"']) {
    assert.ok(args.includes(flag), `missing ${flag}`);
  }
  assert.equal(args.at(-1), '-');
});

test('a wrong answer is an error, so the agent falls back to rules', async () => {
  const { bin } = await fakeCodex('answer', { decision: 'TAL_VEZ', reason: 'x', is_new: false, confidence: 0.5 });
  await assert.rejects(createCodexEngine({ bin }).classify('p', message), /Decisión inválida/);
});

test('a failing codex reports the end of its error output', async () => {
  const { bin } = await fakeCodex('fail');
  await assert.rejects(createCodexEngine({ bin }).classify('p', message), /código 2: auth expired/);
});

test('a slow codex is cut at the timeout', async () => {
  const { bin } = await fakeCodex('sleep');
  const started = Date.now();
  await assert.rejects(createCodexEngine({ bin, timeoutMs: 300 }).classify('p', message), /no respondió/);
  assert.ok(Date.now() - started < 3000);
});

test('the model flag is passed only when set', () => {
  assert.ok(!codexArgs('s', 'o', 'd', {}).includes('-m'));
  assert.deepEqual(codexArgs('s', 'o', 'd', { model: 'gpt-x' }).slice(-3), ['-m', 'gpt-x', '-']);
});
