import { DAY, GYR, HOUR, KYR, MIN, MYR, YEAR } from '../sim/units';

const n1 = (x: number) => (x >= 100 ? Math.round(x).toString() : x >= 10 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, ''));
const plural = (x: number, unit: string) => `${n1(x)} ${unit}${n1(x) === '1' ? '' : 's'}`;

/** "8 min 20 s", "3 days", "1.5 million years". */
export function duration(t: number): string {
  if (t < 0.0005) return '0 s';
  if (t < 1) return `${(t * 1000).toFixed(0)} ms`;
  if (t < MIN) return `${n1(t)} s`;
  if (t < HOUR) {
    const m = Math.floor(t / MIN);
    const s = Math.round(t - m * MIN);
    return s && m < 10 ? `${m} min ${s} s` : `${Math.round(t / MIN)} min`;
  }
  if (t < DAY) return plural(t / HOUR, 'hour');
  if (t < 60 * DAY) return plural(t / DAY, 'day');
  if (t < YEAR) return plural(t / (30.44 * DAY), 'month');
  if (t < 10 * KYR) return plural(t / YEAR, 'year').replace(/^(\d)(\d{3}) /, '$1,$2 ');
  if (t < MYR) return `${Math.round(t / YEAR / 1000)},000 years`;
  if (t < GYR) return `${n1(t / MYR)} million years`;
  return `${n1(t / GYR)} billion years`;
}

/** Short version for axis labels. */
export function shortDuration(t: number): string {
  if (t < MIN) return `${n1(t)} s`;
  if (t < HOUR) return `${n1(t / MIN)} min`;
  if (t < DAY) return `${n1(t / HOUR)} hr`;
  if (t < YEAR) return `${n1(t / DAY)} day`;
  if (t < KYR) return `${n1(t / YEAR)} yr`;
  if (t < MYR) return `${n1(t / KYR)}k yr`;
  if (t < GYR) return `${n1(t / MYR)}M yr`;
  return `${n1(t / GYR)}B yr`;
}

export function people(fraction: number): string {
  const n = fraction * 8.1e9;
  if (n < 1) return 'None';
  if (n < 1e3) return Math.round(n).toString();
  if (n < 1e6) return `${Math.round(n / 1e3)} thousand`;
  if (n < 1e9) return `${n1(n / 1e6)} million`;
  return `${(n / 1e9).toFixed(1)} billion`;
}

export function percent(x: number): string {
  if (x <= 0) return '0%';
  if (x < 0.001) return '<0.1%';
  if (x < 0.01) return `${(x * 100).toFixed(1)}%`;
  return `${Math.round(x * 100)}%`;
}

export function temperature(k: number): { c: string; f: string } {
  const c = k - 273.15;
  const f = c * 1.8 + 32;
  const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)).replace('-', '−');
  return { c: `${fmt(c)} °C`, f: `${fmt(f)} °F` };
}

export function dayLength(hours: number): string {
  if (hours >= 8000) return '1 year';
  if (hours >= 48) return `${n1(hours / 24)} days`;
  return `${hours.toFixed(1).replace(/\.0$/, '')} h`;
}
