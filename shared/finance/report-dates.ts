export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';
export function reportDateRange(period: ReportPeriod, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const start = new Date(Date.UTC(year, month, day));
  if (period === 'week') start.setUTCDate(day - ((now.getUTCDay() + 6) % 7));
  if (period === 'month') start.setUTCDate(1);
  if (period === 'quarter') {
    start.setUTCDate(1);
    start.setUTCMonth(Math.floor(month / 3) * 3);
  }
  if (period === 'year') {
    start.setUTCDate(1);
    start.setUTCMonth(0);
  }
  return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}
