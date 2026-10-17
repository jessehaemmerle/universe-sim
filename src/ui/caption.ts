import type { SimEvent } from '../sim/types';
import { duration } from './format';

const RANK = { info: 0, good: 1, warn: 1, bad: 2, doom: 3 } as const;

/** Big text over the globe for the most important thing that just happened. */
export class Caption {
  private current: { el: HTMLDivElement; rank: number; until: number } | null = null;

  constructor(private readonly root: HTMLElement) {}

  show(e: SimEvent, rel: number, now: number) {
    const rank = RANK[e.sev];
    // A quieter event never pushes a louder one off screen early.
    if (this.current && now < this.current.until - 2.5 && rank < this.current.rank) return;
    const el = document.createElement('div');
    const t = document.createElement('span');
    t.className = 'c-time';
    t.textContent = rel <= 0.0005 ? 'Instantly' : `+${duration(rel)}`;
    const title = document.createElement('span');
    title.className = 'c-title';
    title.dataset.sev = e.sev;
    title.textContent = e.title;
    const body = document.createElement('span');
    body.className = 'c-body';
    body.textContent = e.body;
    el.append(t, title, body);
    this.root.replaceChildren(el);
    this.current = { el, rank, until: now + 5 + rank };
  }

  showText(title: string, note: string) {
    const el = document.createElement('div');
    const t = document.createElement('span');
    t.className = 'c-title';
    t.textContent = title;
    const b = document.createElement('span');
    b.className = 'c-body';
    b.textContent = note;
    el.append(t, b);
    this.root.replaceChildren(el);
    this.current = { el, rank: -1, until: Infinity };
  }

  tick(now: number) {
    if (this.current && now > this.current.until) {
      this.current.el.classList.add('fading');
      const el = this.current.el;
      setTimeout(() => el.remove(), 700);
      this.current = null;
    }
  }

  clear() {
    this.root.replaceChildren();
    this.current = null;
  }
}

export class Toast {
  private timer = 0;

  constructor(private readonly el: HTMLElement) {}

  show(title: string, note: string) {
    const strong = document.createElement('span');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = note;
    this.el.replaceChildren(strong, small);
    this.el.classList.add('show');
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.el.classList.remove('show'), 3200);
  }
}
