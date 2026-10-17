import { clamp, civ, co2Gas, dayHours, lifeIndex, o2Gas, pressure, solarFlux, surfaceTemp, verdict } from '../sim/model';
import type { Ctx, SimEvent, State } from '../sim/types';
import { dayLength, duration, people, percent, temperature } from './format';

interface Row {
  key: string;
  label: string;
  /** Main value and an optional quieter second unit. */
  value: (s: State, c: Ctx) => [string, string?];
  /** Position of the bar, 0..1, and where today sits on it. */
  bar?: { level: (s: State, c: Ctx) => number; today: number; health: (s: State, c: Ctx) => number };
  show?: (s: State, c: Ctx) => boolean;
}

/** 1 when a value equals today's, falling off as it moves away. */
const nearToday = (x: number) => clamp(1 - Math.abs(x - 1) * 1.6, 0, 1);

const ROWS: Row[] = [
  {
    key: 'temp', label: 'Average temperature',
    value: (s, c) => { const t = temperature(surfaceTemp(s, c)); return [t.c, t.f]; },
    bar: {
      level: (s, c) => clamp(0.5 + (surfaceTemp(s, c) - 288) / 120, 0, 1), today: 0.5,
      health: (s, c) => clamp(1 - Math.abs(surfaceTemp(s, c) - 288) / 30, 0, 1),
    },
  },
  { key: 'day', label: 'Length of a day', value: (s, c) => [dayLength(dayHours(s, c))] },
  { key: 'ocean', label: 'Oceans', value: (s) => [percent(s.ocean)], bar: { level: (s) => s.ocean / 1.5, today: 1 / 1.5, health: (s) => nearToday(s.ocean) } },
  { key: 'ice', label: 'Ice sheets', value: (s) => [percent(s.landIce)], bar: { level: (s) => s.landIce / 3, today: 1 / 3, health: (s) => clamp(1 - Math.abs(s.landIce - 1) * 0.6, 0, 1) } },
  {
    key: 'air', label: 'Air pressure',
    value: (s) => { const p = pressure(s); return [`${p >= 10 ? Math.round(p).toLocaleString('en-US') : p.toFixed(2)} bar`]; },
    bar: { level: (s) => pressure(s) / 1.5, today: 1 / 1.5, health: (s) => nearToday(pressure(s)) },
  },
  { key: 'o2', label: 'Oxygen', value: (s) => [percent(o2Gas(s) / 0.21)], bar: { level: (s) => o2Gas(s) / 0.21 / 1.5, today: 1 / 1.5, health: (s) => clamp(o2Gas(s) / 0.21, 0, 1) } },
  {
    key: 'co2', label: 'Carbon dioxide', value: (s) => [`${Math.round(co2Gas(s)).toLocaleString('en-US')} ppm`],
    bar: { level: (s) => co2Gas(s) / 840, today: 0.5, health: (s) => { const x = co2Gas(s) / 420; return clamp(Math.min(x * 2.5, 2.4 - x), 0, 1); } },
  },
  { key: 'sun', label: 'Sunlight', value: (s, c) => [percent(solarFlux(s, c))], bar: { level: (s, c) => solarFlux(s, c) / 1.5, today: 1 / 1.5, health: (s, c) => nearToday(solarFlux(s, c)) } },
  { key: 'mag', label: 'Magnetic field', value: (s) => [percent(s.mag)], bar: { level: (s) => s.mag / 1.5, today: 1 / 1.5, health: (s) => clamp(s.mag, 0, 1) } },
  { key: 'life', label: 'Living things', value: (s) => [percent(lifeIndex(s))], bar: { level: (s) => lifeIndex(s) / 1.5, today: 1 / 1.5, health: (s) => clamp(lifeIndex(s), 0, 1) } },
  { key: 'people', label: 'People', value: (s) => [people(s.humans)], bar: { level: (s) => s.humans / 1.5, today: 1 / 1.5, health: (s) => clamp(s.humans, 0, 1) } },
  { key: 'tech', label: 'Technology', value: (s) => [percent(civ(s))], bar: { level: (s) => civ(s) / 1.5, today: 1 / 1.5, health: (s) => clamp(civ(s), 0, 1) } },
  {
    key: 'dist', label: 'Distance from the Sun',
    value: (s) => [`${s.dist < 100 ? s.dist.toFixed(2) : Math.round(s.dist).toLocaleString('en-US')} AU`],
    show: (s) => Math.abs(s.dist - 1) > 0.005,
  },
];

