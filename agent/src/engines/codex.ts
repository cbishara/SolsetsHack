import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Classification } from '../contract.ts';
import { CLASSIFICATION_SCHEMA, parseClassification } from './engine.ts';
import type { Engine } from './engine.ts';

// Codex CLI as the model, using the ChatGPT plan it is logged in with (`codex login`).
// The CLI handles the login, token refresh and calls; we only run it.
// Measured on 2026-10-23 with the plan's default model: 8 to 16 s per message with these flags.

export interface CodexOptions {
  /** Path to the codex binary. Defaults to `codex` on PATH. */
  bin?: string;
  model?: string;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Request Fast mode on the signed-in account. The CLI uses priority for this tier. */
  fast?: boolean;
  timeoutMs?: number;
  /** Codex processes allowed at once. Protects the plan's rate limits. */
  maxConcurrent?: number;
}

export function codexArgs(schemaPath: string, outPath: string, workDir: string, opts: CodexOptions): string[] {
  return [
    'exec',
    // No personal config (MCP servers, high reasoning) and no AGENTS.md rules: they made it 3 to 4 times slower.
    '--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--ephemeral',
    '-s', 'read-only',
    '-c', `model_reasoning_effort="${opts.reasoningEffort ?? 'low'}"`,
    ...(opts.fast ? ['-c', 'service_tier="priority"', '-c', 'features.fast_mode=true'] : []),
    // A classifier needs no tools: no shell, no web.
    '-c', 'features.shell_tool=false', '-c', 'features.unified_exec=false', '-c', 'web_search="disabled"',
    '-C', workDir,
    '--output-schema', schemaPath, '-o', outPath,
    ...(opts.model ? ['-m', opts.model] : []),
    '-', // prompt comes from stdin
  ];
}

function limiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>(resolve => queue.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

function run(bin: string, args: string[], input: string, cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Codex no respondió en ${Math.round(timeoutMs / 1000)} s.`));
    }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(new Error(`No se pudo ejecutar Codex: ${error.message}`)); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Codex terminó con código ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`));
    });
    child.stdin.end(input);
  });
}

/** Runs one Codex call that must answer with JSON matching `schema`. */
export type CodexRunner = (prompt: string, schema: object) => Promise<unknown>;

export function createCodexRunner(opts: CodexOptions = {}): CodexRunner {
  const bin = opts.bin ?? 'codex';
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const limit = limiter(opts.maxConcurrent ?? 2);
  return (prompt, schema) => limit(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'solsets-codex-'));
    try {
      const schemaPath = join(dir, 'schema.json');
      const outPath = join(dir, 'out.json');
      await writeFile(schemaPath, JSON.stringify(schema));
      await run(bin, codexArgs(schemaPath, outPath, dir, opts), prompt, dir, timeoutMs);
      return JSON.parse(await readFile(outPath, 'utf8'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

export function createCodexEngine(opts: CodexOptions = {}, runner: CodexRunner = createCodexRunner(opts)): Engine {
  return {
    name: 'codex',
    async classify(prompt: string): Promise<Classification> {
      return parseClassification(await runner(prompt, CLASSIFICATION_SCHEMA));
    },
  };
}
