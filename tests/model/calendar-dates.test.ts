import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fromCalendarDate,
  normalizeRange,
  toCalendarDate,
} from '../../src/components/ui/calendar-dates';

test('calendar dates round-trip without a time zone offset', () => {
  assert.equal(fromCalendarDate(toCalendarDate('2024-02-29')), '2024-02-29');
  assert.equal(fromCalendarDate(toCalendarDate('0001-01-01')), '0001-01-01');
  assert.equal(fromCalendarDate(), '');
});

test('the picker accepts partial ranges and discards invalid or future URL dates', () => {
  assert.deepEqual(normalizeRange({ from: '2026-02-30', to: '2026-11-06' }, '2026-11-05'), {
    from: '',
    to: '',
  });
  assert.deepEqual(normalizeRange({ from: '', to: '2026-08-21' }, '2026-11-05'), {
    from: '',
    to: '2026-08-21',
  });
});
