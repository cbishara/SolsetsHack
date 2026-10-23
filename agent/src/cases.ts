import { readFile, rename, writeFile } from 'node:fs/promises';
import { isDecision } from './contract.ts';
import type { Decision, Source } from './contract.ts';
import { InputError } from './agent.ts';

// Test cases. The simulated week is written by the team; Quito's verdicts live in their own file,
// so judging a case from the console never rewrites the week.

export const WEEK_FILE = new URL('../cases/semana-simulada.json', import.meta.url);
export const VERDICTS_FILE = new URL('../cases/criterio-quito.json', import.meta.url);

export interface SimCase {
  id: string;
  received_at: string;
  source: Source;
  chat: string | null;
  sender: string | null;
  text: string;
  incident_key: string | null;
  expected: Decision;
  why: string;
  status: 'confirmado' | 'propuesto';
  decided_by: string;
  edge: string | null;
}

export interface SimWeek {
  version: number;
  user_id: string;
  nights: Array<{ date: string; on_duty: boolean }>;
  cases: SimCase[];
}

/** A verdict Quito gave from the console, on a case of the week (from_case) or on a message he wrote. */
export interface Verdict {
  id: string;
  from_case: string | null;
  source: Source;
  chat: string | null;
  sender: string | null;
  text: string;
  expected: Decision;
  why: string;
  decided_by: 'Quito';
  decided_at: string;
}

async function readJson<T>(file: URL, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

/** The week with Quito's verdicts applied on top: a verdict on a case turns it into a confirmed one. */
export async function loadCases(weekFile = WEEK_FILE, verdictsFile = VERDICTS_FILE) {
  const week = await readJson<SimWeek>(weekFile, { version: 1, user_id: 'rodrigo-demo', nights: [], cases: [] });
  const verdicts = await readJson<Verdict[]>(verdictsFile, []);
  const byCase = new Map(verdicts.filter(v => v.from_case).map(v => [v.from_case as string, v]));
  const cases = week.cases.map(c => {
    const v = byCase.get(c.id);
    return v ? { ...c, expected: v.expected, why: v.why, status: 'confirmado' as const, decided_by: 'Quito' } : c;
  });
  return { ...week, cases, verdicts };
}

export async function addConfirmedCase(input: unknown, verdictsFile = VERDICTS_FILE, now = () => new Date()): Promise<Verdict> {
  const v = (input ?? {}) as Record<string, unknown>;
  if (!isDecision(v.expected)) throw new InputError('expected debe ser DESPERTAR, PARTE o RUIDO.');
  if (typeof v.text !== 'string' || !v.text.trim()) throw new InputError('Falta text.');
  if (typeof v.why !== 'string' || !v.why.trim()) throw new InputError('Falta why: una línea de por qué.');
  const verdicts = await readJson<Verdict[]>(verdictsFile, []);
  const fromCase = typeof v.from_case === 'string' && v.from_case ? v.from_case : null;
  const next = verdicts.filter(x => !fromCase || x.from_case !== fromCase); // re-judging a case replaces the verdict
  const verdict: Verdict = {
    id: `q${String(verdicts.length + 1).padStart(3, '0')}-${Date.now().toString(36)}`,
    from_case: fromCase,
    source: v.source === 'gmail' ? 'gmail' : 'whatsapp',
    chat: typeof v.chat === 'string' && v.chat ? v.chat : null,
    sender: typeof v.sender === 'string' && v.sender ? v.sender : null,
    text: v.text.trim(), expected: v.expected, why: v.why.trim(),
    decided_by: 'Quito', decided_at: now().toISOString(),
  };
  next.push(verdict);
  const tmp = new URL(`${verdictsFile.href}.tmp`);
  await writeFile(tmp, JSON.stringify(next, null, 2) + '\n');
  await rename(tmp, verdictsFile);
  return verdict;
}
