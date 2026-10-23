// App domain model. Extends the shared contract v0 draft (issue #7,
// docs/equipo/adr/por-confirmar/2026-10-23-contrato-compartido.md) with what
// the app needs beyond the night guard: tasks, calendar, rules, memory,
// training, connections and sleep. Proposed to server/ and agent/ as-is.

export type SourceId = 'whatsapp' | 'email' | 'calendar' | 'voice' | 'you' | 'sol';

export type Due = { kind: 'today' | 'tomorrow' | 'date' | 'week' | 'someday'; at?: string; label: string };

export type Task = {
  id: string;
  title: string;
  detail?: string;
  source: SourceId;
  sourceLabel: string; // "Grupo Guardia TI", "Correo de Marcela", "Lo dictaste tú"
  due: Due;
  important: boolean; // shown in "Lo importante"
  why?: string; // one line: why Sol put it here
  done: boolean;
  createdAt: string;
};

export type EventKind = 'event' | 'shift' | 'focus' | 'personal';

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  kind: EventKind;
  place?: string;
  source: SourceId;
};

export type ShiftKind = 'dia' | 'tarde' | 'noche' | 'libre';
export type Shift = { date: string; kind: ShiftKind; start?: string; end?: string; onCall: boolean };

export type Decision = 'wake' | 'report' | 'noise';
export type FeedbackValue = 'right' | 'should_have_woken' | 'should_not_have_woken';

/** A message the agent handled, with what it decided (contract v0 Verdict + message). */
export type Handled = {
  id: string;
  at: string; // ISO
  source: SourceId;
  from: string;
  group?: string;
  text: string;
  title?: string; // short headline for summaries; falls back to text
  ruleId?: string; // the rule that decided it
  decision: Decision;
  reason: string;
  wouldWake: boolean;
  seenAt?: string;
  taskId?: string; // the task it became, if any
};

export type RuleKind = 'wake' | 'wait' | 'task' | 'ignore';
export type Rule = {
  id: string;
  text: string;
  kind: RuleKind;
  origin: 'default' | 'onboarding' | 'feedback' | 'you';
  confirmed: boolean;
  examples?: number; // how many past messages back it up
};

export type MemoryCategory = 'vida' | 'trabajo' | 'personas' | 'horarios' | 'preferencias';
export type MemoryItem = {
  id: string;
  category: MemoryCategory;
  text: string;
  source: 'onboarding' | 'chat' | 'email' | 'whatsapp' | 'calendar';
  learnedAt: string;
};

export type AgentQuestion = { id: string; text: string; context?: string; options: string[]; answer?: string };

export type TrainingPhase = 'connect' | 'reading' | 'proposing' | 'pilot' | 'trusted';
export type Training = {
  phase: TrainingPhase;
  read: { messages: number; emails: number; months: number };
  categories: { id: string; label: string; count: number; example: string }[];
  pilot: { nights: number; target: number; agreement: number; missed: number; tooMany: number; rated: number };
  questions: AgentQuestion[];
};

export type ConnectionId = 'whatsapp' | 'gmail' | 'calendar' | 'outlook' | 'slack';
export type Connection = {
  id: ConnectionId;
  name: string;
  status: 'connected' | 'needs_attention' | 'off';
  detail: string; // "3 chats vigilados · hace 2 min"
  lastCheck?: string;
};

export type SleepNight = { date: string; bed: string; wake: string; hours: number; woke: number; source: 'estimado' | 'reloj' };

export type Goal = 'guardia' | 'orden' | 'descargar' | 'dormir_mas' | 'menos_despertares' | 'constancia';
export type NightStyle = 'wake_if_urgent' | 'summary_only';

export type Profile = {
  name: string;
  about?: string;
  goals: Goal[];
  nightStyle: NightStyle;
  morningAt: string; // "07:00"
  eveningAt: string; // "22:00", nightly summary
  whatsappDigest: boolean; // also send summaries by WhatsApp
  agentMode: 'shadow' | 'active';
};

export type DumpResult = { reply: string; tasks: Task[] };
