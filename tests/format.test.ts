import { expect, test } from 'vitest';
import { DAY, GYR, KYR, MYR, YEAR } from '../src/sim/units';
import { duration, people } from '../src/ui/format';

test('durations round without impossible values', () => {
  expect(duration(500)).toBe('8 min 20 s');
  expect(duration(239.6)).toBe('4 min');
  expect(duration(0.9996)).toBe('1 s');
  expect(duration(3 * DAY)).toBe('3 days');
  expect(duration(1500 * YEAR)).toBe('1,500 years');
  expect(duration(9999.6 * YEAR)).toBe('10,000 years');
  expect(duration(999.6 * KYR)).toBe('1 million years');
  expect(duration(250 * MYR)).toBe('250 million years');
  expect(duration(7.6 * GYR)).toBe('7.6 billion years');
});

test('people are counted in words', () => {
  expect(people(1)).toBe('8.1 billion');
  expect(people(0.0003)).toBe('2.4 million');
  expect(people(0)).toBe('None');
});
