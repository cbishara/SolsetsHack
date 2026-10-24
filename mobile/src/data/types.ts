// App domain model, v3. Universal on purpose: nothing here assumes a job, a
// shift or a guard duty. A person connects where their responsibilities arrive
// (WhatsApp, email, calendar), Sol reads everything, sorts it into the
// person's categories and does with each category what the person decided.
// Proposed to server/ and agent/ in docs/equipo/bishara/CONTRATO_APP_V2.md.

import type { CategoryColor } from '../theme/tokens';

export type SourceId = 'whatsapp' | 'email' | 'calendar' | 'voice' | 'you' | 'sol';
export type ChannelSource = 'whatsapp' | 'email' | 'calendar';

// Categories -----------------------------------------------------------------

/** What Sol does with everything that falls in a category. */
export type CategoryAction = 'alert' | 'task' | 'calendar' | 'digest' | 'ignore';

export type CategoryIcon =
  | 'alert' | 'wrench' | 'calendar' | 'users' | 'receipt' | 'home' | 'info' | 'mute'
  | 'briefcase' | 'heart' | 'package' | 'shield' | 'repeat' | 'graduation';

export type Category = {
  id: string;
  name: string;
  color: CategoryColor;
  icon: CategoryIcon;
  /** How Sol recognizes it, in plain words the person can edit. */
  description: string;
  action: CategoryAction;
  /** May wake the person while night alerts are on. */
  wakeAtNight: boolean;
  origin: 'sol' | 'you';
  /** Suggested categories wait for the person to accept them. */
  status: 'active' | 'suggested';
  createdAt: string;
};

// Inbox ----------------------------------------------------------------------

export type FeedbackValue = 'right' | 'should_have_woken' | 'should_not_have_woken';
export type Decision = 'wake' | 'report' | 'noise';

/** What Sol did with an item. */
export type ItemOutcome =
  | { kind: 'alerted'; seenAt?: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'event'; eventId: string }
  | { kind: 'digest' }
  | { kind: 'ignored' };

export type ThreadMessage = { from: string; at: string; body: string; mine?: boolean };

/** Something that arrived: a message, an email, an invitation. Kept verbatim. */
export type Item = {
  id: string;
  source: ChannelSource;
  /** Group, chat or mailbox it arrived in. */
  channel: string;
  /** Sent to the person directly (DM, email to them) rather than to a group. */
  direct: boolean;
  from: { name: string; handle?: string };
  receivedAt: string;
  subject?: string;
  /** The original text, exactly as it arrived. */
  body: string;
  attachments?: { name: string; kind: 'pdf' | 'image' | 'file' }[];
  /** A few messages around it, for context. */
  thread?: ThreadMessage[];
  /** Sol's reading: a short headline. */
  summary: string;
  /** Sol's reading with context and what to do, two or three lines. */
  context?: string;
  categoryId: string | null;
  confidence: number; // 0..1
  /** Sol wants the person to confirm: the category, or a kind of thing it has not seen before. */
  review: 'none' | 'category' | 'new_kind';
  outcome: ItemOutcome;
  /** Set when it arrived during night alerts. */
  night?: { decision: Decision; wouldWake: boolean; reason: string };
  feedback?: FeedbackValue;
  read: boolean;
  /** Came from server/ (feedback goes there). */
  remote?: boolean;
  /** Example data, hidden when the app shows the server's data. */
  example?: boolean;
};

// Tasks ----------------------------------------------------------------------

export type Repeat = 'never' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
export type Priority = 'none' | 'low' | 'medium' | 'high';
/** When to remind, relative to the task's date and time. Without a time, reminders fire at 09:00. */
export type ReminderOption = 'none' | 'at' | '5m' | '15m' | '30m' | '1h' | '1d';

export type Subtask = { id: string; title: string; done: boolean };

export type Task = {
  id: string;
  title: string;
  notes?: string;
  categoryId?: string | null;
  /** The inbox item it came from, so the person can check the original. */
  itemId?: string;
  source: SourceId;
  /** "Marcela Rojas · Correo", "Soporte TI · WhatsApp", "Nota de voz". Always person or place, then channel. */
  sourceLabel: string;
  date?: string; // 'YYYY-MM-DD', local
  time?: string; // 'HH:MM', local
  reminder: ReminderOption;
  repeat: Repeat;
  priority: Priority;
  flagged: boolean;
  /** One line from Sol: why it is here and what it needs. */
  why?: string;
  subtasks?: Subtask[];
  done: boolean;
  doneAt?: string;
  createdAt: string;
  example?: boolean;
};

// Calendar -------------------------------------------------------------------

export type Calendar = {
  id: string;
  name: string;
  color: CategoryColor;
  account: string; // "Google · trabajo", "En este iPhone"
  visible: boolean;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  allDay?: boolean;
  calendarId: string;
  place?: string;
  notes?: string;
  attendees?: string[];
  alert: ReminderOption;
  source: SourceId;
  itemId?: string;
};

