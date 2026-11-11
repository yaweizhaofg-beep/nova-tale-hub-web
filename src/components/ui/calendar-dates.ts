export type DateRange = { from: string; to: string };

export const FIRST_DATE = '0001-01-01';

export function toCalendarDate(day: string) {
  return new Date(day + 'T00:00:00Z');
}

export function fromCalendarDate(date?: Date) {
  return date?.toISOString().slice(0, 10) ?? '';
}

function validDay(day: string, max: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < FIRST_DATE || day > max) return '';
  const date = toCalendarDate(day);
  return Number.isFinite(date.getTime()) && fromCalendarDate(date) === day ? day : '';
}

export function normalizeRange(range: DateRange, max: string): DateRange {
  const from = validDay(range.from, max);
  const to = validDay(range.to, max);
  return from && to && from > to ? { from: to, to: from } : { from, to };
}

export function dateLabel(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return year + '年' + month + '月' + date + '日';
}

export function rangeLabel({ from, to }: DateRange) {
  if (!from && !to) return '全部时间';
  const crossYear = from && to && from.slice(0, 4) !== to.slice(0, 4);
  const format = (day: string) => (day ? (crossYear ? day : day.slice(5)) : '不限');
  return format(from) + ' 至 ' + format(to);
}
