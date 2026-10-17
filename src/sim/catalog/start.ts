import type { Deletable } from '../types';
import { DAY, HOUR, KYR, MIN, MYR, SUNLIGHT_DELAY, YEAR } from '../units';
import { ev, hit } from './helpers';

/** The four things deleted in the original video. */
export const START: Deletable[] = [
  {
    id: 'moon', name: 'The Moon', cat: 'start', visual: 'moon', cosmic: true,
    blurb: 'Earth’s only natural satellite, 3,474 km across.',
    events: [
      ev(0, 'warn', 'The Moon vanishes', 'Where it hung a moment ago, there is only black sky. Its pull on Earth’s oceans is gone too.', { cosmic: true }),
      ev(1.3, 'info', 'The last moonlight arrives', 'Light from the Moon took 1.3 seconds to reach us. From now on every night is as dark as a new moon.'),
      ev(6 * HOUR, 'warn', 'Tides shrink to a third', 'The Sun still raises tides, but they are less than half as strong as the Moon’s were. High and low tide end up much closer together.', { when: (s) => s.ocean > 0.3 }),
      ev(DAY, 'info', 'No more eclipses', 'Total solar eclipses, and lunar ones, will never happen again.'),
      ev(30 * DAY, 'warn', 'Coral reefs miss their cue', 'Many corals spawn all at once a few nights after a full moon. Without that signal, the timing falls apart and fewer eggs get fertilised.', { when: (s) => s.ocean > 0.3 && s.fish > 0.2 }),
      ev(YEAR, 'warn', 'Tide pools and mudflats shrink', 'The strip of shore that floods and drains each day, home to crabs and mussels and feeding ground for millions of shorebirds, narrows to a fraction of its size.', { when: (s) => s.ocean > 0.3 }),
      ev(100 * YEAR, 'info', 'Days stop getting longer', 'Lunar tides were slowing Earth’s spin by about 2 milliseconds per century. Without the Moon, a day stays roughly 24 hours long.'),
      ev(100 * KYR, 'warn', 'Earth’s tilt starts to wander', 'The Moon kept Earth’s axis steady at around 23°. Without it, tugs from the other planets slowly swing the tilt around over millions of years.'),
      ev(10 * MYR, 'bad', 'Climate swings with the tilt', 'As the tilt drifts, ice ages and hothouses come and go far more wildly than before. Scientists still debate just how extreme it would get.'),
    ],
  },
  {
    id: 'oceans', name: 'The oceans', cat: 'start', visual: 'oceans',
    blurb: 'All 1.3 billion cubic kilometres of seawater.',
    impulse: (s) => { s.ocean = 0; s.seaIce = 0; s.plankton = 0; s.fish = 0; s.clouds *= 0.9; },
    events: [
      ev(0, 'doom', 'The oceans disappear', '71% of the surface is suddenly bare seafloor: mountain ranges, canyons and trenches up to 11 km deep. Every fish, whale and coral reef goes with the water.'),
      ev(2, 'bad', 'Ships fall to the seafloor', 'Every ship at sea drops up to several kilometres. Nearly two million seafarers are at sea at any moment.', { effect: (s) => hit(s, { humans: 0.9998, infra: 0.9 }) }),
      ev(DAY, 'bad', 'The water cycle breaks', 'About 86% of the water that evaporates on Earth came from the oceans. Without them, rain clouds stop forming over most of the planet.'),
      ev(30 * DAY, 'bad', 'Rivers start drying up', 'Rivers are fed by rain and snow, which mostly came from the sea. Lakes, glaciers and groundwater are all that is left.'),
      ev(0.5 * YEAR, 'doom', 'Harvests fail worldwide', 'Without rain, most farmland can’t grow anything. Only fields watered from aquifers, lakes and glacier rivers still produce food.'),
      ev(2 * YEAR, 'bad', 'Temperatures swing wildly', 'The oceans stored heat and released it slowly. Now land everywhere bakes by day and freezes at night, like a desert.'),
      ev(10 * KYR, 'info', 'The seafloor rises', 'Freed from the weight of kilometres of water, the crust under the old oceans slowly springs back up by over a kilometre.'),
      ev(100 * KYR, 'info', 'Melting ice fills a few small seas', 'Some of Greenland’s and Antarctica’s ice melts and flows into the deepest basins. It adds up to barely 2% of the old oceans.', { when: (s) => s.ocean > 0.005 }),
    ],
  },
  {
    id: 'gravity', name: 'Gravity', cat: 'start', visual: 'planet', cosmic: true,
    blurb: 'The force that pulls everything together, everywhere.',
    events: [
      ev(0, 'doom', 'Gravity switches off', 'Nothing pulls anything down anymore. Earth’s spin is still carrying everything sideways at up to 1,670 km/h, while the ground curves away beneath it.'),
      ev(MIN, 'doom', 'People drift upward', 'Moving in a straight line while the ground curves away, people at the equator are already about 60 metres up. Loose air, water and cars follow.'),
      ev(2 * MIN, 'doom', 'The air leaks into space', 'Air is a gas under pressure. With nothing holding it down, it spreads outward at the speed of sound.'),
      ev(5 * MIN, 'doom', 'Earth begins to burst', 'The pressure at Earth’s centre is 3.6 million times that at the surface. Released, it pushes the planet apart from the inside.'),
      ev(SUNLIGHT_DELAY, 'doom', 'The Sun comes apart too', 'Gravity held the Sun together as well. It swells and cools, and its last steady light reaches what’s left of Earth.', { cosmic: true }),
      ev(HOUR, 'doom', 'A cloud of rubble', 'Rock, magma and seawater spread out at several kilometres per second. The glowing inner layers are open to space.', { cosmic: true }),
      ev(DAY, 'info', 'The Moon drifts away', 'The Moon keeps going in a straight line at about 1 km/s. A day later it is almost 90,000 km off its old path.', { cosmic: true, when: (_s, c) => !c.has('moon') }),
      ev(YEAR, 'doom', 'Everything comes apart', 'Planets, stars and galaxies all fly off along the paths they were on. The universe becomes an expanding haze of gas and dust that will never clump into stars again.', { cosmic: true }),
    ],
  },
  {
    id: 'cold', name: 'The cold', cat: 'start', visual: 'ice',
    blurb: 'Nothing on Earth can be colder than 20 °C.',
    impulse: (s) => {
      s.ocean += 0.021 * s.landIce;
      s.landIce = 0;
      s.seaIce = 0;
      s.Td = Math.max(s.Td, 293);
    },
    events: [
      ev(0, 'warn', 'Everything is at least 20 °C', 'Antarctica, the Arctic and every freezer on Earth are suddenly a mild 20 °C. All snow and ice turns to water at once.'),
      ev(30, 'bad', 'Tanks of liquid gas burst', 'Liquid nitrogen, liquid oxygen and liquefied natural gas boil all at once. Tanks at hospitals, factories and on gas carriers rupture.', { effect: (s) => hit(s, { infra: 0.95 }) }),
      ev(HOUR, 'bad', 'Meltwater floods', 'Greenland and Antarctica release their ice as water. Torrents carve new canyons on their way to the sea.'),
      ev(7 * DAY, 'doom', 'The sea rises 70 metres', 'As the meltwater reaches the oceans, coastlines move far inland. Shanghai, Mumbai, New York and Amsterdam go under, and hundreds of millions of people have to flee.', { effect: (s) => hit(s, { infra: 0.8, humans: 0.995 }) }),
      ev(30 * DAY, 'bad', 'Food spoils everywhere', 'Fridges and freezers can’t cool below 20 °C. Food rots and vaccines go bad.', { effect: (s) => hit(s, { infra: 0.9 }) }),
      ev(YEAR, 'bad', 'Winter never comes', 'Pests and diseases that frost used to kill spread toward the poles. Mosquitoes carrying malaria and dengue reach Canada and Scandinavia.'),
      ev(10 * YEAR, 'bad', 'Permafrost thaws', 'The frozen soils of Siberia and Canada hold almost twice as much carbon as the atmosphere. Microbes start digesting it, releasing CO₂ and methane.'),
      ev(300 * YEAR, 'doom', 'Methane escapes from the seabed', 'Ice-like methane hydrates on the seafloor only stay solid while cold. As the deep ocean warms, the methane starts bubbling out.', { when: (s) => s.ocean > 0.3 }),
      ev(10 * KYR, 'bad', 'A hothouse world', 'Earth settles into a climate warmer than any for tens of millions of years. There will never be another ice age.'),
    ],
  },
];
