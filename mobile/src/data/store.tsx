import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { NightSettings } from '../theme/theme';
import { defaultNight } from '../theme/theme';
import { handledFrom, shiftsFrom, type Shift } from './compat';
import { nextRepeat, todayKey } from './dates';
import * as fx from './fixtures';
import type {
  AgentQuestion, Calendar, CalendarEvent, Category, ChatMessage, Connection, ConnectionId, FeedbackValue, Handled, Item, MemoryItem,
  NightAlerts, Person, Profile, Rule, SummarySettings, Task, WatchedChat,
} from './types';

// The app's single source of truth. Everything here works locally and persists
// on the device; src/api/backend.tsx keeps it in sync with server/ for what the
// server already supports, and the rest moves there route by route
// (docs/equipo/bishara/CONTRATO_APP_V2.md).

export type AppState = {
  version: 3;
  onboarded: boolean;
  profile: Profile;
  categories: Category[];
  items: Item[];
  tasks: Task[];
  calendars: Calendar[];
  events: CalendarEvent[];
  nightAlerts: NightAlerts;
  summaries: SummarySettings;
  questions: AgentQuestion[];
  rules: Rule[];
  memory: MemoryItem[];
  people: Person[];
  chat: ChatMessage[];
  chats: WatchedChat[];
  connections: Connection[];
  /** Theme schedule: when the app dims for the night. */
  night: NightSettings;
  sleepCheck: Record<string, 'bien' | 'regular' | 'mal'>;
  /** One-time hints the person already dismissed. */
  tips: Record<string, boolean>;
  /** Day keys whose evening summary was closed ("Cerrar el día"). */
  closedDays: string[];
  /** Where the inbox and its tasks come from: the example person, or server/. */
  dataSource: 'example' | 'server';
};

