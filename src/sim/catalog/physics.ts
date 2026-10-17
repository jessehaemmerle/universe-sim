import type { Deletable } from '../types';
import { DAY, HOUR, MIN, MYR, SUNLIGHT_DELAY, YEAR } from '../units';
import { ev, hit, killAll } from './helpers';

export const PHYSICS: Deletable[] = [
  {
    id: 'friction', name: 'Friction', cat: 'physics',
    blurb: 'The force that stops things from sliding.',
    impulse: (s) => hit(s, { humans: 0.85, animals: 0.8, infra: 0.1, energy: 0.3 }),
    events: [
      ev(0, 'doom', 'Everything slides', 'Nobody can stand: shoes have no grip. Cars can’t brake or steer, and anything on a slope starts sliding.'),
      ev(1, 'doom', 'Knots untie, screws slip out', 'Nails, screws and knots all hold by friction. Buildings, furniture and bridges come apart.'),
      ev(MIN, 'bad', 'Air resistance is gone too', 'Raindrops and hail no longer slow down as they fall. Winds and waves never calm down.'),
      ev(HOUR, 'bad', 'Rivers race', 'Water flows without drag. Rivers rush to the sea and the oceans slosh endlessly.'),
      ev(YEAR, 'doom', 'Storms that never end', 'Weather systems that friction used to wear down keep building. The winds grow stronger and stronger.', { effect: (s) => hit(s, { plants: 0.5, animals: 0.5, humans: 0.5 }) }),
    ],
  },
  {
    id: 'light', name: 'Light', cat: 'physics', cosmic: true,
    blurb: 'All visible light. Other radiation, like infrared heat, still works.',
    events: [
      ev(0, 'doom', 'Total darkness', 'Nothing is visible. Screens, lamps and the Sun are all dark, though you can still feel the Sun’s warmth on your skin.'),
      ev(HOUR, 'info', 'Thermal cameras rule', 'Night-vision gear that sees heat becomes the only way to see anything.'),
      ev(DAY, 'doom', 'Photosynthesis stops', 'Plants run on visible light. Without it, they slowly starve.'),
      ev(30 * DAY, 'bad', 'Earth cools', 'About 40% of the Sun’s energy arrived as visible light. Earth now soaks up far less heat.'),
      ev(YEAR, 'bad', 'Hunters that see go hungry', 'Eagles, cats and most predators are blind. Bats, dolphins and heat-sensing snakes do better.'),
    ],
  },
  {
    id: 'time', name: 'Time', cat: 'physics', cosmic: true,
    blurb: 'Time itself stops passing.',
    events: [
      ev(0, 'warn', 'Time has stopped', 'Nothing moves. Nothing changes. Nothing will ever happen again. Undo to let time pass.', { cosmic: true }),
    ],
  },
  {
    id: 'strong', name: 'The strong force', cat: 'physics', visual: 'planet', cosmic: true,
    blurb: 'The force that holds atomic nuclei together.',
    impulse: (s) => {
      killAll(s);
      s.integrity = 0; s.ocean = 0; s.landIce = 0; s.n2 = 0; s.o2 = 0; s.co2 = 0; s.clouds = 0; s.mag = 0; s.sun = 0;
    },
    events: [
      ev(0, 'doom', 'Every atomic nucleus flies apart', 'Protons push each other away, and nothing holds them together anymore. Every atom heavier than hydrogen comes apart.', { cosmic: true }),
      ev(0.001, 'doom', 'Earth becomes a cloud of plasma', 'The energy released turns Earth, you, and everything else into an expanding cloud of hot particles.', { cosmic: true }),
      ev(SUNLIGHT_DELAY, 'doom', 'The Sun and the stars go too', 'The Sun, every star and every galaxy come apart the same way. Only their last light is still travelling through the dark.', { cosmic: true }),
    ],
  },
  {
    id: 'sound', name: 'Sound', cat: 'physics',
    blurb: 'Sound waves can no longer travel through anything.',
    events: [
      ev(0, 'warn', 'Silence', 'Voices, music, traffic and thunder are gone. People shout and hear nothing.'),
      ev(MIN, 'info', 'Sign language and text take over', 'Deaf communities suddenly have a head start.'),
      ev(DAY, 'bad', 'Bats and dolphins are lost', 'Animals that hunt by echolocation can’t find food or avoid obstacles.', { effect: (s) => hit(s, { animals: 0.97, fish: 0.98 }) }),
      ev(30 * DAY, 'warn', 'Ultrasound and sonar stop', 'Doctors lose ultrasound scans, and ships and submarines lose sonar.'),
      ev(YEAR, 'bad', 'Mating calls go unheard', 'Birds, frogs, crickets and whales can’t call to each other. Breeding seasons fail for many species.', { effect: (s) => hit(s, { animals: 0.8, insects: 0.9, fish: 0.95 }) }),
    ],
  },
  {
    id: 'heat', name: 'Heat', cat: 'physics', visual: 'ice',
    blurb: 'Nothing on Earth can be warmer than 0 °C.',
    impulse: (s) => { s.energy = 0; s.geo = 0; s.mag = 0; hit(s, { infra: 0.5 }); },
    events: [
      ev(0, 'doom', 'Everything drops to 0 °C', 'Every person, animal and engine on Earth is instantly at freezing point. So is Earth’s molten core.'),
      ev(MIN, 'doom', 'Warm-blooded life dies', 'A body at 0 °C cannot keep working. Neither can any bird or mammal.'),
      ev(HOUR, 'doom', 'The oceans start to freeze over', 'Sunlight can no longer warm water above 0 °C. Ice spreads out from every coast.'),
      ev(DAY, 'good', 'Antarctic fish barely notice', 'Some polar fish spend their lives at −1.9 °C, protected by antifreeze proteins in their blood. For them, 0 °C is normal.'),
      ev(7 * DAY, 'info', 'Tardigrades wait it out', 'Tardigrades, many insects and bacteria can survive freezing in a dormant state. They are now Earth’s longest-lasting animals.'),
      ev(MYR, 'doom', 'Frozen forever', 'With its core frozen, Earth has no volcanoes, no moving plates and no magnetic field.'),
    ],
  },
];
