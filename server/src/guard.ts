import { randomUUID } from 'node:crypto';
import { fallbackVerdict, type Agent } from './agent.ts';
import type {
  Alert, AgentContext, Category, FeedItem, Feedback, FeedbackValue, IncomingMessage, Metrics, MorningReport, Night,
  Settings, Source, SourceStatus, Verdict, Worry,
} from './contract.ts';
import type { Store } from './store/store.ts';
import { lastNightDate, nightDate, nowIso } from './time.ts';

/** Gets called when a verdict must wake Rodrigo. Push and phone call plug in here. */
export interface Notifier {
  wake(alert: Alert, item: FeedItem): Promise<void>;
}

export const logNotifier: Notifier = {
  async wake(alert, item) {
    console.log(`[alerta] ${alert.id} → ${item.reason}`);
  },
};

export type NewMessage = Omit<IncomingMessage, 'id'>;

export type IngestResult = { status: 'duplicate'; id: string } | { status: 'processed'; item: FeedItem; alert?: Alert };

const DEFAULT_SETTINGS: Settings = { mode: 'shadow' };

/** The agent accepts up to 30 categories per classification. */
export const MAX_CATEGORIES = 30;
const CATEGORIES_SEEDED = 'categories-seeded';

export type NewCategory = Omit<Category, 'id' | 'createdAt'> & { id?: string };
export type CategoryPatch = Partial<Omit<Category, 'id' | 'origin' | 'createdAt'>>;

export class Guard {
  // One message at a time, so duplicate detection sees the previous verdict.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private store: Store, private agent: Agent, private notifier: Notifier = logNotifier) {}

  ingest(input: NewMessage): Promise<IngestResult> {
    const run = this.queue.then(() => this.ingestOne(input));
    this.queue = run.catch(() => {});
    return run;
  }

  private async ingestOne(input: NewMessage): Promise<IngestResult> {
    const id = `${input.source}:${input.externalId}`;
    const message: IncomingMessage = { ...input, id };
    if (!(await this.store.insertIfAbsent('messages', id, message))) return { status: 'duplicate', id };

    const context = await this.context();
    let verdict: Verdict;
    try {
      const classification = await this.agent.classify(message, context);
      verdict = await this.agent.decide(classification, context, message);
    } catch (error) {
      console.error(`[agente] falló con ${id}:`, error);
      verdict = fallbackVerdict(message);
    }

    const item: FeedItem = { ...verdict, message };
    await this.store.put('verdicts', id, item);

    let alert: Alert | undefined;
    if (verdict.wouldWake && context.settings.mode === 'active') {
      alert = { id: randomUUID(), messageId: id, status: 'sent', createdAt: nowIso() };
      await this.store.put('alerts', alert.id, alert);
      await this.notifier.wake(alert, item).catch((e) => console.error('[alerta] no salió:', e));
    }
    return { status: 'processed', item, alert };
  }

  async context(): Promise<AgentContext> {
    const [night, settings, recent, feedback, categories] = await Promise.all([
      this.night(),
      this.settings(),
      this.store.list<FeedItem>('verdicts', 30),
      this.feedbackWithText(),
      this.categories(),
    ]);
    return { night, settings, recent, feedback, categories };
  }

  private async feedbackWithText() {
    const all = await this.store.list<Feedback>('feedback', 20);
    const withText = await Promise.all(
      all.map(async (f) => ({ ...f, text: (await this.store.get<IncomingMessage>('messages', f.messageId))?.text ?? '' })),
    );
    return withText;
  }

  // Night contract ---------------------------------------------------------

  async night(date = nightDate()): Promise<Night> {
    return (await this.store.get<Night>('nights', date)) ?? { date, onCall: null, suggestedOnCall: null };
  }

  async setNight(onCall: boolean, date = nightDate()): Promise<Night> {
    const night = { ...(await this.night(date)), onCall, confirmedAt: nowIso() };
    await this.store.put('nights', date, night);
    return night;
  }

  // Settings ---------------------------------------------------------------

  async settings(): Promise<Settings> {
    return (await this.store.get<Settings>('settings', 'current')) ?? DEFAULT_SETTINGS;
  }

  async setSettings(next: Settings): Promise<Settings> {
    await this.store.put('settings', 'current', next);
    return next;
  }

  // What the agent did -------------------------------------------------------

  async feed(since?: string): Promise<FeedItem[]> {
    const items = await this.store.list<FeedItem>('verdicts', 500);
    return since ? items.filter((i) => i.message.receivedAt > since) : items;
  }

