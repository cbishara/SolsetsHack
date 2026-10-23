import type { Scheme } from '../../theme/tokens';

export type Moment = 'morning' | 'day' | 'evening' | 'night';

const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Which version of Hoy to show. Night mode (by schedule or by hand) always wins. */
export function momentOf(scheme: Scheme, eveningAt: string, at = new Date()): Moment {
  if (scheme === 'night') return 'night';
  const now = at.getHours() * 60 + at.getMinutes();
  if (now < 11 * 60) return 'morning';
  if (now >= mins(eveningAt) - 60) return 'evening';
  return 'day';
}

export function greeting(at = new Date()): string {
  const h = at.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export const hhmm = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

export function ago(iso?: string, at = new Date()): string {
  if (!iso) return 'sin revisar';
  const m = Math.max(0, Math.round((at.getTime() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
