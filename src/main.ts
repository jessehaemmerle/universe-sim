import './styles.css';
import { Sound } from './audio/audio';
import { PlanetView } from './render/scene';
import { visualsFrom } from './render/visuals';
import { CATALOG, CATEGORIES, COMBOS, DELETABLES } from './sim/catalog';
import { DISCOVERIES, type DiscoveryCtx } from './sim/discoveries';
import { lifeIndex } from './sim/model';
import type { SimEvent } from './sim/types';
import { World } from './sim/world';
import { CatalogView } from './ui/catalog';
import { Caption, Toast } from './ui/caption';
import { DiscoveriesView } from './ui/discoveries';
import { FeedView, VitalsView } from './ui/status';
import { SPEEDS, TimelineView, X_MAX, toSeconds, toX } from './ui/timeline';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Timeline decades per real second at 1×: the whole 10 billion years takes about 80 s. */
const BASE_SPEED = 0.22;
const SOUND_KEY = 'delete-anything:sound';

const names = new Map(DELETABLES.map((d) => [d.id, d.name]));
const world = new World(CATALOG, COMBOS);
const sound = new Sound();
const caption = new Caption($('caption'));
const toast = new Toast($('toast'));

let x = 0;
let playing = false;
let speedIdx = 0;
let dwell = 0;
let lastAbs = 0;
let restoredSomething = false;

const curAbs = () => (world.last ? world.last.start + toSeconds(x) : 0);
const frozen = () => world.isDeleted('time');

/** Time of an event, counted from the deletion that started its stretch of the timeline. */
function relTime(t: number): number {
  let start = 0;
  for (const e of world.epochs) if (e.start <= t + 1e-9) start = e.start;
  return t - start;
}

function lower(name: string) {
  return name.replace(/^The /, 'the ');
}

/* ---------- actions ---------- */

function del(id: string) {
  const def = CATALOG.get(id);
  if (!def) return;
  const at = world.empty ? 0 : curAbs();
  world.add(id, at);
  x = 0;
  lastAbs = at - Math.max(1e-6, at * 1e-12);
  playing = !frozen();
  dwell = 1.5;
  view?.erase(def.visual);
  if (id === 'strong') view?.vaporise();
  sound.erase();
  refreshCatalog();
}

function restore(id: string) {
  const abs = curAbs();
  const first = world.deletions[0];
  const shift = first?.id === id && world.deletions[1] ? world.deletions[1].at : 0;
  world.restore(id);
  restoredSomething = true;
  afterRemoval(abs - shift);
  toast.show(`${names.get(id)} is back`, 'As if it had never been deleted.');
}

function undo() {
  const d = world.deletions[world.deletions.length - 1];
  if (!d) return;
  world.undo();
  restoredSomething = true;
  afterRemoval(d.at);
  toast.show(`Undid deleting ${lower(names.get(d.id) ?? d.id)}`, 'Time is back to the moment you deleted it.');
}

function afterRemoval(abs: number) {
  if (world.empty) {
    resetClock();
  } else {
    x = Math.min(X_MAX, toX(Math.max(0, abs - world.last!.start)));
    lastAbs = curAbs();
  }
  sound.restore();
  refreshCatalog();
}

function resetClock() {
  x = 0;
  playing = false;
  lastAbs = 0;
  caption.showText('Pick anything to delete', 'Then watch what happens to the Earth.');
}

function reset() {
  world.reset();
  resetClock();
  refreshCatalog();
}

function toggle(id: string) {
  sound.start();
  if (world.isDeleted(id)) restore(id);
  else del(id);
}

/* ---------- interface ---------- */

const catalog = new CatalogView($('catalog-list'), $('catalog-hint'), $<HTMLInputElement>('search'), DELETABLES, CATEGORIES, { toggle });
const vitals = new VitalsView($('vitals'), $('verdict'));
const feed = new FeedView($<HTMLOListElement>('feed'), $('feed-empty'), names);
const discoveries = new DiscoveriesView(DISCOVERIES, {
  button: $<HTMLButtonElement>('discoveries-btn'), count: $('disc-count'), dialog: $<HTMLDialogElement>('discoveries'),
  list: $('disc-list'), summary: $('disc-summary'), close: $<HTMLButtonElement>('disc-close'),
});
const timeline = new TimelineView(
  {
    play: $<HTMLButtonElement>('play'), time: $('clock-time'), note: $('clock-note'), track: $<HTMLInputElement>('track'),
    markers: $('markers'), ticks: $('ticks'), speed: $<HTMLButtonElement>('speed'), undo: $<HTMLButtonElement>('undo'), reset: $<HTMLButtonElement>('reset'),
  },
  {
    play: () => { sound.start(); if (x >= X_MAX - 1e-6) x = 0; playing = !playing; },
    scrub: (nx) => { x = nx; },
    speed: () => { speedIdx = (speedIdx + 1) % SPEEDS.length; },
    undo,
    reset,
  },
);

function refreshCatalog() {
  catalog.update(new Set(world.deletions.map((d) => d.id)), world.moot, names);
}

// Sound toggle, remembered on this device.
const soundBtn = $<HTMLButtonElement>('sound-btn');
let soundPref = true;
try { soundPref = localStorage.getItem(SOUND_KEY) !== '0'; } catch { /* storage unavailable */ }
sound.enabled = soundPref;
soundBtn.setAttribute('aria-pressed', String(soundPref));
soundBtn.addEventListener('click', () => {
  const on = soundBtn.getAttribute('aria-pressed') !== 'true';
  soundBtn.setAttribute('aria-pressed', String(on));
  sound.setEnabled(on);
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
});

