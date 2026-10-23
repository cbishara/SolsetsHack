// Small formatting helpers for the settings screens.

export function shiftTime(hhmm: string, deltaMin: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + deltaMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "hace 2 min", "hace 3 h", "ayer". */
export function ago(iso?: string, now = new Date()): string {
  if (!iso) return 'sin revisar';
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return h < 48 ? 'ayer' : `hace ${Math.round(h / 24)} días`;
}

export function hoursBetween(start: string, end: string): string {
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  let d = toMin(end) - toMin(start);
  if (d <= 0) d += 1440;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