function healthColor(h: number): string {
  if (h > 0.75) return 'var(--leaf)';
  if (h > 0.45) return 'var(--sulfur)';
  if (h > 0.15) return 'var(--magma)';
  return 'var(--crimson)';
}

const VERDICT_LEVEL: Record<string, number> = {
  Thriving: 0, Struggling: 1, Collapsing: 2, 'Barely alive': 3, 'Microbes only': 3, 'Breaking apart': 3, Lifeless: 4, Destroyed: 4,
};

interface Cell { dt: HTMLElement; dd: HTMLElement; main: Text; sub: HTMLElement; bar?: HTMLElement; fill?: HTMLElement; last: string; }

export class VitalsView {
  private cells = new Map<string, Cell>();

  constructor(root: HTMLElement, private readonly verdictEl: HTMLElement) {
    for (const r of ROWS) {
      const dt = document.createElement('dt');
      dt.textContent = r.label;
      const dd = document.createElement('dd');
      const main = document.createTextNode('');
      const sub = document.createElement('small');
      dd.append(main, sub);
      root.append(dt, dd);
      const cell: Cell = { dt, dd, main, sub, last: '' };
      if (r.bar) {
        cell.bar = document.createElement('div');
        cell.bar.className = 'bar';
        cell.fill = document.createElement('i');
        const today = document.createElement('b');
        today.style.left = `${r.bar.today * 100}%`;
        cell.bar.append(cell.fill, today);
        root.append(cell.bar);
      }
      this.cells.set(r.key, cell);
    }
  }

  update(s: State, c: Ctx) {
    const gone = s.integrity < 0.3;
    for (const r of ROWS) {
      const cell = this.cells.get(r.key)!;
      const visible = r.show ? r.show(s, c) : true;
      cell.dt.hidden = cell.dd.hidden = !visible;
      if (cell.bar) cell.bar.hidden = !visible;
      if (!visible) continue;
      const [main, sub] = gone && r.key !== 'dist' ? ['—'] : r.value(s, c);
      const sig = `${main}|${sub ?? ''}`;
      if (sig !== cell.last) {
        cell.main.data = main;
        cell.sub.textContent = sub ?? '';
        cell.last = sig;
      }
      if (cell.fill && r.bar) {
        cell.fill.style.width = `${(gone ? 0 : clamp(r.bar.level(s, c), 0, 1)) * 100}%`;
        cell.fill.style.backgroundColor = healthColor(gone ? 0 : r.bar.health(s, c));
      }
    }
    const v = verdict(s);
    if (this.verdictEl.textContent !== v) {
      this.verdictEl.textContent = v;
      this.verdictEl.dataset.level = String(VERDICT_LEVEL[v] ?? 0);
    }
  }
}

export class FeedView {
  private shown = '';
  private seen = new Set<string>();

  constructor(
    private readonly list: HTMLOListElement,
    private readonly empty: HTMLElement,
    private readonly names: ReadonlyMap<string, string>,
  ) {}

  /** Show events that have happened, newest first. */
  update(events: readonly SimEvent[], rel: (t: number) => number) {
    const sig = events.map((e) => e.key).join('|');
    if (sig === this.shown) return;
    this.shown = sig;
    this.empty.hidden = events.length > 0;
    const frag = document.createDocumentFragment();
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      const li = document.createElement('li');
      li.dataset.sev = e.sev;
      if (this.seen.size > 0 && !this.seen.has(e.key)) li.className = 'new';
      const meta = document.createElement('div');
      meta.className = 'meta';
      const t = document.createElement('span');
      t.className = 'num';
      const r = rel(e.t);
      t.textContent = r <= 0.0005 ? 'Instantly' : `+${duration(r)}`;
      const src = document.createElement('span');
      src.textContent = this.sourceLabel(e.source);
      meta.append(t, src);
      const h = document.createElement('h3');
      h.textContent = e.title;
      const p = document.createElement('p');
      p.textContent = e.body;
      li.append(meta, h, p);
      frag.appendChild(li);
    }
    this.list.replaceChildren(frag);
    this.seen = new Set(events.map((e) => e.key));
  }

  private sourceLabel(source: string): string {
    if (source === 'auto') return 'Knock-on effect';
    if (source === 'nature') return 'Meanwhile';
    if (source === 'combo') return 'Combined effect';
    return this.names.get(source) ?? '';
  }
}