export function initialAppState(onboarded = true): AppState {
  return {
    version: 3,
    onboarded,
    profile: fx.profile,
    categories: fx.categories,
    items: fx.items,
    tasks: fx.tasks,
    calendars: fx.calendars,
    events: fx.events,
    nightAlerts: fx.nightAlerts,
    summaries: fx.summaries,
    questions: fx.questions,
    rules: onboarded ? fx.rules : fx.rules.filter((r) => r.origin !== 'feedback'),
    memory: fx.memory,
    people: fx.people,
    chat: [],
    chats: fx.watchedChats,
    connections: fx.connections,
    night: defaultNight,
    sleepCheck: {},
    tips: {},
    closedDays: [],
    dataSource: 'example',
  };
}

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'reset'; onboarded: boolean }
  | { type: 'finishOnboarding' }
  // tasks
  | { type: 'addTasks'; tasks: Task[] }
  | { type: 'updateTask'; id: string; patch: Partial<Task> }
  | { type: 'toggleTask'; id: string }
  | { type: 'removeTasks'; ids: string[] }
  | { type: 'restoreTasks'; tasks: Task[] }
  // inbox
  | { type: 'upsertItems'; items: Item[] }
  | { type: 'updateItem'; id: string; patch: Partial<Item> }
  | { type: 'categorize'; id: string; categoryId: string | null }
  | { type: 'rate'; id: string; value: FeedbackValue }
  | { type: 'itemToTask'; id: string; task: Task }
  | { type: 'itemToEvent'; id: string; event: CalendarEvent }
  // categories
  | { type: 'addCategory'; category: Category }
  | { type: 'updateCategory'; id: string; patch: Partial<Category> }
  | { type: 'removeCategory'; id: string }
  // calendar
  | { type: 'addEvent'; event: CalendarEvent }
  | { type: 'updateEvent'; id: string; patch: Partial<CalendarEvent> }
  | { type: 'removeEvent'; id: string }
  | { type: 'toggleCalendar'; id: string }
  // sol
  | { type: 'answer'; id: string; index: number }
  | { type: 'addQuestions'; questions: AgentQuestion[] }
  | { type: 'addChat'; message: ChatMessage }
  | { type: 'updateChat'; id: string; patch: Partial<ChatMessage> }
  | { type: 'clearChat' }
  | { type: 'addRule'; rule: Rule }
  | { type: 'setRule'; id: string; patch: Partial<Rule> }
  | { type: 'removeRule'; id: string }
  | { type: 'addMemory'; item: MemoryItem }
  | { type: 'updateMemory'; id: string; text: string }
  | { type: 'removeMemory'; id: string }
  // settings
  | { type: 'setProfile'; patch: Partial<Profile> }
  | { type: 'setNightAlerts'; patch: Partial<NightAlerts> }
  | { type: 'setSummaries'; patch: Partial<SummarySettings> }
  | { type: 'setNight'; night: NightSettings }
  | { type: 'toggleChat'; id: string }
  | { type: 'setChats'; chats: WatchedChat[] }
  | { type: 'setConnection'; id: ConnectionId; patch: Partial<Connection> }
  | { type: 'setConnections'; connections: Connection[] }
  | { type: 'sleepCheck'; date: string; value: 'bien' | 'regular' | 'mal' }
  | { type: 'dismissTip'; key: string }
  | { type: 'closeDay'; date: string }
  | { type: 'setDataSource'; source: 'example' | 'server' };

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A task built from an inbox item, the way Sol would write it. */
export function taskFromItem(item: Item, patch: Partial<Task> = {}): Task {
  return {
    id: uid('t'),
    title: item.summary,
    categoryId: item.categoryId,
    itemId: item.id,
    source: item.source === 'calendar' ? 'calendar' : item.source,
    sourceLabel: `${item.from.name} · ${item.source === 'email' ? 'Correo' : item.source === 'calendar' ? 'Calendario' : 'WhatsApp'}`,
    date: todayKey(),
    reminder: 'none',
    repeat: 'never',
    priority: 'none',
    flagged: false,
    why: item.context,
    done: false,
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

function answer(s: AppState, q: AgentQuestion, index: number): AppState {
  const next = { ...s, questions: s.questions.map((x) => (x.id === q.id ? { ...x, answer: q.options[index], answeredAt: new Date().toISOString() } : x)) };
  const action = q.actions?.[index] ?? 'none';
  if (action === 'none') return next;
  const item = q.itemId ? s.items.find((i) => i.id === q.itemId) : undefined;
  const category = q.categoryId ? s.categories.find((c) => c.id === q.categoryId) : undefined;
  let out = next;
  // A suggested category becomes real, with the action the person chose.
  if (category?.status === 'suggested') {
    out = {
      ...out,
      categories: out.categories.map((c) => (c.id === category.id ? { ...c, status: 'active', action, wakeAtNight: action === 'alert' } : c)),
      items: out.items.map((i) => (i.id === item?.id ? { ...i, categoryId: category.id, review: 'none', confidence: 1 } : i)),
    };
  }
  if (item) {
    if (action === 'task') {
      const task = taskFromItem({ ...item, categoryId: category?.id ?? item.categoryId });
      out = { ...out, tasks: [task, ...out.tasks], items: out.items.map((i) => (i.id === item.id ? { ...i, review: 'none', outcome: { kind: 'task', taskId: task.id } } : i)) };
    } else {
      out = { ...out, items: out.items.map((i) => (i.id === item.id ? { ...i, review: 'none', outcome: action === 'ignore' ? { kind: 'ignored' } : i.outcome.kind === 'task' ? i.outcome : { kind: 'digest' } } : i)) };
    }
  }
  return out;
}

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate': return a.state;
    case 'reset': return initialAppState(a.onboarded);
    case 'finishOnboarding': return { ...s, onboarded: true };

    case 'addTasks': return { ...s, tasks: [...a.tasks, ...s.tasks] };
    case 'updateTask': return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case 'toggleTask': return {
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== a.id) return t;
        if (t.done) return { ...t, done: false, doneAt: undefined };
        // A repeating task moves to its next date instead of disappearing, as in Reminders.
        if (t.repeat !== 'never' && t.date) return { ...t, date: nextRepeat(t.date, t.repeat), subtasks: t.subtasks?.map((x) => ({ ...x, done: false })) };
        return { ...t, done: true, doneAt: new Date().toISOString() };
      }),
    };
    case 'removeTasks': return {
      ...s,
      tasks: s.tasks.filter((t) => !a.ids.includes(t.id)),
      items: s.items.map((i) => (i.outcome.kind === 'task' && a.ids.includes(i.outcome.taskId) ? { ...i, outcome: { kind: 'digest' } } : i)),
    };
    case 'restoreTasks': return { ...s, tasks: [...a.tasks, ...s.tasks.filter((t) => !a.tasks.some((x) => x.id === t.id))] };

    case 'upsertItems': {
      const byId = new Map(s.items.map((i) => [i.id, i]));
      for (const it of a.items) byId.set(it.id, { ...byId.get(it.id), ...it });
      return { ...s, items: [...byId.values()].sort((x, y) => y.receivedAt.localeCompare(x.receivedAt)) };
    }
    case 'updateItem': return { ...s, items: s.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) };
    case 'categorize': return {
      ...s,
      items: s.items.map((i) => (i.id === a.id ? { ...i, categoryId: a.categoryId, review: 'none', confidence: 1 } : i)),
      tasks: s.tasks.map((t) => (t.itemId === a.id ? { ...t, categoryId: a.categoryId } : t)),
      questions: s.questions.map((q) => (q.itemId === a.id && !q.answer ? { ...q, answer: 'Corregido a mano', answeredAt: new Date().toISOString() } : q)),
    };
    case 'rate': return { ...s, items: s.items.map((i) => (i.id === a.id ? { ...i, feedback: a.value } : i)) };
    case 'itemToTask': return {
      ...s,
      tasks: [a.task, ...s.tasks],
      items: s.items.map((i) => (i.id === a.id ? { ...i, outcome: { kind: 'task', taskId: a.task.id }, review: 'none' } : i)),
    };
    case 'itemToEvent': return {
      ...s,
      events: [...s.events, a.event],
      items: s.items.map((i) => (i.id === a.id ? { ...i, outcome: { kind: 'event', eventId: a.event.id }, review: 'none' } : i)),
    };

    case 'addCategory': return { ...s, categories: [...s.categories, a.category] };
    case 'updateCategory': return { ...s, categories: s.categories.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case 'removeCategory': return {
      ...s,
      categories: s.categories.filter((c) => c.id !== a.id),
      items: s.items.map((i) => (i.categoryId === a.id ? { ...i, categoryId: null, review: 'category' } : i)),
      tasks: s.tasks.map((t) => (t.categoryId === a.id ? { ...t, categoryId: null } : t)),
    };

    case 'addEvent': return { ...s, events: [...s.events, a.event] };
    case 'updateEvent': return { ...s, events: s.events.map((e) => (e.id === a.id ? { ...e, ...a.patch } : e)) };
    case 'removeEvent': return { ...s, events: s.events.filter((e) => e.id !== a.id) };
    case 'toggleCalendar': return { ...s, calendars: s.calendars.map((c) => (c.id === a.id ? { ...c, visible: !c.visible } : c)) };

    case 'answer': {
      const q = s.questions.find((x) => x.id === a.id);
      return q ? answer(s, q, a.index) : s;
    }
    case 'addQuestions': return { ...s, questions: [...a.questions.filter((q) => !s.questions.some((x) => x.id === q.id)), ...s.questions] };
    case 'addChat': return { ...s, chat: [...s.chat, a.message].slice(-200) };
    case 'updateChat': return { ...s, chat: s.chat.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'clearChat': return { ...s, chat: [] };
    case 'addRule': return { ...s, rules: [...s.rules, a.rule] };
    case 'setRule': return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, ...a.patch } : r)) };
    case 'removeRule': return { ...s, rules: s.rules.filter((r) => r.id !== a.id) };
    case 'addMemory': return { ...s, memory: [a.item, ...s.memory] };
    case 'updateMemory': return { ...s, memory: s.memory.map((m) => (m.id === a.id ? { ...m, text: a.text } : m)) };
    case 'removeMemory': return { ...s, memory: s.memory.filter((m) => m.id !== a.id) };

    case 'setProfile': return { ...s, profile: { ...s.profile, ...a.patch } };
    case 'setNightAlerts': return { ...s, nightAlerts: { ...s.nightAlerts, ...a.patch } };
    case 'setSummaries': return { ...s, summaries: { ...s.summaries, ...a.patch } };
    case 'setNight': return { ...s, night: a.night };
    case 'toggleChat': return { ...s, chats: s.chats.map((c) => (c.id === a.id ? { ...c, on: !c.on } : c)) };
    case 'setChats': return { ...s, chats: a.chats };
    case 'setConnection': return { ...s, connections: s.connections.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case 'setConnections': return { ...s, connections: a.connections };
    case 'sleepCheck': return { ...s, sleepCheck: { ...s.sleepCheck, [a.date]: a.value } };
    case 'dismissTip': return { ...s, tips: { ...s.tips, [a.key]: true } };
    case 'closeDay': return { ...s, closedDays: [...s.closedDays.filter((d) => d !== a.date), a.date].slice(-30) };
    case 'setDataSource': {
      if (a.source === s.dataSource) return s;
      if (a.source === 'server') {
        // The server's data replaces the example person's inbox and the tasks that came from it.
        return { ...s, dataSource: 'server', items: s.items.filter((i) => !i.example), tasks: s.tasks.filter((t) => !t.example) };
      }
      const items = [...s.items.filter((i) => !i.remote), ...fx.items.filter((i) => !s.items.some((x) => x.id === i.id))].sort((x, y) => y.receivedAt.localeCompare(x.receivedAt));
      return { ...s, dataSource: 'example', items, tasks: [...s.tasks.filter((t) => !t.id.startsWith('srv-')), ...fx.tasks.filter((t) => !s.tasks.some((x) => x.id === t.id))] };
    }
  }
}

