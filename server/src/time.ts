const TZ = 'America/Santiago';

/** The "night" a timestamp belongs to: before 12:00 counts as the previous evening. */
export function nightDate(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() - 12 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted);
}

/** The most recent night whose morning has arrived: what the morning report is about. */
export function lastNightDate(at: Date = new Date()): string {
  return nightDate(new Date(at.getTime() - 12 * 60 * 60 * 1000));
}

export function nowIso() {
  return new Date().toISOString();
}