  async report(date = lastNightDate()): Promise<MorningReport> {
    const items = (await this.feed()).filter((i) => nightDate(new Date(i.message.receivedAt)) === date);
    const worries = (await this.store.list<Worry>('worries', 200)).filter((w) => nightDate(new Date(w.createdAt)) === date);
    return {
      date,
      woke: items.filter((i) => i.wouldWake),
      pending: items.filter((i) => !i.wouldWake && i.decision === 'report'),
      worries,
    };
  }

  async metrics(): Promise<Metrics> {
    const [items, feedback] = await Promise.all([this.feed(), this.store.list<Feedback>('feedback', 1000)]);
    const nights = new Set(items.map((i) => nightDate(new Date(i.message.receivedAt)))).size;
    const right = feedback.filter((f) => f.value === 'right').length;
    const agreement = feedback.length ? right / feedback.length : 0;
    const missedWake = feedback.some((f) => f.value === 'should_have_woken');
    return {
      nights,
      wakes: items.filter((i) => i.wouldWake).length,
      rated: feedback.length,
      agreement,
      // Placeholder rule until Quito/Amaru define graduation: 3 nights, 90% agreement, no missed wake.
      readyForActive: nights >= 3 && agreement >= 0.9 && !missedWake,
    };
  }

  // Rodrigo's input ----------------------------------------------------------

  async feedback(messageId: string, value: FeedbackValue) {
    if (!(await this.store.get('messages', messageId))) return false;
    // One verdict per message: a second tap replaces the first (idempotent).
    await this.store.put<Feedback>('feedback', messageId, { messageId, value, createdAt: nowIso() });
    return true;
  }

  async addWorry(text: string): Promise<Worry> {
    const worry = { id: randomUUID(), text, createdAt: nowIso() };
    await this.store.put('worries', worry.id, worry);
    return worry;
  }

  async alertSeen(id: string): Promise<Alert | undefined> {
    const alert = await this.store.get<Alert>('alerts', id);
    if (!alert) return undefined;
    if (alert.status !== 'seen') Object.assign(alert, { status: 'seen', seenAt: nowIso() });
    await this.store.put('alerts', id, alert);
    return alert;
  }

  async registerDevice(expoPushToken: string) {
    await this.store.put('devices', expoPushToken, { expoPushToken, registeredAt: nowIso() });
  }

  // Categories per user (contract app v2, point 3) ----------------------------

  /** Oldest first, the order the person created them. */
  async categories(): Promise<Category[]> {
    const all = await this.store.list<Category>('categories', MAX_CATEGORIES * 2);
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  async createCategory(input: NewCategory): Promise<Category | 'exists' | 'full'> {
    if ((await this.store.list('categories', MAX_CATEGORIES)).length >= MAX_CATEGORIES) return 'full';
    const category: Category = { ...input, id: input.id ?? `c-${randomUUID()}`, createdAt: nowIso() };
    return (await this.store.insertIfAbsent('categories', category.id, category)) ? category : 'exists';
  }

  async updateCategory(id: string, patch: CategoryPatch): Promise<Category | undefined> {
    const prev = await this.store.get<Category>('categories', id);
    if (!prev) return undefined;
    const next = { ...prev, ...patch, id: prev.id, origin: prev.origin, createdAt: prev.createdAt };
    await this.store.put('categories', id, next);
    return next;
  }

  deleteCategory(id: string) {
    return this.store.remove('categories', id);
  }

  /** Synthetic demo categories, once, only if the person has none yet. */
  async seedCategories(seed: Omit<Category, 'createdAt'>[]) {
    if (await this.store.get('settings', CATEGORIES_SEEDED)) return false;
    if ((await this.store.list('categories', 1)).length === 0) {
      for (const c of seed) await this.store.insertIfAbsent<Category>('categories', c.id, { ...c, createdAt: nowIso() });
    }
    await this.store.put('settings', CATEGORIES_SEEDED, { at: nowIso() });
    return true;
  }

  // Sources (WhatsApp, email): powers "tonight I'm not covering X" -----------

  async setSource(id: string, kind: Source['kind'], status: SourceStatus, detail?: string) {
    const prev = await this.store.get<Source>('sources', id);
    await this.store.put<Source>('sources', id, { ...prev, id, kind, status, detail, updatedAt: nowIso() });
  }

  async touchSource(id: string, kind: Source['kind']) {
    const prev = await this.store.get<Source>('sources', id);
    await this.store.put<Source>('sources', id, {
      ...prev, id, kind, status: 'connected', lastMessageAt: nowIso(), updatedAt: nowIso(),
    });
  }

  sources() {
    return this.store.list<Source>('sources', 20);
  }

  async saveRawEvent(provider: string, body: unknown) {
    const id = `${provider}:${Date.now()}:${randomUUID().slice(0, 8)}`;
    await this.store.put('raw_events', id, { provider, receivedAt: nowIso(), body });
  }
}
