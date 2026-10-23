export function focusSchedule(minutes: number, now = new Date()) {
  if (![15, 30, 60].includes(minutes))
    throw new Error("Elige una sesión de 15, 30 o 60 minutos.");
  const end = new Date(now.getTime() + minutes * 60000);
  const parts = (date: Date) => ({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  });
  return {
    schedule: {
      intervalStart: parts(new Date(now.getTime() - 5000)),
      intervalEnd: parts(end),
      repeats: false,
    },
    endsAt: end.toISOString(),
  };
}
