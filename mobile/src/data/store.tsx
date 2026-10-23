import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { NightSettings } from '../theme/theme';
import { defaultNight } from '../theme/theme';
import * as fx from './fixtures';
import type {
  AgentQuestion, ConnectionId, FeedbackValue, Goal, Handled, MemoryItem, NightStyle, Profile, Rule, Task,
} from './types';

// One local store for the design build. Every action maps to a server/ or
// agent/ call later (contract v0 + the additions in ./types.ts).

export type AppState = {
  version: 2;
  onboarded: boolean;
  profile: Profile;
  tasks: Task[];
  rules: Rule[];
  memory: MemoryItem[];
  feedback: Record<string, FeedbackValue>;
  questions: AgentQuestion[];
  onCallTonight: boolean | null;
  night: NightSettings;
  chats: typeof fx.watchedChats;
  connections: typeof fx.connections;
  sleepCheck: Record<string, 'bien' | 'regular' | 'mal'>; // optional one-tap check, by date
};

export function initialAppState(onboarded = true): AppState {
  return {
    version: 2,
    onboarded,
    profile: fx.profile,
    tasks: fx.tasks,
    // A new person has no learned rules yet; the demo after onboarding does.
    rules: onboarded ? fx.rules : fx.rules.filter((r) => r.origin !== 'feedback'),
    memory: fx.memory,
    feedback: {},
    questions: fx.training.questions,
    onCallTonight: null,
    night: defaultNight,
    chats: fx.watchedChats,
    connections: fx.connections,
    sleepCheck: {},
  };
}

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'toggleTask'; id: string }
  | { type: 'addTasks'; tasks: Task[] }
  | { type: 'removeTasks'; ids: string[] }
  | { type: 'updateTask'; id: string; patch: Partial<Task> }
  | { type: 'rate'; id: string; value: FeedbackValue }
  | { type: 'addRule'; rule: Rule }
  | { type: 'setRule'; id: string; patch: Partial<Rule> }
  | { type: 'removeRule'; id: string }
  | { type: 'addMemory'; item: MemoryItem }
  | { type: 'removeMemory'; id: string }
  | { type: 'updateMemory'; id: string; text: string }
  | { type: 'answer'; id: string; answer: string }
  | { type: 'setOnCall'; value: boolean }
  | { type: 'setNight'; night: NightSettings }
  | { type: 'setProfile'; patch: Partial<Profile> }
  | { type: 'toggleChat'; id: string }
  | { type: 'setConnection'; id: ConnectionId; status: 'connected' | 'needs_attention' | 'off' }
  | { type: 'sleepCheck'; date: string; value: 'bien' | 'regular' | 'mal' }
  | { type: 'finishOnboarding' }
  | { type: 'reset'; onboarded: boolean };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate': return a.state;
    case 'toggleTask': return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t)) };
    case 'addTasks': return { ...s, tasks: [...a.tasks, ...s.tasks] };
    case 'removeTasks': return { ...s, tasks: s.tasks.filter((t) => !a.ids.includes(t.id)) };
    case 'updateTask': return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case 'rate': return { ...s, feedback: { ...s.feedback, [a.id]: a.value } };
    case 'addRule': return { ...s, rules: [...s.rules, a.rule] };
    case 'setRule': return { ...s, rules: s.rules.map((r) => (r.id === a.id ? { ...r, ...a.patch } : r)) };
    case 'removeRule': return { ...s, rules: s.rules.filter((r) => r.id !== a.id) };
    case 'addMemory': return { ...s, memory: [a.item, ...s.memory] };
    case 'removeMemory': return { ...s, memory: s.memory.filter((m) => m.id !== a.id) };
    case 'updateMemory': return { ...s, memory: s.memory.map((m) => (m.id === a.id ? { ...m, text: a.text } : m)) };
    case 'answer': return { ...s, questions: s.questions.map((q) => (q.id === a.id ? { ...q, answer: a.answer } : q)) };
    case 'setOnCall': return { ...s, onCallTonight: a.value };
    case 'setNight': return { ...s, night: a.night };
    case 'setProfile': return { ...s, profile: { ...s.profile, ...a.patch } };
    case 'toggleChat': return { ...s, chats: s.chats.map((c) => (c.id === a.id ? { ...c, on: !c.on } : c)) };
    case 'setConnection': return { ...s, connections: s.connections.map((c) => (c.id === a.id ? { ...c, status: a.status } : c)) };
    case 'sleepCheck': return { ...s, sleepCheck: { ...(s.sleepCheck ?? {}), [a.date]: a.value } };
    case 'finishOnboarding': return { ...s, onboarded: true };
    case 'reset': return initialAppState(a.onboarded);
  }
}

const KEY = 'sol:app:v2';

type Store = {
  state: AppState;
  ready: boolean;
  dispatch: (a: Action) => void;
  // Read-only demo data that does not change in this build.
  lastNight: Handled[];
  events: typeof fx.events;
  shifts: typeof fx.shifts;
  sleep: typeof fx.sleep;
  training: typeof fx.training;
  // Convenience helpers used across screens.
  toggleTask: (id: string) => void;
  addTasks: (tasks: Task[]) => void;
  rate: (id: string, value: FeedbackValue) => void;
  setGoals: (goals: Goal[]) => void;
  setNightStyle: (style: NightStyle) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialAppState(true));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as AppState;
          if (parsed.version === 2) {
            // Sources are checked continuously: refresh the demo's "last check" on every launch.
            const fresh = fx.connections;
            const connections = parsed.connections.map((c) => ({ ...c, lastCheck: fresh.find((f) => f.id === c.id)?.lastCheck ?? c.lastCheck }));
            dispatch({ type: 'hydrate', state: { ...initialAppState(parsed.onboarded), ...parsed, connections } });
          }
        }
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
  const setGoals = useCallback((goals: Goal[]) => dispatch({ type: 'setProfile', patch: { goals } }), []);
  const setNightStyle = useCallback((nightStyle: NightStyle) => dispatch({ type: 'setProfile', patch: { nightStyle } }), []);

  const value = useMemo<Store>(
    () => ({
      state, ready, dispatch,
      lastNight: fx.lastNight, events: fx.events, shifts: fx.shifts, sleep: fx.sleep, training: fx.training,
      toggleTask, addTasks, rate, setGoals, setNightStyle,
    }),
    [state, ready, toggleTask, addTasks, rate, setGoals, setNightStyle],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
