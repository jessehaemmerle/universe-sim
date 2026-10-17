import { dayHours, lifeIndex, molten, surfaceTemp } from './model';
import type { Ctx, SimEvent, State } from './types';
import { GYR, HOUR, MYR } from './units';

export interface DiscoveryCtx {
  s: State;
  c: Ctx;
  deleted: ReadonlySet<string>;
  /** Event keys that have happened so far. */
  happened: ReadonlySet<string>;
  /** Event sources and severities that have happened so far. */
  events: readonly SimEvent[];
  /** Seconds since the first deletion. */
  tAbs: number;
  restored: boolean;
}

export interface Discovery {
  id: string;
  name: string;
  /** How to get it, shown before it is found. */
  hint: string;
  test: (d: DiscoveryCtx) => boolean;
}

const auto = (d: DiscoveryCtx, id: string) => d.events.some((e) => e.source === 'auto' && e.key.startsWith(`auto:${id}:`));
const all = (d: DiscoveryCtx, ...ids: string[]) => ids.every((id) => d.deleted.has(id));

export const DISCOVERIES: Discovery[] = [
  { id: 'first', name: 'First deletion', hint: 'Delete anything.', test: (d) => d.deleted.size >= 1 },
  { id: 'reel', name: 'As seen in the video', hint: 'Delete the Moon, the oceans, gravity and the cold.', test: (d) => all(d, 'moon', 'oceans', 'gravity', 'cold') },
  { id: 'snowball', name: 'Snowball Earth', hint: 'Freeze the entire planet.', test: (d) => auto(d, 'snowball') },
  { id: 'hothouse', name: 'Hothouse', hint: 'Push the global average above 35 °C.', test: (d) => auto(d, 'hothouse') },
  { id: 'venus', name: 'Venus 2.0', hint: 'Make the surface hotter than 400 °C.', test: (d) => d.s.integrity > 0.5 && surfaceTemp(d.s, d.c) > 673 },
  { id: 'magma', name: 'Back to the magma', hint: 'Melt Earth’s surface.', test: (d) => d.s.integrity > 0.05 && molten(d.s) > 0.5 },
  { id: 'rogue', name: 'Rogue planet', hint: 'Send Earth out of the Solar System.', test: (d) => auto(d, 'interstellar') },
  { id: 'shattered', name: 'Shattered', hint: 'Blow Earth apart.', test: (d) => d.s.integrity < 0.1 },
  { id: 'speedrun', name: 'Speedrun', hint: 'Destroy Earth within an hour of your first deletion.', test: (d) => d.s.integrity < 0.1 && d.tAbs < HOUR },
  { id: 'void', name: 'Nothing at all', hint: 'Take apart every atom.', test: (d) => d.deleted.has('strong') },
  { id: 'clock', name: 'Stop the clock', hint: 'Make sure nothing ever happens again.', test: (d) => d.deleted.has('time') },
  { id: 'sterile', name: 'Sterile', hint: 'Leave Earth in one piece, but without a single living cell.', test: (d) => auto(d, 'sterile') },
  { id: 'microbes', name: 'Back to the beginning', hint: 'Leave only microbes alive.', test: (d) => auto(d, 'microbes-only') },
  { id: 'shrug', name: 'Did anyone notice?', hint: 'Delete something Earth doesn’t care about.', test: (d) => d.deleted.has('mars') || d.deleted.has('blackhole') },
  { id: 'heal', name: 'It grows back', hint: 'Watch something you deleted repair itself.', test: (d) => d.events.some((e) => ['clouds', 'ozone', 'vapor', 'rivers'].includes(e.source) && e.sev === 'good') },
  { id: 'recovery', name: 'Life finds a way', hint: 'See life bounce back after losing half of everything.', test: (d) => auto(d, 'recovery') },
  { id: 'waterworld', name: 'Water world', hint: 'Get rid of every continent.', test: (d) => d.deleted.has('land') },
  { id: 'dune', name: 'Desert planet', hint: 'Lose the oceans but keep life going for a million years.', test: (d) => d.s.ocean < 0.02 && lifeIndex(d.s) > 0.05 && d.tAbs > MYR },
  { id: 'extinct', name: 'Nobody home', hint: 'Make humans go extinct without deleting them.', test: (d) => auto(d, 'humans-extinct') },
  { id: 'wild', name: 'Nobody misses us', hint: 'Remove humans and watch wildlife thrive.', test: (d) => d.deleted.has('humans') && d.s.animals > 1.05 },
  { id: 'longday', name: 'The longest day', hint: 'Make a single day last more than a month.', test: (d) => dayHours(d.s, d.c) > 720 },
  { id: 'tipped', name: 'Tipping point', hint: 'Tip Earth past 45°.', test: (d) => auto(d, 'tilt') },
  { id: 'airsnow', name: 'Snow made of air', hint: 'Freeze the atmosphere solid.', test: (d) => auto(d, 'air-freezes') },
  { id: 'iceage', name: 'Ice age', hint: 'Bring on a new ice age.', test: (d) => auto(d, 'ice-age') },
  { id: 'escape', name: 'Outlive the Sun', hint: 'Keep Earth safe from the Sun’s old age.', test: (d) => d.happened.has('nature:8') },
  { id: 'inevitable', name: 'Inevitable', hint: 'Reach the day the Sun swallows Earth.', test: (d) => d.happened.has('nature:7') },
  { id: 'deeptime', name: 'Deep time', hint: 'Watch a billion years go by.', test: (d) => d.tAbs >= GYR },
  { id: 'ten', name: 'Spring cleaning', hint: 'Delete 10 things in one run.', test: (d) => d.deleted.size >= 10 },
  { id: 'thirty', name: 'Delete everything', hint: 'Delete 30 things in one run.', test: (d) => d.deleted.size >= 30 },
  { id: 'rebuild', name: 'Rebuild', hint: 'See civilisation recover after a collapse.', test: (d) => auto(d, 'civ-recover') },
  { id: 'helpful', name: 'Actually helpful', hint: 'Delete something the world is better off without.', test: (d) => d.deleted.has('mosquitoes') || d.deleted.has('nukes') },
  { id: 'paradox', name: 'Paradox', hint: 'Delete two rules that can’t both be true.', test: (d) => all(d, 'cold', 'heat') },
  { id: 'regret', name: 'Second thoughts', hint: 'Bring something back.', test: (d) => d.restored },
];
