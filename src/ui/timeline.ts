import type { SimEvent } from '../sim/types';
import { DAY, GYR, HOUR, HORIZON, KYR, MIN, MYR, YEAR } from '../sim/units';
import { duration, shortDuration } from './format';

/** The timeline is logarithmic: position x = log10(1 + seconds). */
export const X_MAX = Math.log10(1 + HORIZON);
export const toSeconds = (x: number) => Math.pow(10, x) - 1;
export const toX = (t: number) => Math.log10(1 + Math.max(0, t));

const TICKS = [1, MIN, HOUR, DAY, YEAR, KYR, MYR, GYR];
export const SPEEDS = [1, 4, 16];

export interface TimelineHandlers {
  play: () => void;
  scrub: (x: number) => void;
  speed: () => void;
  undo: () => void;
  reset: () => void;
}

export class TimelineView {
  private markerSig = '';
  private dragging = false;

  constructor(
    private readonly el: {
      play: HTMLButtonElement; time: HTMLElement; note: HTMLElement; track: HTMLInputElement;
      markers: HTMLElement; ticks: HTMLElement; speed: HTMLButtonElement; undo: HTMLButtonElement; reset: HTMLButtonElement;
    },
    h: TimelineHandlers,
  ) {
    el.play.addEventListener('click', h.play);
    el.speed.addEventListener('click', h.speed);
    el.undo.addEventListener('click', h.undo);
    el.reset.addEventListener('click', h.reset);
    el.track.addEventListener('input', () => {
      this.dragging = true;
      h.scrub((Number(el.track.value) / 1000) * X_MAX);
    });
    el.track.addEventListener('change', () => (this.dragging = false));
    el.track.addEventListener('pointerup', () => (this.dragging = false));
    for (const t of TICKS) {
      const s = document.createElement('span');
      s.textContent = shortDuration(t);
      if (t === MIN || t === HOUR || t === KYR) s.dataset.minor = 'true';
      s.style.left = `${(toX(t) / X_MAX) * 100}%`;
      el.ticks.appendChild(s);
    }
  }

  update(o: {
    x: number; playing: boolean; speed: number; started: boolean; frozen: boolean;
    note: string; canUndo: boolean; markers: readonly SimEvent[]; epochStart: number;
  }) {
    const { el } = this;
    el.play.dataset.playing = String(o.playing);
    el.play.setAttribute('aria-label', o.playing ? 'Pause' : 'Play');
    el.play.disabled = !o.started || o.frozen;
    el.track.disabled = !o.started || o.frozen;
    if (!this.dragging) el.track.value = String(Math.round((o.x / X_MAX) * 1000));
    el.track.style.setProperty('--fill', `${(o.x / X_MAX) * 100}%`);
    const t = toSeconds(o.x);
    el.time.textContent = !o.started ? 'Ready' : o.frozen ? 'Stopped' : `T + ${duration(t)}`;
    el.note.textContent = o.note;
    el.speed.textContent = `${o.speed}×`;
    el.undo.disabled = !o.canUndo;
    el.reset.disabled = !o.started;

    const sig = `${o.epochStart}|${o.markers.length}`;
    if (sig !== this.markerSig) {
      this.markerSig = sig;
      const frag = document.createDocumentFragment();
      for (const e of o.markers) {
        const i = document.createElement('i');
        i.dataset.sev = e.sev;
        i.style.left = `${(toX(e.t - o.epochStart) / X_MAX) * 100}%`;
        i.title = e.title;
        frag.appendChild(i);
      }
      el.markers.replaceChildren(frag);
    }
  }
}
