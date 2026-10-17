import type { ScriptedEvent, Severity, State } from '../types';

export function ev(at: number, sev: Severity, title: string, body: string, extra: Partial<ScriptedEvent> = {}): ScriptedEvent {
  return { at, sev, title, body, ...extra };
}

const LIFE = ['microbes', 'plankton', 'plants', 'fungi', 'insects', 'animals', 'fish', 'humans'] as const;

export function killAll(s: State) {
  for (const k of LIFE) s[k] = 0;
  s.energy = 0;
  s.infra = 0;
}

/** Multiply several state values at once, e.g. hit(s, { humans: 0.1, infra: 0.5 }). */
export function hit(s: State, f: Partial<Record<keyof State, number>>) {
  for (const [k, v] of Object.entries(f) as [keyof State, number][]) s[k] *= v;
}

/** The mantle collapsing into a deleted core: the energy release melts the planet. */
export function coreCollapse(s: State) {
  killAll(s);
  s.radius = 0.94;
  s.geo = 2600;
  s.T = Math.max(s.T, 1900);
  s.Td = s.T;
  s.steam += s.ocean;
  s.ocean = 0;
  s.landIce = 0;
  s.seaIce = 0;
  s.runaway = 1;
  s.clouds = 1;
  s.mag = 0;
}
