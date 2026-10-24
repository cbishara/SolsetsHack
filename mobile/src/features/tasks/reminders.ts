// Real reminders: each open task with a reminder becomes a local notification
// on the phone. Tapping it opens the task. Local notifications work in Expo Go;
// the web preview skips them.
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { dueLabel, reminderAt } from '../../data/dates';
import type { Task } from '../../data/types';

const PREFIX = 'task:';
const enabled = Platform.OS !== 'web';

if (enabled) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Asks once, the first time the person sets a reminder. */
export async function askReminderPermission(): Promise<boolean> {
  if (!enabled) return false;
  try {
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function sync(tasks: Task[]) {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  const now = Date.now();
  const want = new Map<string, { task: Task; at: Date }>();
  for (const task of tasks) {
    if (task.done) continue;
    const at = reminderAt(task);
    if (at && at.getTime() > now + 5_000) want.set(`${PREFIX}${task.id}`, { task, at });
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const have = new Map(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => [n.identifier, n]));
  for (const [id, n] of have) {
    const w = want.get(id);
    const at = (n.content.data as { at?: string } | undefined)?.at;
    if (!w || at !== w.at.toISOString()) await Notifications.cancelScheduledNotificationAsync(id);
    else want.delete(id); // unchanged, keep it
  }
  for (const [identifier, { task, at }] of [...want].slice(0, 60)) {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: task.title, body: task.why ?? dueLabel(task) ?? 'Recordatorio de Soltra', data: { taskId: task.id, at: at.toISOString() }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/** Keeps the phone's scheduled reminders equal to the tasks, and opens a task from its notification. */
export function useReminders(tasks: Task[]) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { sync(tasks).catch(() => {}); }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [tasks]);

  useEffect(() => {
    if (!enabled) return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = (r.notification.request.content.data as { taskId?: string } | undefined)?.taskId;
      if (id) router.push(`/tarea/${id}`);
    });
    return () => sub.remove();
  }, []);
}
