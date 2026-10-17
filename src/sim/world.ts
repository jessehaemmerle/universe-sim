import { baseline, step, surfaceTemp } from './model';
import type { Combo, Ctx, Deletable, ScriptedEvent, SimEvent, State, StateKey } from './types';
import { HORIZON, YEAR } from './units';
import { NATURE, WATCHERS } from './watchers';

export interface Deletion {
  id: string;
  /** Seconds after the first deletion. */
  at: number;
}

/**
 * The stretch of history between one deletion and the next. Times inside an epoch are kept
 * relative to its start so that "+0.5 s" stays exact even a billion years in.
 */
export interface Epoch {
  start: number;
  end: number;
  ids: string[];
  r: number[];
  states: State[];
}

interface Pending {
  r: number;
  key: string;
  source: string;
  ev: ScriptedEvent;
}

const KEYS = Object.keys(baseline()) as StateKey[];
const STEPS_PER_DECADE = 48;
const FIRST_STEP = 0.05;

function clone(s: State): State {
  return { ...s };
}

function makeCtx(at: ReadonlyMap<string, number>, tAbs: () => number): Ctx {
  return {
    has: (id) => at.has(id),
    since: (id) => {
      const a = at.get(id);
      return a === undefined ? Infinity : tAbs() - a;
    },
    get tAbs() {
      return tAbs();
    },
  };
}

/** Sample times inside an epoch: dense at first, then evenly spaced on a log scale. */
function grid(span: number): number[] {
  const r = [0];
  if (span <= 0) return r;
  for (let i = 0; ; i++) {
    const t = FIRST_STEP * Math.pow(10, i / STEPS_PER_DECADE);
    if (t >= span) break;
    r.push(t);
  }
  r.push(span);
  return r;
}

export class World {
  deletions: Deletion[] = [];
  epochs: Epoch[] = [];
  events: SimEvent[] = [];
  /** Deletions that happened after Earth was already destroyed. */
  moot = new Set<string>();

  constructor(
    private readonly catalog: ReadonlyMap<string, Deletable>,
    private readonly combos: readonly Combo[],
  ) {}

  get empty(): boolean {
    return this.deletions.length === 0;
  }

  isDeleted(id: string): boolean {
    return this.deletions.some((d) => d.id === id);
  }

  deletedAt(id: string): number | undefined {
    return this.deletions.find((d) => d.id === id)?.at;
  }

  /** Delete something at an absolute time (seconds after the first deletion). */
  add(id: string, at: number) {
    if (this.isDeleted(id)) return;
    const t = this.deletions.length === 0 ? 0 : Math.max(at, this.deletions[this.deletions.length - 1].at);
    this.deletions.push({ id, at: t });
    this.rebuild();
  }

  /** Bring something back, as if it had never been deleted. */
  restore(id: string) {
    const i = this.deletions.findIndex((d) => d.id === id);
    if (i < 0) return;
    this.deletions.splice(i, 1);
    if (i === 0 && this.deletions.length > 0) {
      const shift = this.deletions[0].at;
      for (const d of this.deletions) d.at -= shift;
    }
    this.rebuild();
  }

  undo(): Deletion | undefined {
    const d = this.deletions.pop();
    this.rebuild();
    return d;
  }

  reset() {
    this.deletions = [];
    this.rebuild();
  }

  get last(): Epoch | undefined {
    return this.epochs[this.epochs.length - 1];
  }

  /** The state of the planet at an absolute time. */
  sample(tAbs: number): State {
    if (this.epochs.length === 0) return baseline();
    let e = this.epochs[0];
    for (const ep of this.epochs) if (ep.start <= tAbs) e = ep;
    return sampleEpoch(e, tAbs - e.start);
  }

  /** A context for derived values (surface temperature etc.) at an absolute time. */
  ctxAt(tAbs: number): Ctx {
    const at = new Map<string, number>();
    for (const d of this.deletions) if (d.at <= tAbs) at.set(d.id, d.at);
    return makeCtx(at, () => tAbs);
  }

