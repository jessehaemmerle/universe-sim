import type { Combo } from '../types';
import { DAY, HOUR, KYR, MYR } from '../units';

/** Extra consequences that only appear when two particular things are both gone. */
export const COMBOS: Combo[] = [
  {
    ids: ['sun', 'cold'], at: 30 * DAY, sev: 'info',
    title: 'A warm, dark planet',
    body: 'No Sun, but nothing may be colder than 20 °C. Earth is a pitch-black world at room temperature. Plants still die in the dark, but greenhouses with lamps could run forever.',
  },
  {
    ids: ['moon', 'oceans'], at: HOUR, sev: 'info',
    title: 'No tides at all',
    body: 'No Moon and no oceans. The only tide left is the solid ground itself, rising and falling a few centimetres twice a day as the Sun pulls on it.',
  },
  {
    ids: ['oceans', 'atmosphere'], at: DAY, sev: 'doom',
    title: 'Earth looks like the Moon',
    body: 'No air and no water, just grey rock under a black sky. From space, Earth now looks more like Mercury than the blue planet.',
  },
  {
    ids: ['humans', 'electricity'], at: 1, sev: 'info',
    title: 'Nobody notices the blackout',
    body: 'There is no one left to miss the electricity.',
  },
  {
    ids: ['magfield', 'ozone'], at: DAY, sev: 'bad',
    title: 'Double exposure',
    body: 'With no magnetic field and no ozone layer, harsh UV reaches the ground and solar storms hit the upper air unchecked.',
  },
  {
    ids: ['moon', 'rotation'], at: DAY, sev: 'info',
    title: 'Nothing to spin it up again',
    body: 'With no Moon tugging on it, nothing will ever get Earth turning again. A day lasts a whole year from now on.',
  },
  {
    ids: ['volcanoes', 'co2'], at: 100 * KYR, sev: 'doom',
    title: 'No way back from the cold',
    body: 'Without volcanoes, nothing will ever put CO₂ back into the air. The ice stays.',
  },
  {
    ids: ['tilt', 'moon'], at: MYR, sev: 'info',
    title: 'Upright, then adrift',
    body: 'With no Moon to hold it, the tilt you deleted doesn’t stay at zero. The other planets slowly push Earth’s axis around again.',
  },
  {
    ids: ['jupiter', 'asteroids'], at: MYR, sev: 'good',
    title: 'A quiet Solar System',
    body: 'No Jupiter to fling comets around and no comets to fling. Big impacts on Earth are a thing of the past.',
  },
  {
    ids: ['sun', 'jupiter'], at: DAY, sev: 'info',
    title: 'The Solar System scatters',
    body: 'With no Sun to hold them, all the planets fly off in straight lines and drift apart forever.',
  },
  {
    ids: ['clouds', 'rain'], at: 3 * DAY, sev: 'info',
    title: 'Clouds that never rain',
    body: 'The clouds come back, but they can’t rain, so they keep thickening into a permanent grey ceiling.',
  },
  {
    ids: ['cold', 'heat'], at: 1, sev: 'info',
    title: 'A contradiction',
    body: 'Nothing can be colder than 20 °C or warmer than 0 °C. The rules can’t both hold, so in this simulation the ceiling wins and Earth sits at 0 °C.',
  },
  {
    ids: ['humans', 'nukes'], at: DAY, sev: 'info',
    title: 'Disarmament, the hard way',
    body: 'No people, no warheads. Nobody left to push the button and nothing to push it for.',
  },
  {
    ids: ['plants', 'plankton'], at: 10 * KYR, sev: 'doom',
    title: 'Oxygen is running down',
    body: 'Nothing on Earth makes oxygen anymore. Rocks and volcanic gases slowly soak it up over the next few million years.',
  },
  {
    ids: ['sun', 'light'], at: 1, sev: 'info',
    title: 'Dark twice over',
    body: 'The Sun’s light was going to stop in eight minutes anyway.',
  },
];
