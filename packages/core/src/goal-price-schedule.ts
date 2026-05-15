export function calculateNextPriceCheckAt(targetDate: Date, now = new Date()): Date {
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const intervalDays = daysRemaining <= 90 ? 1 : daysRemaining <= 365 ? 3 : 7;
  return addDays(now, intervalDays);
}

export function calculatePriceCheckBackoffUntil(failureCount: number, now = new Date()): Date {
  const pauseDays = failureCount <= 1 ? 1 : failureCount === 2 ? 3 : 7;
  return addDays(now, pauseDays);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
