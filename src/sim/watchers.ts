import { civ, co2Gas, lifeIndex, molten, o2Gas, pressure } from './model';
import type { Ctx, Severity, State } from './types';
import { GYR, KYR, MYR } from './units';

/**
 * Consequences nobody scripted: they fire whenever the simulated planet crosses a line,
 * whatever combination of deletions got it there.
 */
export interface Watcher {
  id: string;
  test: (s: State, c: Ctx, Ts: number, seen: ReadonlySet<string>) => boolean;
  title: string;
  body: string;
  sev: Severity;
  /** Fire only the first time, never again in this world. */
  once?: boolean;
}

const complexLife = (s: State) => s.plants + s.plankton + s.animals + s.insects + s.fish + s.fungi;
const intact = (s: State) => s.integrity > 0.5;
/** The planet is whole and not molten, so news about living things makes sense. */
const liveable = (s: State) => s.integrity > 0.9 && molten(s) < 0.1;
const stillNews = (seen: ReadonlySet<string>) => !seen.has('sterile') && !seen.has('microbes-only');

export const WATCHERS: Watcher[] = [
  {
    id: 'life-halved', sev: 'bad',
    test: (s) => liveable(s) && lifeIndex(s) < 0.5 && lifeIndex(s) > 0.02,
    title: 'Half of all life is gone',
    body: 'Measured by mass, Earth has lost more than half of its living things. Mass extinctions in the past took millions of years to recover from.',
  },
  {
    id: 'recovery', sev: 'good',
    test: (s, _c, _t, seen) => seen.has('life-halved') && lifeIndex(s) > 0.85,
    title: 'Life bounces back',
    body: 'Plants, plankton and animals have recolonised the planet. The species are not the same ones as before, but the biosphere is thriving again.',
  },
  {
    id: 'humans-halved', sev: 'bad',
    test: (s) => liveable(s) && s.humans < 0.5 && s.humans > 0.01,
    title: 'Half of humanity is gone',
    body: 'Over 4 billion people have died, mostly from hunger. Modern farming, trade and medicine feed 8 billion people only while everything keeps working.',
  },
  {
    id: 'humans-few', sev: 'bad',
    test: (s) => liveable(s) && s.humans < 0.01 && s.humans > 0,
    title: 'Fewer than 81 million people left',
    body: 'That is about the world population of 500 BC. The survivors live in scattered groups with whatever food they can grow or find.',
  },
  {
    id: 'humans-extinct', sev: 'doom', once: true,
    test: (s, c, _t, seen) => s.humans === 0 && !c.has('humans') && liveable(s) && stillNews(seen) && !c.has('land') && !c.has('heat') && !c.has('atmosphere') && !c.has('oxygen') && !c.has('iron'),
    title: 'Humans are extinct',
    body: 'The last people die. Our buildings crumble within centuries, but plastic, radioactive waste and the Voyager probes will outlast us for millions of years.',
  },
  {
    id: 'civ-collapse', sev: 'bad',
    test: (s) => liveable(s) && s.humans > 0.02 && civ(s) < 0.2,
    title: 'Global civilisation collapses',
    body: 'Power grids, shipping and supply chains stop working together. Cities empty out as people move to wherever food can be grown.',
  },
  {
    id: 'civ-recover', sev: 'good',
    test: (s, _c, _t, seen) => seen.has('civ-collapse') && civ(s) > 0.7,
    title: 'Civilisation rebuilds',
    body: 'With enough people and energy, factories, power lines and trade routes come back. It took us about 200 years to industrialise the first time.',
  },
  {
    id: 'plants-extinct', sev: 'doom', once: true,
    test: (s, c, _t, seen) => s.plants === 0 && !c.has('plants') && !c.has('land') && liveable(s) && stillNews(seen),
    title: 'The last land plants die',
    body: 'Without plants, soil blows away, rivers turn brown with mud and the land turns into rock desert.',
  },
  {
    id: 'animals-extinct', sev: 'doom', once: true,
    test: (s, c, _t, seen) => s.animals === 0 && !c.has('animals') && !c.has('land') && !c.has('iron') && liveable(s) && stillNews(seen),
    title: 'Land animals are extinct',
    body: 'Not a single bird, mammal, reptile or amphibian is left on land.',
  },
  {
    id: 'fish-extinct', sev: 'doom', once: true,
    test: (s, c, _t, seen) => s.fish === 0 && !c.has('fish') && !c.has('animals') && !c.has('oceans') && !c.has('iron') && liveable(s) && stillNews(seen),
    title: 'The oceans are empty of animals',
    body: 'Fish, whales, squid and coral are gone. Only microbes are left in the water.',
  },
  {
    id: 'microbes-only', sev: 'doom', once: true,
    test: (s) => intact(s) && complexLife(s) === 0 && s.microbes > 0,
    title: 'Only microbes remain',
    body: 'Earth is back where it was for its first 3 billion years: a planet of single cells. Some live kilometres underground, where almost nothing can reach them.',
  },
  {
    id: 'sterile', sev: 'doom', once: true,
    test: (s) => intact(s) && lifeIndex(s) === 0 && s.humans === 0,
    title: 'Earth is sterile',
    body: 'Not a single living cell is left. As far as we know, Earth is now as dead as every other planet.',
  },
  {
    id: 'hothouse', sev: 'bad',
    test: (s, _c, Ts) => liveable(s) && Ts > 308 && Ts < 1000 && lifeIndex(s) > 0,
    title: 'Hothouse Earth',
    body: 'The global average passes 35 °C. The tropics are now too hot and humid for people to survive outdoors.',
  },
  {
    id: 'runaway', sev: 'doom', once: true,
    test: (s) => s.runaway > 0 && s.ocean > 0.02,
    title: 'The oceans start to boil away',
    body: 'A runaway greenhouse: water vapour traps heat, which makes more water vapour. This is probably what happened to Venus.',
  },
  {
    id: 'oceans-gone', sev: 'doom',
    test: (s, c) => s.ocean < 0.01 && !c.has('oceans') && !c.has('gravity') && intact(s),
    title: 'The oceans are gone',
    body: 'All that is left is dry seafloor, up to 11 km deep, crusted with salt.',
  },
  {
    id: 'oceans-return', sev: 'good',
    test: (s, _c, _t, seen) => seen.has('oceans-gone') && s.ocean > 0.3 && intact(s),
    title: 'Rain fills the oceans again',
    body: 'The steam in the sky condenses. It rains for thousands of years, filling the ocean basins back up.',
  },
  {
    id: 'freeze', sev: 'bad',
    test: (s) => intact(s) && s.ocean > 0.05 && s.seaIce > 0.9,
    title: 'The oceans freeze over',
    body: 'Ice covers nearly every sea. Underneath, the water can stay liquid for a very long time, warmed from below by Earth’s interior.',
  },
  {
    id: 'snowball', sev: 'doom',
    test: (s, _c, Ts) => intact(s) && s.ocean > 0.05 && s.seaIce > 0.97 && Ts < 250 && Ts > 150 && s.sun > 0.5,
    title: 'Snowball Earth',
    body: 'Ice reaches the equator. It has happened before: around 700 million years ago Earth froze over for millions of years, until volcanic CO₂ built up enough to thaw it.',
  },
  {
    id: 'ice-age', sev: 'warn',
    test: (s) => intact(s) && s.landIce > 2.2,
    title: 'A new ice age',
    body: 'Ice sheets spread over North America, Europe and Asia, like 20,000 years ago. Sea level drops by more than 100 metres.',
  },
  {
    id: 'ice-free', sev: 'warn',
    test: (s, c) => intact(s) && s.landIce < 0.05 && s.seaIce < 0.01 && s.ocean > 0.1 && !c.has('ice') && !c.has('cold'),
    title: 'No ice left anywhere',
    body: 'Greenland and Antarctica are bare rock and the sea is about 70 metres higher than today. The last time Earth had no ice at all was about 34 million years ago.',
  },
  {
    id: 'thin-air', sev: 'doom', once: true,
    test: (s) => intact(s) && pressure(s) < 0.063 && pressure(s) > 0.002,
    title: 'Air too thin for blood',
    body: 'Below 6% of today’s air pressure (the Armstrong limit), water in your mouth, eyes and lungs boils at body temperature.',
  },
  {
    id: 'no-air', sev: 'doom', once: true,
    test: (s) => intact(s) && pressure(s) <= 0.002,
    title: 'No atmosphere left',
    body: 'The sky is black even in daylight. There is no sound, no weather, and nothing to burn up meteors before they hit.',
  },
  {
    id: 'low-o2', sev: 'bad', once: true,
    test: (s) => liveable(s) && (s.humans > 0 || s.animals > 0) && pressure(s) > 0.063 && o2Gas(s) < 0.12 && o2Gas(s) > 0.01,
    title: 'Oxygen running low',
    body: 'With under 60% of today’s oxygen, people get breathless, confused and eventually pass out. Large animals struggle first.',
  },
  {
    id: 'air-freezes', sev: 'doom', once: true,
    test: (s) => intact(s) && s.T < 75 && s.n2 > 0.1,
    title: 'The air freezes',
    body: 'Around −200 °C, nitrogen and oxygen fall out of the sky as snow and bury the frozen oceans under a layer of solid air.',
  },
  {
    id: 'co2-starved', sev: 'bad', once: true,
    test: (s, c) => intact(s) && co2Gas(s) < 150 && co2Gas(s) > 5 && s.plants > 0.05 && !c.has('co2') && pressure(s) > 0.1,
    title: 'Not enough CO₂ for most plants',
    body: 'Below about 150 ppm, wheat, rice, trees and most other plants cannot photosynthesise fast enough to grow.',
  },
  {
    id: 'molten', sev: 'doom',
    test: (s) => s.integrity > 0.05 && molten(s) > 0.5,
    title: 'The surface melts',
    body: 'Earth’s crust turns into a glowing ocean of magma, as it was 4.5 billion years ago.',
  },
  {
    id: 'crust', sev: 'info',
    test: (s, _c, _t, seen) => seen.has('molten') && s.integrity > 0.05 && molten(s) < 0.1,
    title: 'A solid crust forms again',
    body: 'The magma ocean has cooled enough to freeze into dark, glassy rock.',
  },
  {
    id: 'tilt', sev: 'bad', once: true,
    test: (s) => intact(s) && s.tilt > 45,
    title: 'Earth tips over',
    body: 'With a tilt beyond 45°, the poles get more sunlight over a year than the equator. Summers bring months of scorching midnight sun, winters months of darkness.',
  },
  {
    id: 'outer', sev: 'bad', once: true,
    test: (s) => s.dist > 5,
    title: 'Earth passes Jupiter’s orbit',
    body: 'From 5 AU out, the Sun is a dazzling star but gives 25 times less warmth than it used to.',
  },
  {
    id: 'interstellar', sev: 'info', once: true,
    test: (s) => s.dist > 120,
    title: 'Earth enters interstellar space',
    body: 'Earth crosses the edge of the Sun’s bubble of solar wind, where Voyager 1 went in 2012. It will drift between the stars for billions of years.',
  },
];

