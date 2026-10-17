import type { Discovery } from '../sim/discoveries';

const KEY = 'delete-anything:discoveries';

function loadFound(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFound(found: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    /* private mode or storage blocked: discoveries just won't persist */
  }
}

export class DiscoveriesView {
  readonly found = loadFound();

  constructor(
    private readonly all: readonly Discovery[],
    private readonly el: { button: HTMLButtonElement; count: HTMLElement; dialog: HTMLDialogElement; list: HTMLElement; summary: HTMLElement; close: HTMLButtonElement },
  ) {
    el.button.addEventListener('click', () => {
      this.render();
      el.dialog.showModal();
    });
    el.close.addEventListener('click', () => el.dialog.close());
    el.dialog.addEventListener('click', (e) => { if (e.target === el.dialog) el.dialog.close(); });
    this.updateCount();
  }

  /** Mark discoveries as found; returns the ones that are new. */
  unlock(ids: string[]): Discovery[] {
    const fresh = ids.filter((id) => !this.found.has(id));
    if (!fresh.length) return [];
    for (const id of fresh) this.found.add(id);
    saveFound(this.found);
    this.updateCount();
    return this.all.filter((d) => fresh.includes(d.id));
  }

  private updateCount() {
    this.el.count.textContent = `${this.found.size}/${this.all.length}`;
  }

  private render() {
    this.el.summary.textContent = `${this.found.size} of ${this.all.length} found. They stay found on this device.`;
    const frag = document.createDocumentFragment();
    for (const d of this.all) {
      const li = document.createElement('li');
      const got = this.found.has(d.id);
      li.dataset.found = String(got);
      const name = document.createElement('strong');
      name.textContent = got ? d.name : 'Not found yet';
      li.append(name, document.createTextNode(d.hint));
      frag.appendChild(li);
    }
    this.el.list.replaceChildren(frag);
  }
}
