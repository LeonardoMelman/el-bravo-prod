export function startOfWeekMonday(input: Date) {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0 domingo, 1 lunes
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

export function getWeekKey(input: Date) {
  return startOfWeekMonday(input).toISOString().slice(0, 10);
}

export function addDays(input: Date, days: number) {
  const d = new Date(input);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffInFullDays(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getCurrentConsecutiveWeekStreak(
  weekCounts: Map<string, number>,
  predicate: (count: number) => boolean,
  now = new Date()
) {
  let streak = 0;
  let cursor = startOfWeekMonday(now);

  while (true) {
    const key = getWeekKey(cursor);
    const count = weekCounts.get(key) ?? 0;

    const isCurrentWeek = key === getWeekKey(now);

    if (isCurrentWeek) {
      // La semana actual no corta la racha si todavía no cumplió.
      if (predicate(count)) {
        streak += 1;
      }
    } else {
      if (predicate(count)) {
        streak += 1;
      } else {
        break;
      }
    }

    cursor = addDays(cursor, -7);

    // guard rail para evitar loops infinitos
    if (streak > 500) break;
  }

  return streak;
}

export function buildWeekCounts(
  dates: Date[]
): Map<string, number> {
  const weekCounts = new Map<string, number>();

  for (const date of dates) {
    const key = getWeekKey(date);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  return weekCounts;
}

export function buildWeekMinutes(
  items: Array<{ startedAt: Date; durationMinutes: number }>
): Map<string, number> {
  const weekMinutes = new Map<string, number>();

  for (const item of items) {
    const key = getWeekKey(item.startedAt);
    weekMinutes.set(key, (weekMinutes.get(key) ?? 0) + item.durationMinutes);
  }

  return weekMinutes;
}