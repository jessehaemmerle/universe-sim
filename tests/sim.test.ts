import { describe, expect, test } from 'vitest';
import { CATALOG, COMBOS, DELETABLES } from '../src/sim/catalog';
import { baseline, lifeIndex, pressure, surfaceTemp } from '../src/sim/model';
import type { State } from '../src/sim/types';
import { DAY, GYR, HOUR, KYR, MYR, YEAR } from '../src/sim/units';
import { World } from '../src/sim/world';

const world = (...ids: string[]) => {
  const w = new World(CATALOG, COMBOS);
  for (const id of ids) w.add(id, 0);
  return w;
};
const tempC = (w: World, t: number) => surfaceTemp(w.sample(t), w.ctxAt(t)) - 273.15;
const finite = (s: State) => Object.values(s).every((v) => Number.isFinite(v));
const checkpoints = [0, 1, HOUR, DAY, YEAR, 100 * YEAR, 10 * KYR, MYR, 100 * MYR, GYR, 9 * GYR];

describe('catalog', () => {
  test('ids are unique and every partOf points at a real deletable', () => {
    expect(CATALOG.size).toBe(DELETABLES.length);
    for (const d of DELETABLES) for (const p of d.partOf ?? []) expect(CATALOG.has(p), `${d.id} -> ${p}`).toBe(true);
    for (const c of COMBOS) for (const id of c.ids) expect(CATALOG.has(id), id).toBe(true);
  });

  test.each(DELETABLES.map((d) => d.id))('deleting %s alone stays numerically sane', (id) => {
    const w = world(id);
    for (const t of checkpoints) expect(finite(w.sample(t)), `${id} at ${t}`).toBe(true);
    expect(w.events.length).toBeGreaterThan(0);
    for (const e of w.events) expect(Number.isFinite(e.t)).toBe(true);
  });

  test('deleting everything at once stays numerically sane', () => {
    const w = world(...DELETABLES.map((d) => d.id).filter((id) => id !== 'time'));
    for (const t of checkpoints) expect(finite(w.sample(t))).toBe(true);
  });
});

describe('physics anchors', () => {
  test('without deletions Earth stays as it is for 10,000 years', () => {
    const w = world('mars');
    for (const t of [DAY, YEAR, 100 * YEAR, 10 * KYR]) {
      expect(Math.abs(tempC(w, t) - 14.85)).toBeLessThan(0.5);
      expect(lifeIndex(w.sample(t))).toBeGreaterThan(0.97);
      expect(w.sample(t).humans).toBeGreaterThan(0.97);
    }
  });

  test('without the Sun, Earth freezes like the textbooks say', () => {
    const w = world('sun');
    expect(tempC(w, 7 * DAY)).toBeLessThan(-5);
    expect(tempC(w, 7 * DAY)).toBeGreaterThan(-40);
    expect(tempC(w, YEAR)).toBeLessThan(-60);
    expect(tempC(w, MYR)).toBeLessThan(-200);
    expect(w.sample(2 * YEAR).humans).toBe(0);
  });

  test('without CO2 Earth slides into a snowball within a century', () => {
    const w = world('co2');
    expect(tempC(w, 100 * YEAR)).toBeLessThan(-15);
    expect(w.events.some((e) => e.title === 'Snowball Earth')).toBe(true);
  });

  test('deleting the atmosphere kills people within minutes', () => {
    const w = world('atmosphere');
    expect(pressure(w.sample(1))).toBeLessThan(0.01);
    expect(w.sample(HOUR).humans).toBe(0);
  });

  test('gravity tears Earth apart within hours', () => {
    const w = world('gravity');
    expect(w.sample(3 * HOUR).integrity).toBeLessThan(0.05);
  });

  test('the cold floor melts all ice and raises the sea', () => {
    const s = world('cold').sample(DAY);
    expect(s.landIce).toBe(0);
    expect(s.ocean).toBeGreaterThan(1.015);
  });

  test('clouds and ozone grow back by themselves', () => {
    expect(world('clouds').sample(10 * DAY).clouds).toBeGreaterThan(0.5);
    expect(world('ozone').sample(2 * YEAR).ozone).toBeGreaterThan(0.8);
  });

  test('time freezes everything', () => {
    const w = world('moon', 'time');
    expect(w.sample(GYR)).toEqual(w.sample(1));
  });
});

describe('world', () => {
  test('deletions later in time branch from the state at that moment', () => {
    const w = new World(CATALOG, COMBOS);
    w.add('moon', 0);
    w.add('oceans', 100 * YEAR);
    expect(w.sample(50 * YEAR).ocean).toBeGreaterThan(0.9);
    expect(w.sample(100 * YEAR + 1).ocean).toBeLessThan(1e-6);
  });

  test('restoring the first deletion shifts the timeline to the next one', () => {
    const w = new World(CATALOG, COMBOS);
    w.add('moon', 0);
    w.add('oceans', 10 * YEAR);
    w.restore('moon');
    expect(w.deletions).toEqual([{ id: 'oceans', at: 0 }]);
    expect(w.sample(1).ocean).toBeLessThan(1e-6);
  });

  test('deleting a part of something already gone is reported as moot', () => {
    const w = world('insects', 'bees');
    expect(w.moot.has('bees')).toBe(true);
    expect(w.events.some((e) => e.key === 'moot:bees')).toBe(true);
  });

  test('combos fire when both things are gone', () => {
    const w = world('oceans', 'atmosphere');
    expect(w.events.some((e) => e.source === 'combo' && e.title === 'Earth looks like the Moon')).toBe(true);
  });

  test('the baseline is the starting point', () => {
    expect(new World(CATALOG, COMBOS).sample(123)).toEqual(baseline());
  });
});