// Phone tabs: tap a tab to show its sheet, tap it again to fold the sheet away.
document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    const tab = b.dataset.tab!;
    const body = document.body;
    if (body.dataset.tab === tab && body.dataset.sheet !== 'closed') body.dataset.sheet = 'closed';
    else { body.dataset.tab = tab; body.dataset.sheet = 'open'; }
    document.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.tab === body.dataset.tab && body.dataset.sheet !== 'closed')));
    requestAnimationFrame(layout);
  });
});

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('input, textarea, dialog')) return;
  if (e.code === 'Space' && !world.empty && !frozen()) {
    e.preventDefault();
    playing = !playing;
  }
});

/* ---------- 3D ---------- */

let view: PlanetView | null = null;

function layout() {
  if (!view) return;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const top = $('top').getBoundingClientRect().bottom;
  const tl = $('timeline').getBoundingClientRect();
  if (W >= 900) {
    view.setInsets({
      left: $('catalog').getBoundingClientRect().right,
      right: W - $('status').getBoundingClientRect().left,
      top,
      bottom: H - tl.top,
    });
  } else {
    view.setInsets({ left: 0, right: 0, top, bottom: H - tl.top });
  }
}

async function boot() {
  const loading = $('loading');
  try {
    view = new PlanetView($('stage'));
    const big = window.innerWidth > 900 && view.renderer.capabilities.maxTextureSize >= 4096;
    await view.load(`./textures/earth-color-${big ? '4k' : '2k'}.jpg`, './textures/earth-data.png');
    view.canvas.addEventListener('wheel', () => view?.markZoomed(), { passive: true });
    window.addEventListener('resize', layout);
    layout();
    loading.classList.add('done');
  } catch (err) {
    console.error(err);
    loading.classList.add('error');
    loading.replaceChildren(Object.assign(document.createElement('p'), {
      textContent: 'The 3D Earth could not start. It needs WebGL 2, which recent versions of Chrome, Firefox, Safari and Edge all support.',
    }));
  }
}

/* ---------- main loop ---------- */

let prev = performance.now();
let uiTimer = 0;
let discTimer = 0;
let clockSeconds = 0;

function passEvents(from: number, to: number): SimEvent[] {
  return world.events.filter((e) => e.t > from && e.t <= to);
}

function loop(now: number) {
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;
  clockSeconds += dt;

  if (playing && !world.empty && !frozen()) {
    let v = BASE_SPEED * SPEEDS[speedIdx];
    if (dwell > 0) { v *= 0.3; dwell -= dt; }
    x = Math.min(X_MAX, x + v * dt);
    if (x >= X_MAX) playing = false;
  }
  if (frozen()) playing = false;

  const abs = curAbs();
  if (abs > lastAbs) {
    for (const e of passEvents(lastAbs, abs)) {
      caption.show(e, relTime(e.t), clockSeconds);
      sound.event(e.sev);
      if (e.sev !== 'info') dwell = Math.max(dwell, 1.1);
    }
  }
  lastAbs = abs;
  caption.tick(clockSeconds);

  const s = world.sample(abs);
  const c = world.ctxAt(abs);
  if (view) {
    view.setVisuals(visualsFrom(s, c));
    view.frame(dt);
  }

  uiTimer -= dt;
  if (uiTimer <= 0) {
    uiTimer = 0.1;
    vitals.update(s, c);
    const happened = world.events.filter((e) => e.t <= abs + 1e-9);
    feed.update(happened, relTime);
    const last = world.last;
    const lastDel = world.deletions[world.deletions.length - 1];
    timeline.update({
      x, playing, speed: SPEEDS[speedIdx], started: !world.empty, frozen: frozen(),
      note: world.empty ? 'Delete something to start the clock' : frozen() ? 'Time itself is deleted' : `since deleting ${lower(names.get(lastDel.id) ?? '')}`,
      canUndo: !world.empty,
      markers: last ? world.events.filter((e) => e.t >= last.start && e.t <= last.end) : [],
      epochStart: last?.start ?? 0,
    });
    const tabCount = $('tab-count');
    tabCount.textContent = happened.length ? String(happened.length) : '';
    sound.mood(lifeIndex(s), 1 - Math.min(1, s.integrity * (0.3 + 0.7 * lifeIndex(s))));
  }

  discTimer -= dt;
  if (discTimer <= 0 && !world.empty) {
    discTimer = 0.5;
    const happenedKeys = new Set<string>();
    const happenedEvents: SimEvent[] = [];
    for (const e of world.events) if (e.t <= abs + 1e-9) { happenedKeys.add(e.key); happenedEvents.push(e); }
    const dctx: DiscoveryCtx = {
      s, c, deleted: new Set(world.deletions.map((d) => d.id)), happened: happenedKeys, events: happenedEvents,
      tAbs: abs, restored: restoredSomething,
    };
    const got = discoveries.unlock(DISCOVERIES.filter((d) => d.test(dctx)).map((d) => d.id));
    for (const d of got) {
      toast.show(`Discovery: ${d.name}`, d.hint);
      sound.discovery();
    }
  }

  requestAnimationFrame(loop);
}

// Hook for automated browser tests: ?test exposes a way to jump along the timeline.
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as Record<string, unknown>).__game = {
    world,
    jump: (seconds: number) => { x = Math.min(X_MAX, toX(seconds)); },
    pause: () => { playing = false; },
  };
}

refreshCatalog();
resetClock();
void boot();
requestAnimationFrame(loop);