const KEY = 'sol:app:v3';

type Store = {
  state: AppState;
  ready: boolean;
  dispatch: (a: Action) => void;
  sleep: typeof fx.sleep;
  training: typeof fx.training;
  /** @deprecated v2 views only (compat.ts). */
  lastNight: Handled[];
  /** @deprecated v2 views only. */
  events: CalendarEvent[];
  /** @deprecated v2 views only. */
  shifts: Shift[];
  toggleTask: (id: string) => void;
  addTasks: (tasks: Task[]) => void;
  rate: (id: string, value: FeedbackValue) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialAppState(true));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version !== 3) return;
        // Sources are checked continuously: refresh the example "last check" on every launch.
        const connections = parsed.connections.map((c) => ({ ...c, lastCheck: fx.connections.find((f) => f.id === c.id)?.lastCheck ?? c.lastCheck }));
        dispatch({ type: 'hydrate', state: { ...initialAppState(parsed.onboarded), ...parsed, connections } });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const toggleTask = useCallback((id: string) => dispatch({ type: 'toggleTask', id }), []);
  const addTasks = useCallback((tasks: Task[]) => dispatch({ type: 'addTasks', tasks }), []);
  const rate = useCallback((id: string, value: FeedbackValue) => dispatch({ type: 'rate', id, value }), []);

  const value = useMemo<Store>(
    () => ({
      state, ready, dispatch, sleep: fx.sleep, training: fx.training, toggleTask, addTasks, rate,
      lastNight: handledFrom(state.items), events: state.events, shifts: shiftsFrom(state.events, state.nightAlerts.keyword),
    }),
    [state, ready, toggleTask, addTasks, rate],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export const newId = uid;
