import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AgentDecision, IncomingMessage } from './contract.ts';
import type { FeedbackExample, MemoryEntry, UserProfile } from './memory.ts';
import type { ChatSession } from './chat.ts';

export interface StoredDecision {
  message: IncomingMessage;
  decision: AgentDecision;
}

/**
 * Everything the agent remembers, per user. The in-memory version is enough for the demo;
 * a Postgres version implements the same interface without touching the rest of the agent.
 */
export interface AgentStore {
  getProfile(userId: string): UserProfile;
  getDecision(messageId: string): StoredDecision | undefined;
  saveDecision(entry: StoredDecision): void;
  listDecisions(userId: string): StoredDecision[];
  getLastWake(userId: string, incidentKey: string): { message_id: string; at: number } | null;
  setLastWake(userId: string, incidentKey: string, value: { message_id: string; at: number }): void;
  addFeedback(example: FeedbackExample): void;
  listFeedback(userId: string): FeedbackExample[];
  addMemory(entry: MemoryEntry): void;
  listMemory(userId: string): MemoryEntry[];
  /** Adds the entry, replacing any entry of the same user with the same key. */
  upsertMemory(entry: MemoryEntry): void;
  removeMemory(userId: string, keep: (entry: MemoryEntry) => boolean): void;
  getChat(sessionId: string): ChatSession | undefined;
  saveChat(session: ChatSession): void;
}

interface Snapshot {
  profiles: Record<string, UserProfile>;
  decisions: Record<string, StoredDecision>;
  lastWake: Record<string, { message_id: string; at: number }>;
  feedback: FeedbackExample[];
  memory: MemoryEntry[];
  chats: Record<string, ChatSession>;
}

const emptySnapshot = (): Snapshot => ({ profiles: {}, decisions: {}, lastWake: {}, feedback: [], memory: [], chats: {} });

export class MemoryStore implements AgentStore {
  protected data: Snapshot;

  constructor(data: Snapshot = emptySnapshot()) {
    this.data = data;
  }

  getProfile(userId: string): UserProfile {
    return this.data.profiles[userId] ?? { user_id: userId, name: 'la persona de guardia', role: 'Soporte TI con guardia nocturna' };
  }

  setProfile(profile: UserProfile): void {
    this.data.profiles[profile.user_id] = profile;
    this.changed();
  }

  getDecision(messageId: string) {
    return this.data.decisions[messageId];
  }

  saveDecision(entry: StoredDecision) {
    this.data.decisions[entry.message.id] = entry;
    this.changed();
  }

  listDecisions(userId: string) {
    return Object.values(this.data.decisions)
      .filter(d => d.message.user_id === userId)
      .sort((a, b) => b.message.received_at.localeCompare(a.message.received_at));
  }

  getLastWake(userId: string, incidentKey: string) {
    return this.data.lastWake[`${userId}|${incidentKey}`] ?? null;
  }

  setLastWake(userId: string, incidentKey: string, value: { message_id: string; at: number }) {
    this.data.lastWake[`${userId}|${incidentKey}`] = value;
    this.changed();
  }

  addFeedback(example: FeedbackExample) {
    // One verdict per message: the last tap wins.
    this.data.feedback = this.data.feedback.filter(f => f.message_id !== example.message_id);
    this.data.feedback.push(example);
    this.changed();
  }

  listFeedback(userId: string) {
    return this.data.feedback.filter(f => f.user_id === userId);
  }

  addMemory(entry: MemoryEntry) {
    this.data.memory.push(entry);
    this.changed();
  }

  listMemory(userId: string) {
    return this.data.memory.filter(m => m.user_id === userId);
  }

  upsertMemory(entry: MemoryEntry) {
    this.data.memory = this.data.memory.filter(m => !(entry.key && m.user_id === entry.user_id && m.key === entry.key));
    this.data.memory.push(entry);
    this.changed();
  }

  removeMemory(userId: string, keep: (entry: MemoryEntry) => boolean) {
    this.data.memory = this.data.memory.filter(m => m.user_id !== userId || keep(m));
    this.changed();
  }

  getChat(sessionId: string) {
    return this.data.chats[sessionId];
  }

  saveChat(session: ChatSession) {
    this.data.chats[session.id] = session;
    this.changed();
  }

  protected changed(): void {}
}

/** Same as MemoryStore, saved to a JSON file on every change (a Railway volume survives redeploys). */
export class FileStore extends MemoryStore {
  private readonly path: string;

  constructor(path: string) {
    let data = emptySnapshot();
    try {
      data = { ...data, ...JSON.parse(readFileSync(path, 'utf8')) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    super(data);
    this.path = path;
  }

  protected override changed(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.path);
  }
}
