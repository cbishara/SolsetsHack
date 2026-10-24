// Shared contract v0 (draft in issue #7, not official yet).
// Mirrors Quito's proposal plus the two additions proposed by server/:
// IncomingMessage.externalId and Source. Move to shared/contract.ts once the
// three agree on it.

export type IncomingMessage = {
  id: string;
  externalId: string; // provider id, used to never process the same message twice
  source: 'whatsapp' | 'email' | 'simulated';
  sender: string; // display name, always synthetic in the demo
  group?: string; // WhatsApp group name, if it came from one
  text: string;
  receivedAt: string; // ISO 8601 with time zone
};

export type Decision = 'wake' | 'report' | 'noise';

export type Classification = {
  messageId: string;
  decision: Decision;
  reason: string;
  isNew: boolean;
  confidence: number;
  incidentKey: string;
  // App contract v2 (#61), optional: only the HTTP agent fills them.
  categoryId?: string | null; // one of the user's active categories, or null
  summary?: string; // one-line headline for the inbox
  context?: string; // 2-3 lines: context and what to do
};

export type Verdict = Classification & {
  wouldWake: boolean;
  why: 'urgent' | 'new' | 'low_confidence' | 'duplicate' | 'off_duty' | 'not_urgent' | 'category';
};

export type FeedItem = Verdict & { message: IncomingMessage };

export type Night = { date: string; onCall: boolean | null; suggestedOnCall: boolean | null; confirmedAt?: string };
export type AlertStatus = 'sent' | 'seen' | 'calling' | 'answered' | 'unanswered';
export type Alert = { id: string; messageId: string; status: AlertStatus; createdAt: string; seenAt?: string };
export type FeedbackValue = 'right' | 'should_have_woken' | 'should_not_have_woken';
export type Feedback = { messageId: string; value: FeedbackValue; createdAt: string };
export type Worry = { id: string; text: string; createdAt: string };
export type MorningReport = { date: string; woke: FeedItem[]; pending: FeedItem[]; worries: Worry[] };
export type Metrics = { nights: number; wakes: number; rated: number; agreement: number; readyForActive: boolean };
export type Settings = { mode: 'shadow' | 'active' };

export type SourceStatus = 'connected' | 'disconnected' | 'unknown';
export type Source = {
  id: string;
  kind: 'whatsapp' | 'email';
  status: SourceStatus;
  detail?: string;
  lastMessageAt?: string;
  updatedAt: string;
};

export const CATEGORY_ACTIONS = ['alert', 'task', 'calendar', 'digest', 'ignore'] as const;
export type CategoryAction = (typeof CATEGORY_ACTIONS)[number];
/** Per-user category (contract app v2, point 3). Shapes from mobile/src/data/types.ts. */
export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string; // how Sol recognizes it; sent to the agent as data, never as instructions
  action: CategoryAction;
  wakeAtNight: boolean; // may wake while night alerts are on
  origin: 'sol' | 'you';
  status: 'active' | 'suggested';
  createdAt: string;
};

export type AgentContext = {
  night: Night;
  settings: Settings;
  recent: FeedItem[];
  feedback: (Feedback & { text: string })[];
  categories?: Category[];
};
