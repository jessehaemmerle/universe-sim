import type { Category, Deletable } from '../sim/types';

export interface CatalogHandlers {
  toggle: (id: string) => void;
}

/** The list of everything that can be deleted, shown as words you can erase. */
export class CatalogView {
  private buttons = new Map<string, HTMLButtonElement>();
  private sections: { el: HTMLElement; count: HTMLElement; ids: string[] }[] = [];
  private empty: HTMLParagraphElement;

  constructor(
    private readonly list: HTMLElement,
    private readonly hint: HTMLElement,
    search: HTMLInputElement,
    items: readonly Deletable[],
    categories: readonly { id: Category; name: string }[],
    handlers: CatalogHandlers,
  ) {
    for (const cat of categories) {
      const inCat = items.filter((d) => d.cat === cat.id);
      const section = document.createElement('section');
      section.className = 'cat';
      const head = document.createElement('div');
      head.className = 'cat-head';
      const h = document.createElement('h2');
      h.className = 'cat-name';
      h.textContent = cat.name;
      const count = document.createElement('span');
      count.className = 'cat-count num';
      head.append(h, count);
      const words = document.createElement('div');
      words.className = 'words';
      for (const d of inCat) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'word';
        b.textContent = d.name;
        b.dataset.id = d.id;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => handlers.toggle(d.id));
        b.addEventListener('mouseenter', () => this.showHint(d));
        b.addEventListener('focus', () => this.showHint(d));
        words.appendChild(b);
        this.buttons.set(d.id, b);
      }
      section.append(head, words);
      this.list.appendChild(section);
      this.sections.push({ el: section, count, ids: inCat.map((d) => d.id) });
    }
    this.empty = document.createElement('p');
    this.empty.className = 'no-results';
    this.empty.hidden = true;
    this.list.appendChild(this.empty);
    this.list.addEventListener('mouseleave', () => this.showHint(null));

    search.addEventListener('input', () => this.filter(search.value, items));
    this.showHint(null);
  }

  private showHint(d: Deletable | null) {
    this.hint.replaceChildren();
    if (!d) {
      this.hint.textContent = 'Pick anything to delete it. Pick it again to bring it back.';
      return;
    }
    const name = document.createElement('strong');
    name.textContent = d.name;
    this.hint.append(name, document.createTextNode(d.blurb));
  }

  private filter(query: string, items: readonly Deletable[]) {
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const d of items) {
      const hit = !q || d.name.toLowerCase().includes(q) || d.blurb.toLowerCase().includes(q);
      this.buttons.get(d.id)!.hidden = !hit;
      if (hit) shown++;
    }
    for (const s of this.sections) s.el.hidden = s.ids.every((id) => this.buttons.get(id)!.hidden);
    this.empty.hidden = shown > 0;
    this.empty.textContent = `Nothing called “${query.trim()}” yet. Try “moon”, “air” or “bees”.`;
  }

  update(deleted: ReadonlySet<string>, moot: ReadonlySet<string>, names: ReadonlyMap<string, string>) {
    for (const [id, b] of this.buttons) {
      const on = deleted.has(id);
      if ((b.getAttribute('aria-pressed') === 'true') !== on) b.setAttribute('aria-pressed', String(on));
      b.dataset.moot = String(moot.has(id));
      b.title = on ? `Bring back ${names.get(id)?.replace(/^The /, 'the ')}` : `Delete ${names.get(id)?.replace(/^The /, 'the ')}`;
    }
    for (const s of this.sections) {
      const gone = s.ids.filter((id) => deleted.has(id)).length;
      s.count.textContent = gone ? `${gone} of ${s.ids.length} gone` : '';
    }
  }
}