/* ---------- things that happen anyway ---------- */

export interface NaturalEvent {
  t: number; // seconds after the first deletion
  title: string;
  body: string;
  sev: Severity;
  when: (s: State, c: Ctx) => boolean;
  effect?: (s: State, c: Ctx) => void;
}

const volcanic = (c: Ctx) => !c.has('volcanoes') && !c.has('tectonics') && !c.has('heat') && !c.has('core') && !c.has('iron');
const sunAround = (s: State, c: Ctx) => s.sun > 0.5 && !c.has('sun') && !c.has('gravity') && !c.has('strong');

export const NATURE: NaturalEvent[] = [
  {
    t: 50 * KYR, sev: 'warn',
    title: 'A supervolcano erupts',
    body: 'Statistically, an eruption the size of Toba 74,000 years ago happens every 50,000 years or so. Ash and sulfur dim the sky for several years.',
    when: (s, c) => intact(s) && volcanic(c) && molten(s) < 0.1 && sunAround(s, c) && s.dist < 2,
    effect: (s) => { s.dust = Math.min(1, s.dust + 0.35); },
  },
  {
    t: 1 * MYR, sev: 'info',
    title: 'From here on, nobody can predict humans',
    body: 'A million years is longer than our species has existed. The simulation assumes people stick around for as long as the planet lets them.',
    when: (s) => s.humans > 0.001,
  },
  {
    t: 100 * MYR, sev: 'doom',
    title: 'A dinosaur-killer asteroid hits',
    body: 'Rocks 10 km across hit Earth about once every 100 million years, so odds are one has arrived by now. Global firestorms and years of darkness bring a mass extinction.',
    when: (s, c) => intact(s) && !c.has('asteroids') && molten(s) < 0.5 && lifeIndex(s) > 0.05,
    effect: (s) => {
      s.dust = 1;
      s.plants *= 0.5; s.plankton *= 0.4; s.animals *= 0.25; s.insects *= 0.5; s.fish *= 0.35; s.humans *= 0.1; s.infra *= 0.2;
    },
  },
  {
    t: 250 * MYR, sev: 'bad',
    title: 'The continents merge into a supercontinent',
    body: 'Plate tectonics pushes the continents back together. A 2023 study suggests its hot, dry interior would leave most of it too hot for mammals.',
    when: (s, c) => intact(s) && !c.has('tectonics') && !c.has('land') && !c.has('heat') && molten(s) < 0.5,
    effect: (s) => { s.animals *= 0.5; s.humans *= 0.5; },
  },
  {
    t: 1 * GYR, sev: 'bad',
    title: 'The Sun is 10% brighter than today',
    body: 'The Sun slowly brightens as it ages. Now it is hot enough to drive water vapour high into the air, where it is lost to space. The oceans start to disappear.',
    when: (s, c) => intact(s) && sunAround(s, c) && s.dist < 1.5 && s.ocean > 0.1,
  },
  {
    t: 4.5 * GYR, sev: 'info',
    title: 'Andromeda fills the night sky',
    body: 'The Andromeda galaxy swings close to the Milky Way. Recent estimates put the chance of the two merging within 10 billion years at roughly 50/50.',
    when: (_s, c) => !c.has('stars') && !c.has('strong'),
  },
  {
    t: 5 * GYR, sev: 'warn',
    title: 'The Sun runs out of hydrogen in its core',
    body: 'It starts to swell into a red giant. Over the next 2.5 billion years it grows about 250 times wider and thousands of times brighter.',
    when: (s, c) => sunAround(s, c),
  },
  {
    t: 7.59 * GYR, sev: 'doom',
    title: 'The Sun swallows Earth',
    body: 'The red giant Sun reaches past Earth’s orbit. Drag in its outer layers slows Earth down until it spirals in and vaporises, whatever you deleted.',
    when: (s, c) => s.integrity > 0.05 && sunAround(s, c) && s.dist < 3,
    effect: (s) => {
      s.integrity = 0; s.T = 3000; s.ocean = 0; s.steam = 0; s.n2 = 0; s.o2 = 0; s.co2 = 0;
      s.microbes = 0; s.plankton = 0; s.plants = 0; s.fungi = 0; s.insects = 0; s.animals = 0; s.fish = 0; s.humans = 0;
    },
  },
  {
    t: 7.6 * GYR, sev: 'good',
    title: 'Earth escapes the Sun’s fate',
    body: 'Because Earth was drifting far away, it is spared when the Sun becomes a red giant. Earth may well outlive the Sun.',
    when: (s) => s.integrity > 0.5 && s.dist >= 3,
  },
  {
    t: 7.8 * GYR, sev: 'info',
    title: 'The Sun becomes a white dwarf',
    body: 'Having shed its outer layers, the Sun shrinks to a dim, Earth-sized ember that will cool for trillions of years.',
    when: (s, c) => sunAround(s, c),
  },
];

