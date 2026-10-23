import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { day, night, type Palette, type Scheme } from './tokens';

/** How night mode turns on: on the person's schedule, or by hand. */
export type NightSettings = {
  scheduled: boolean;
  start: string; // "HH:MM", local
  end: string; // "HH:MM", local
  manual: Scheme | null; // a manual choice wins until the next scheduled change
};

export const defaultNight: NightSettings = { scheduled: true, start: '22:30', end: '06:30', manual: null };

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function isNightAt(settings: NightSettings, at: Date = new Date()): boolean {
  if (!settings.scheduled) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  const start = minutes(settings.start);
  const end = minutes(settings.end);
  return start > end ? now >= start || now < end : now >= start && now < end;
}

type ThemeValue = {
  p: Palette;
  scheme: Scheme;
  night: NightSettings;
  setNight: (next: NightSettings) => void;
  /** Turn night mode on or off by hand. */
  setManual: (scheme: Scheme | null) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children, initial = defaultNight, onChange }: { children: ReactNode; initial?: NightSettings; onChange?: (s: NightSettings) => void }) {
  const [settings, setSettings] = useState<NightSettings>(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => setSettings(initial), [initial]);

  // Re-evaluate the schedule every minute.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    void tick;
    const scheme: Scheme = settings.manual ?? (isNightAt(settings) ? 'night' : 'day');
    const update = (next: NightSettings) => {
      setSettings(next);
      onChange?.(next);
    };
    return {
      p: scheme === 'night' ? night : day,
      scheme,
      night: settings,
      setNight: update,
      setManual: (manual) => update({ ...settings, manual }),
    };
  }, [settings, tick, onChange]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