  rebuild() {
    this.epochs = [];
    this.events = [];
    this.moot.clear();
    const n = this.deletions.length;
    if (n === 0) return;

    const s = baseline();
    const flags = new Map<string, boolean>();
    const seen = new Set<string>();
    const lastFired = new Map<string, number>();
    let autoCount = 0;

    for (let k = 0; k < n; k++) {
      const start = this.deletions[k].at;
      const end = k + 1 < n ? this.deletions[k + 1].at : start + HORIZON;
      const span = end - start;
      const at = new Map<string, number>();
      for (let j = 0; j <= k; j++) at.set(this.deletions[j].id, this.deletions[j].at);
      let now = start;
      const c = makeCtx(at, () => now);

      // The deletion itself.
      const d = this.deletions[k];
      const def = this.catalog.get(d.id);
      if (!def) continue;
      const parent = def.partOf?.find((p) => at.has(p) && at.get(p)! < d.at + 1e-9 && p !== d.id);
      if (parent) {
        this.moot.add(d.id);
        this.events.push({
          key: `moot:${d.id}`, t: start, source: d.id, sev: 'info',
          title: `${def.name}: already gone`,
          body: `They went when you deleted ${this.catalog.get(parent)?.name.toLowerCase() ?? parent}.`,
        });
      } else if (s.integrity < 0.05 && !def.cosmic) {
        this.moot.add(d.id);
        this.events.push({
          key: `moot:${d.id}`, t: start, source: d.id, sev: 'info',
          title: `${def.name} deleted. Not that anyone notices`,
          body: 'There is no Earth left for this to matter to.',
        });
      } else {
        def.impulse?.(s, c);
      }

      // Everything scheduled to happen inside this epoch.
      const queue: Pending[] = [];
      for (let j = 0; j <= k; j++) {
        const dj = this.deletions[j];
        if (this.moot.has(dj.id)) continue;
        const evs = this.catalog.get(dj.id)?.events ?? [];
        evs.forEach((ev, i) => {
          const r = dj.at - start + ev.at;
          if (r >= 0 && (r < span || (k === n - 1 && r <= span))) queue.push({ r, ev, source: dj.id, key: `${dj.id}:${i}` });
        });
      }
      this.combos.forEach((cb, i) => {
        if (!cb.ids.every((id) => at.has(id) && !this.moot.has(id))) return;
        const t = Math.max(...cb.ids.map((id) => at.get(id)!)) + cb.at;
        const r = t - start;
        if (r >= 0 && r < span) {
          queue.push({ r, source: 'combo', key: `combo:${i}`, ev: { at: cb.at, title: cb.title, body: cb.body, sev: cb.sev } });
        }
      });
      NATURE.forEach((ne, i) => {
        const r = ne.t - start;
        if (r >= 0 && r < span) {
          queue.push({ r, source: 'nature', key: `nature:${i}`, ev: { at: ne.t, title: ne.title, body: ne.body, sev: ne.sev, when: ne.when, effect: ne.effect, cosmic: true } });
        }
      });
      queue.sort((a, b) => a.r - b.r);

      /** Returns true if the event changed the planet. */
      const fire = (p: Pending): boolean => {
        const ev = p.ev;
        if (c.has('time') && p.source !== 'time') return false;
        if (s.integrity < 0.05 && !ev.cosmic && p.source !== 'nature') return false;
        if (ev.when && !ev.when(s, c)) return false;
        this.events.push({ key: p.key, t: start + p.r, source: p.source, title: ev.title, body: ev.body, sev: ev.sev });
        ev.effect?.(s, c);
        return !!ev.effect;
      };

      const watch = () => {
        if (c.has('time')) return;
        const Ts = surfaceTemp(s, c);
        for (const w of WATCHERS) {
          const on = w.test(s, c, Ts, seen);
          // Don't flicker: a watcher may only fire again after a lot more time has passed.
          const last = lastFired.get(w.id);
          const rested = last === undefined || now > last * 3 + YEAR;
          if (on && !flags.get(w.id) && !(w.once && seen.has(w.id)) && rested) {
            this.events.push({ key: `auto:${w.id}:${autoCount++}`, t: now, source: 'auto', title: w.title, body: w.body, sev: w.sev });
            seen.add(w.id);
            lastFired.set(w.id, now);
          }
          flags.set(w.id, on);
        }
      };

      const r = grid(span);
      const epoch: Epoch = { start, end, ids: [...at.keys()], r: [], states: [] };
      let q = 0;
      let prev = 0;
      // After anything jolts the planet, step finely at first and coarser as it settles.
      let kick = 0;
      const advance = (to: number) => {
        while (prev < to) {
          // Floating point: a step must stay large enough to move a time like 3e17 s at all.
          const h = Math.min(to - prev, Math.max(FIRST_STEP, 0.25 * (prev - kick), prev * 1e-9));
          now = start + prev + h;
          step(s, h, c);
          prev += h;
        }
      };
      while (q < queue.length && queue[q].r <= 0) fire(queue[q++]);
      epoch.r.push(0);
      epoch.states.push(clone(s));

      for (let i = 1; i < r.length; i++) {
        const ri = r[i];
        while (q < queue.length && queue[q].r <= ri) {
          const p = queue[q++];
          advance(p.r);
          now = start + p.r;
          if (fire(p)) kick = p.r;
        }
        advance(ri);
        now = start + ri;
        watch();
        epoch.r.push(ri);
        epoch.states.push(clone(s));
      }
      this.epochs.push(epoch);
    }
    this.events.sort((a, b) => a.t - b.t);
  }
}

export function sampleEpoch(e: Epoch, r: number): State {
  const rs = e.r;
  if (r <= rs[0]) return clone(e.states[0]);
  if (r >= rs[rs.length - 1]) return clone(e.states[rs.length - 1]);
  let lo = 0;
  let hi = rs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rs[mid] <= r) lo = mid; else hi = mid;
  }
  const a = e.states[lo];
  const b = e.states[hi];
  const f = (r - rs[lo]) / (rs[hi] - rs[lo]);
  const out = {} as State;
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}
