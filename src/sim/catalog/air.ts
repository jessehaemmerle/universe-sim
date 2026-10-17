import { volcanic } from '../model';
import type { Deletable } from '../types';
import { DAY, HOUR, KYR, MIN, MYR, YEAR } from '../units';
import { coreCollapse, ev, hit } from './helpers';

export const AIR: Deletable[] = [
  {
    id: 'oxygen', name: 'Oxygen', cat: 'air', partOf: ['atmosphere'],
    blurb: 'All the oxygen gas in the air and the water, 21% of the atmosphere.',
    impulse: (s) => { s.o2 = 0; s.ozone = 0; },
    events: [
      ev(0, 'doom', 'A fifth of the air vanishes', 'Air pressure drops by 21% at once, like being whisked up a 2,000 m mountain. Every fire on Earth goes out.'),
      ev(10, 'doom', 'People black out', 'Every breath now pulls oxygen out of the blood instead of putting it in. Consciousness lasts seconds.'),
      ev(5 * MIN, 'doom', 'The animals are dead', 'Mammals, birds, fish and insects all need oxygen. A few worms and tiny animals that can live without it hang on.'),
      ev(7 * DAY, 'bad', 'Plants suffocate at night', 'Plants make oxygen in sunlight but need it to breathe, especially in the dark and in their roots. Many start to die.'),
      ev(YEAR, 'info', 'A planet of anaerobes', 'Bacteria that can’t stand oxygen, like the ones that ruled Earth 2.5 billion years ago, take over.'),
      ev(10 * MYR, 'info', 'Oxygen slowly returns', 'Surviving algae keep making oxygen, but rebuilding today’s levels takes many millions of years.', { when: (s) => s.plankton > 0.05 || s.plants > 0.05 }),
    ],
  },
  {
    id: 'nitrogen', name: 'Nitrogen', cat: 'air', partOf: ['atmosphere'],
    blurb: 'All the nitrogen gas in the air, 78% of the atmosphere.',
    impulse: (s) => { s.n2 = 0; },
    events: [
      ev(0, 'warn', 'Air pressure drops to a fifth', 'The air is now almost pure oxygen. Oddly, you can breathe normally: your lungs get exactly as much oxygen as before.'),
      ev(MIN, 'doom', 'Everything burns', 'In nearly pure oxygen, fires burn fiercely and things that barely burned before go up in flames. Wildfires sweep across the continents.', {
        effect: (s) => { s.dust = Math.max(s.dust, 0.6); hit(s, { plants: 0.6, animals: 0.85, insects: 0.8, humans: 0.97, infra: 0.8 }); },
      }),
      ev(HOUR, 'warn', 'Planes struggle', 'Thin air gives wings less lift. Planes can only fly low and fast.'),
      ev(DAY, 'info', 'Water boils at 61 °C', 'Lower pressure means a lower boiling point. Cooking pasta takes forever.'),
      ev(YEAR, 'doom', 'The fertiliser runs out', 'Artificial fertiliser is made from nitrogen in the air. That source is gone, and about half the world’s food depended on it.'),
      ev(10 * YEAR, 'warn', 'A colder planet', 'Thinner air traps less heat. Earth cools by several degrees.'),
      ev(KYR, 'bad', 'Soils run low on nitrogen', 'Bacteria can no longer pull nitrogen from the air to feed plants. Life has to run on the nitrogen left in soil and water.'),
    ],
  },
  {
    id: 'co2', name: 'Carbon dioxide', cat: 'air', partOf: ['atmosphere'],
    blurb: 'Every molecule of CO₂ in the air and dissolved in the oceans.',
    impulse: (s) => { s.co2 = 0; },
    events: [
      ev(0, 'warn', 'The CO₂ is gone', 'It was only 0.04% of the air, but it’s what plants build themselves from.'),
      ev(DAY, 'doom', 'Photosynthesis stops', 'Plants, algae and plankton can no longer turn sunlight into food. They start living off their reserves.'),
      ev(30 * DAY, 'doom', 'Crops wither', 'Fields everywhere stop growing. The food already in storage is all there is.'),
      ev(YEAR, 'doom', 'The cold sets in', 'CO₂ holds the greenhouse effect together. Without it, water vapour freezes out of the air too, and Earth cools fast.'),
      ev(100 * KYR, 'good', 'Volcanoes refill the air', 'Volcanoes keep breathing out CO₂. With the oceans frozen, rocks stop soaking it up, so over millions of years it piles up until the ice starts to melt.', {
        when: (_s, c) => volcanic(c),
      }),
    ],
  },
  {
    id: 'vapor', name: 'Water vapour', cat: 'air', partOf: ['atmosphere'],
    blurb: 'All the water in the air as invisible gas, about 13,000 cubic kilometres.',
    impulse: (s) => hit(s, { clouds: 0.5 }),
    events: [
      ev(0, 'warn', 'The air is bone dry', 'Humidity drops to zero everywhere. Lips crack, and the clouds start to evaporate.'),
      ev(HOUR, 'warn', 'Earth starts to cool', 'Water vapour is the strongest greenhouse gas. Without it, heat escapes to space much faster.'),
      ev(9 * DAY, 'good', 'The vapour is back', 'Oceans and plants keep giving off water. Vapour only stays in the air for about nine days, so the atmosphere refills fast.'),
    ],
  },
  {
    id: 'helium', name: 'Helium', cat: 'air',
    blurb: 'Every helium atom on Earth.',
    events: [
      ev(0, 'info', 'Balloons drop', 'Party balloons and weather balloons fall out of the sky.'),
      ev(10 * MIN, 'warn', 'MRI scanners shut down', 'MRI magnets are cooled by liquid helium. Without it, they overheat and stop working.'),
      ev(DAY, 'warn', 'Chip factories and rockets stall', 'Helium is used to make computer chips and optical fibre, and to pressurise rocket fuel tanks.', { effect: (s) => hit(s, { infra: 0.98 }) }),
      ev(YEAR, 'info', 'Deep divers need a new gas', 'Divers breathe helium mixtures to avoid nitrogen narcosis deep down. They have to switch to alternatives like hydrogen.'),
      ev(MYR, 'info', 'A little comes back', 'Uranium and thorium in rocks slowly decay into new helium, which collects in natural gas fields.'),
    ],
  },
  {
    id: 'iron', name: 'Iron', cat: 'air', visual: 'planet',
    blurb: 'Every iron atom: in Earth’s core, in steel, and in your blood.',
    impulse: (s) => {
      s.mag = 0;
      s.humans = 0; s.animals = 0; s.fish = 0; s.insects = 0;
      s.plants *= 0.2; s.plankton *= 0.2; s.fungi *= 0.3; s.microbes *= 0.5; s.infra = 0; s.energy = 0;
    },
    events: [
      ev(0, 'doom', 'Every iron atom disappears', 'Steel buildings and bridges collapse. Every cell that breathes oxygen stops at once: the enzymes that use oxygen, and the haemoglobin that carries it, are built around iron.'),
      ev(20 * MIN, 'doom', 'Earth caves in', 'Earth’s core was mostly iron. The rock above falls into the hole it left, releasing enough energy to melt the planet.', { effect: coreCollapse }),
      ev(HOUR, 'doom', 'The oceans flash to steam', 'Seawater boils into a scalding atmosphere of steam hundreds of times thicker than today’s air.'),
      ev(100 * MYR, 'info', 'No magnetic field, ever', 'With no iron, nothing can power a magnetic field again.'),
    ],
  },
];