// Night and summaries --------------------------------------------------------

/** Night alerts: when Sol may wake the person, and for what. Generic for anyone who needs it. */
export type NightAlerts = {
  /** urgent: wake for categories allowed to; quiet: never wake, everything waits for the morning. */
  mode: 'urgent' | 'quiet';
  /** always: every night. days: on chosen weekdays. calendar: on nights with a matching event. */
  when: 'always' | 'days' | 'calendar';
  days: number[]; // 0 = Sunday
  calendarId: string;
  keyword: string; // event title that turns alerts on, e.g. "Guardia", "Turno", "De llamada"
  from: string; // "23:00"
  to: string; // "07:00"
  /** Call if the alert is not seen. */
  call: boolean;
  callAfterMin: number;
  /** Ask before bed whether to turn alerts on tonight. */
  askBefore: boolean;
  /** A one-night decision, from the question before bed or by hand. */
  override: { date: string; on: boolean } | null;
};

export type Channel = 'app' | 'whatsapp';
export type SummarySettings = {
  morning: { on: boolean; at: string; channels: Channel[] };
  evening: { on: boolean; at: string; channels: Channel[] };
};

// Sol --------------------------------------------------------------------------

export type QuestionOption = { label: string; effect?: string };
export type AgentQuestion = {
  id: string;
  text: string;
  context?: string;
  options: string[];
  /** What each answer will make Sol do, shown before choosing. Same order as options. */
  effects?: string[];
  /** What each answer does, same order as options. 'none' only records the answer. */
  actions?: (CategoryAction | 'none')[];
  itemId?: string;
  categoryId?: string;
  answer?: string;
  answeredAt?: string;
};

export type RuleKind = 'wake' | 'wait' | 'task' | 'ignore';
export type Rule = {
  id: string;
  text: string;
  kind: RuleKind;
  origin: 'default' | 'onboarding' | 'feedback' | 'you';
  confirmed: boolean;
  examples?: number;
};

export type MemoryCategory = 'vida' | 'trabajo' | 'personas' | 'horarios' | 'preferencias';
export type MemoryItem = {
  id: string;
  category: MemoryCategory;
  text: string;
  source: 'onboarding' | 'chat' | 'email' | 'whatsapp' | 'calendar';
  learnedAt: string;
};

/** People Sol has learned about, so it can tell a boss from a newsletter. */
export type Person = { id: string; name: string; relation: string; channels: ChannelSource[]; importance: 'high' | 'normal' };

export type ChatMessage = {
  id: string;
  role: 'you' | 'sol';
  text: string;
  at: string;
  via?: 'text' | 'voice';
  /** Things Sol did in that turn, shown as cards. */
  tasks?: string[];
  events?: string[];
  pending?: boolean;
  failed?: boolean;
};

// Learning ---------------------------------------------------------------------

export type TrainingPhase = 'connect' | 'reading' | 'proposing' | 'pilot' | 'trusted';
export type Training = {
  phase: TrainingPhase;
  read: { messages: number; emails: number; months: number };
  categories: { id: string; label: string; count: number; example: string }[];
  pilot: { nights: number; target: number; agreement: number; missed: number; tooMany: number; rated: number };
  questions: AgentQuestion[];
};

// Connections and profile ----------------------------------------------------

export type ConnectionId = 'whatsapp' | 'gmail' | 'calendar' | 'outlook' | 'slack';
export type Connection = {
  id: ConnectionId;
  name: string;
  status: 'connected' | 'needs_attention' | 'off';
  detail: string;
  account?: string;
  lastCheck?: string;
};

export type WatchedChat = { id: string; name: string; kind: 'grupo' | 'persona'; on: boolean; suggested?: boolean; reason?: string; members?: number };

export type SleepNight = { date: string; bed: string; wake: string; hours: number; woke: number; source: 'estimado' | 'reloj' };

export type Goal = 'guardia' | 'orden' | 'descargar' | 'dormir_mas' | 'menos_despertares' | 'constancia';

export type Profile = {
  name: string;
  fullName?: string;
  role?: string;
  about?: string;
  goals: Goal[];
  /** Work day end: the evening summary arrives then. */
  workdayEnd: string;
  agentMode: 'shadow' | 'active';
  /** Shadow period: Sol shows what it would have done, silences nothing. */
  pilot: { startedAt: string; days: number };
};

export type DumpResult = { reply: string; tasks: Task[] };

/** @deprecated v2 shape, kept so old night views keep compiling while they are redesigned. */
export type Handled = {
  id: string;
  at: string;
  source: SourceId;
  from: string;
  group?: string;
  text: string;
  title?: string;
  ruleId?: string;
  decision: Decision;
  reason: string;
  wouldWake: boolean;
  seenAt?: string;
  taskId?: string;
};
