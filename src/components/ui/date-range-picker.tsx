import { useState } from 'react';
import { DayPicker, type DateRange as CalendarRange } from '@daypicker/react';
import { zhCN } from '@daypicker/react/locale';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popup';
import {
  dateLabel,
  FIRST_DATE,
  fromCalendarDate,
  normalizeRange,
  rangeLabel,
  toCalendarDate,
  type DateRange,
} from './calendar-dates';
import styles from './date-range-picker.module.css';

interface DateRangePickerProps {
  value: DateRange;
  maxDate: string;
  resetRange?: DateRange;
  onChange: (range: DateRange) => void;
}

const MIN_DAY = toCalendarDate(FIRST_DATE);
const WEEKDAYS = '日一二三四五六';
const ENDPOINTS = [
  ['from', '开始日期'],
  ['to', '结束日期'],
] as const;

function monthLabel(date: Date) {
  return date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月';
}

export function DateRangePicker({ value, maxDate, resetRange, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const range = normalizeRange(value, maxDate);
  const summary = rangeLabel(range);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={styles.trigger} aria-label={'时间筛选，' + summary}>
          <CalendarDays aria-hidden="true" size={14} />
          <span>{summary}</span>
          <ChevronDown aria-hidden="true" size={12} className={styles.chevron} />
        </button>
      </PopoverTrigger>
      {open && (
        <CalendarPanel
          key={range.from + ':' + range.to + ':' + maxDate}
          initialRange={range}
          maxDate={maxDate}
          resetRange={resetRange}
          onCancel={() => setOpen(false)}
          onApply={(next) => {
            setOpen(false);
            if (next.from !== value.from || next.to !== value.to) onChange(next);
          }}
        />
      )}
    </Popover>
  );
}

function CalendarPanel({
  initialRange,
  maxDate,
  resetRange,
  onApply,
  onCancel,
}: {
  initialRange: DateRange;
  maxDate: string;
  resetRange?: DateRange;
  onApply: (range: DateRange) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CalendarRange>();
  const initialDay = initialRange.from || initialRange.to;
  const [month, setMonth] = useState(() => toCalendarDate(initialDay || maxDate));
  // A one-sided saved filter highlights its date without starting a new selection.
  const selected =
    draft ??
    (initialDay
      ? { from: toCalendarDate(initialDay), to: toCalendarDate(initialRange.to || initialDay) }
      : undefined);
  const range = draft
    ? { from: fromCalendarDate(draft.from), to: fromCalendarDate(draft.to) }
    : initialRange;
  const choosingEnd = Boolean(draft?.from && !draft.to);
  const lastDay = toCalendarDate(maxDate);
  let hint = '点击日历选择开始日期';
  if (choosingEnd) hint = '再选一天作为结束日期';
  else if (range.from || range.to) hint = '可应用当前范围，也可点击日期重新选择';

  return (
    <PopoverContent
      aria-label="选择日期范围"
      className={styles.panel}
      sideOffset={8}
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <div className={styles.endpoints} role="group" aria-label="当前日期范围">
        {ENDPOINTS.map(([key, label]) => (
          <div className={styles.endpoint} key={key}>
            <span>{label}</span>
            <strong>{range[key] || (choosingEnd ? '待选择' : '不限')}</strong>
          </div>
        ))}
      </div>
      <p className={styles.hint} role="status">
        {hint}
      </p>
      <DayPicker
        mode="range"
        required
        resetOnSelect
        selected={selected}
        onSelect={setDraft}
        locale={zhCN}
        timeZone="UTC"
        month={month}
        onMonthChange={setMonth}
        startMonth={MIN_DAY}
        endMonth={lastDay}
        disabled={{ after: lastDay }}
        navLayout="around"
        fixedWeeks
        autoFocus
        formatters={{
          formatCaption: monthLabel,
          formatWeekdayName: (day) => WEEKDAYS[day.getUTCDay()],
        }}
        labels={{
          labelGrid: (date) => monthLabel(date) + '日历',
          labelDayButton: (date, { today, selected }) =>
            [dateLabel(fromCalendarDate(date)), today && '今天', selected && '已选']
              .filter(Boolean)
              .join('，'),
          labelPrevious: () => '上个月',
          labelNext: () => '下个月',
        }}
        classNames={{
          month: styles.month,
          month_caption: styles.monthCaption,
          button_previous: styles.iconButton,
          button_next: styles.iconButton,
          chevron: styles.navChevron,
          month_grid: styles.monthGrid,
          weekday: styles.weekday,
          day: styles.cell,
          day_button: styles.day,
          range_start: styles.rangeStart,
          range_middle: styles.rangeMiddle,
          range_end: styles.rangeEnd,
        }}
      />
      <div className={styles.footer}>
        <button
          type="button"
          onClick={() => {
            const from = resetRange?.from ? toCalendarDate(resetRange.from) : undefined;
            const to = resetRange?.to ? toCalendarDate(resetRange.to) : undefined;
            setDraft({ from, to });
            if (from) setMonth(from);
          }}
        >
          {resetRange ? '恢复默认' : '清空'}
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className={styles.apply}
          disabled={choosingEnd}
          onClick={() => onApply(range)}
        >
          应用
        </button>
      </div>
    </PopoverContent>
  );
}
