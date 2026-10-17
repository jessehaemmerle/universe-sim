import type { Deletable } from '../types';
import { DAY, HOUR, KYR, MIN, MYR, SUNLIGHT_DELAY, YEAR } from '../units';
import { ev } from './helpers';

export const SPACE: Deletable[] = [
  {
    id: 'sun', name: 'The Sun', cat: 'space', visual: 'sun', cosmic: true,
    blurb: 'The star at the centre of the Solar System, with 99.86% of its mass.',
    events: [
      ev(0, 'warn', 'The Sun disappears', 'Nobody on Earth can tell yet. Its light is still on its way, and so is the news that its gravity is gone.', { cosmic: true }),
      ev(SUNLIGHT_DELAY, 'doom', 'Darkness', '8 minutes and 20 seconds later, the last sunlight arrives. The day side goes black, and Earth flies off in a straight line at 30 km/s.', { cosmic: true, effect: (s) => { s.sun = 0; } }),
      ev(SUNLIGHT_DELAY + 1.3, 'info', 'The Moon goes dark', 'The Moon only ever reflected sunlight, so 1.3 seconds later it vanishes from the sky too.', { when: (_s, c) => !c.has('moon') }),
      ev(HOUR, 'info', 'The planets fade', 'Venus, Mars and Jupiter shine by reflected sunlight. One by one, as their last light reaches us, they go dark.'),
      ev(7 * DAY, 'bad', 'Temperatures plunge', 'With no sunlight, the land loses heat fast. Within a week the global average is well below freezing.'),
      ev(30 * DAY, 'bad', 'Plants start dying', 'Without light, plants can’t make food. Small plants die within weeks; big trees can live off their stored sugar for years.'),
      ev(90 * DAY, 'bad', 'Survivors head underground', 'People who can gather around geothermal heat in places like Iceland, or shelter in mines and nuclear submarines. Food is the real problem.'),
      ev(2 * YEAR, 'good', 'Life hangs on at deep-sea vents', 'Microbes, tube worms and shrimp around hot springs on the ocean floor never needed sunlight. They could keep going for a very long time.', { when: (s) => s.ocean > 0.3 }),
    ],
  },
  {
    id: 'jupiter', name: 'Jupiter', cat: 'space', cosmic: true,
    blurb: 'The largest planet, 318 times Earth’s mass.',
    events: [
      ev(0, 'info', 'Jupiter is gone', 'The biggest planet vanishes. From Earth it was a bright point in the night sky, so at first nothing seems different.', { cosmic: true }),
      ev(43 * MIN, 'info', 'Jupiter fades from the sky', 'Its last reflected light arrives, 35 to 52 minutes after the deletion depending on where it was.', { cosmic: true }),
      ev(10 * KYR, 'warn', 'Ice ages lose their rhythm', 'Jupiter’s pull stretches Earth’s orbit in a 405,000-year cycle that helps pace the ice ages. That clock is gone.'),
      ev(MYR, 'info', 'Fewer or more comets?', 'Jupiter both flings comets toward the inner Solar System and swallows others. Scientists still argue whether losing it means more impacts or fewer.'),
      ev(100 * MYR, 'warn', 'The asteroid belt reshuffles', 'Gaps in the belt that Jupiter kept clear slowly fill in, and some rocks drift onto orbits that cross Earth’s.', { cosmic: true }),
    ],
  },
  {
    id: 'mars', name: 'Mars', cat: 'space', cosmic: true,
    blurb: 'The red planet, half Earth’s width.',
    events: [
      ev(0, 'info', 'Mars is gone', 'Along with it go the rovers Curiosity and Perseverance, several orbiters, and every plan to live there. Its two small moons drift off around the Sun.', { cosmic: true }),
      ev(DAY, 'good', 'Earth doesn’t notice', 'Mars has a tenth of Earth’s mass and never comes closer than 55 million km. Its pull on Earth was tiny.'),
      ev(10 * MYR, 'info', 'Orbits shift, slightly', 'The small tugs Mars gave the other planets add up over millions of years, but the changes are far too small to matter for life on Earth.', { cosmic: true }),
    ],
  },
  {
    id: 'asteroids', name: 'Asteroids and comets', cat: 'space', cosmic: true,
    blurb: 'Every rock and ball of ice orbiting the Sun, from the asteroid belt to the far edge of the Solar System.',
    events: [
      ev(0, 'info', 'No more space rocks', 'The asteroid belt, the Kuiper belt and the distant Oort cloud are empty. Their mass was spread so thinly that the planets’ orbits stay the same.', { cosmic: true }),
      ev(KYR, 'info', 'Meteor showers fade', 'Showers like the Perseids come from dust left by comets. With no comets to top them up, the dust streams thin out and the showers fade.'),
      ev(MYR, 'good', 'No more killer impacts', 'A 10 km asteroid like the one that ended the dinosaurs hits about every 100 million years. Not anymore.'),
    ],
  },
  {
    id: 'stars', name: 'Every other star', cat: 'space', visual: 'stars', cosmic: true,
    blurb: 'All the stars except the Sun, including every other galaxy.',
    events: [
      ev(0, 'info', 'The stars are gone', 'But their light is still on its way. For now, the night sky looks exactly the same.', { cosmic: true }),
      ev(4.24 * YEAR, 'info', 'Proxima Centauri goes out', 'The nearest star vanishes first: its last light took 4.2 years to arrive. Alpha Centauri A and B follow seven weeks later.', { cosmic: true }),
      ev(8.6 * YEAR, 'info', 'Sirius goes out', 'The brightest star in the night sky disappears 8.6 years after the deletion.', { cosmic: true }),
      ev(433 * YEAR, 'info', 'Polaris is gone', 'Navigators steered by the North Star for thousands of years. Its last light took 433 years to get here.', { cosmic: true }),
      ev(2 * KYR, 'warn', 'The night sky is nearly black', 'Almost every star you can see with your eyes is within a few thousand light-years. They have all gone out.', { cosmic: true }),
      ev(3 * KYR, 'warn', 'Night navigators are lost', 'Indigo buntings learn the night sky as chicks to find north, and dung beetles steer by the Milky Way. Both have to find other ways.'),
      ev(26 * KYR, 'info', 'The Milky Way fades', 'Light from the galaxy’s centre took 26,000 years to arrive. The faint band across the sky is gone.', { cosmic: true }),
      ev(2.5 * MYR, 'info', 'Andromeda winks out', 'The farthest thing visible to the naked eye, 2.5 million light-years away, finally disappears. Only the planets are left in the night sky.', { cosmic: true }),
    ],
  },
  {
    id: 'blackhole', name: 'The Milky Way’s black hole', cat: 'space', cosmic: true,
    blurb: 'Sagittarius A*, 4 million times the Sun’s mass, 26,000 light-years away.',
    events: [
      ev(0, 'info', 'Sagittarius A* is gone', 'The supermassive black hole at the heart of our galaxy disappears.', { cosmic: true }),
      ev(DAY, 'good', 'Nothing happens to Earth', 'Black holes don’t suck things in from afar. This one held less than 0.01% of the galaxy’s mass, so the Sun’s path around the galaxy barely changes.'),
      ev(26 * KYR, 'info', 'The news reaches the Sun', 'Changes in gravity travel at the speed of light. 26,000 years later, the stars that circled the black hole fly off along straight lines, but the Sun is far too distant to notice.', { cosmic: true }),
    ],
  },
  {
    id: 'darkmatter', name: 'Dark matter', cat: 'space', cosmic: true,
    blurb: 'The invisible stuff that makes up about 85% of all matter.',
    events: [
      ev(0, 'info', 'Dark matter is gone', 'Nobody notices. Whatever it is, it passed through us without a trace. But it was most of the galaxy’s mass.', { cosmic: true }),
      ev(50 * MYR, 'warn', 'The Sun swings outward', 'The Sun circles the galaxy at about 230 km/s, too fast for the visible stars and gas alone to hold it in its old orbit. It swings out toward the galaxy’s dim outskirts.', { cosmic: true }),
      ev(500 * MYR, 'info', 'The galaxy thins out', 'Stars in the outer Milky Way escape entirely and galaxy clusters drift apart. The night sky slowly empties.', { cosmic: true }),
    ],
  },
  {
    id: 'solarwind', name: 'Solar wind', cat: 'space', visual: 'aurora', cosmic: true,
    blurb: 'The stream of particles the Sun blows into space, solar storms included.',
    events: [
      ev(0, 'info', 'The solar wind stops', 'The Sun still shines, but the 1.5 million tonnes of particles it blew into space every second have stopped.', { cosmic: true }),
      ev(3 * DAY, 'info', 'The auroras go out', 'The northern and southern lights were powered by the solar wind hitting Earth’s magnetic field. The last ones flicker out.'),
      ev(YEAR, 'good', 'No more space weather', 'Geomagnetic storms, which can knock out power grids and satellites, never happen again.'),
      ev(YEAR + DAY, 'info', 'Comets lose a tail', 'A comet’s straight blue tail was blown by the solar wind. The curved dust tail, pushed by sunlight, remains.', { cosmic: true, when: (_s, c) => !c.has('asteroids') }),
      ev(2 * YEAR, 'warn', 'More cosmic rays', 'The solar wind inflated a bubble that shielded the planets from some cosmic rays. Astronauts and satellites now get a higher dose; on the ground, the change is small.'),
    ],
  },
];
