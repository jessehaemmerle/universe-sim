import { lifeIndex } from '../model';
import type { Deletable } from '../types';
import { DAY, HOUR, KYR, MIN, MYR, GYR, YEAR } from '../units';
import { coreCollapse, ev, hit } from './helpers';

const volcanic = (c: { has(id: string): boolean }) =>
  !c.has('volcanoes') && !c.has('tectonics') && !c.has('heat') && !c.has('core') && !c.has('iron');

export const PLANET: Deletable[] = [
  {
    id: 'atmosphere', name: 'The atmosphere', cat: 'planet', visual: 'atmosphere',
    blurb: 'All five quadrillion tonnes of air.',
    impulse: (s) => { s.n2 = 0; s.o2 = 0; s.co2 = 0; s.clouds = 0; s.ozone = 0; s.dust = 0; },
    events: [
      ev(0, 'doom', 'The air is gone', 'The sky turns black, even at noon, and there is total silence. Air rushes out of everyone’s lungs.'),
      ev(1, 'doom', 'Every flame goes out', 'No oxygen, no fire. Planes lose all lift and fall.', { effect: (s) => hit(s, { infra: 0.8 }) }),
      ev(15, 'doom', 'People black out', 'With nothing to breathe, people lose consciousness in about 15 seconds. Saliva and tears start to boil at body temperature.'),
      ev(10 * MIN, 'doom', 'The oceans boil', 'Without air pressing down, water boils even at room temperature. The seas churn and steam until evaporation chills their surface into ice.', { when: (s) => s.ocean > 0.1 }),
      ev(7 * DAY, 'bad', 'Scorching days, frozen nights', 'With no air to hold and spread heat, sunlit ground heats past 100 °C while shade and night drop far below −100 °C, as on the Moon.'),
      ev(YEAR, 'warn', 'Meteors hit the ground', 'Earth sweeps up thousands of tonnes of space dust and rock every year. All of it used to burn up as shooting stars; now it reaches the surface.'),
      ev(10 * MYR, 'info', 'Volcanoes breathe a thin new atmosphere', 'Volcanic gases slowly build up a new, thin atmosphere of mostly CO₂ and nitrogen, with no oxygen.', { when: (_s, c) => volcanic(c) }),
    ],
  },
  {
    id: 'magfield', name: 'The magnetic field', cat: 'planet', visual: 'aurora',
    blurb: 'Earth’s magnetic field, and the churning iron dynamo in the core that makes it.',
    impulse: (s) => { s.mag = 0; },
    events: [
      ev(0, 'warn', 'Compasses stop working', 'Every compass needle goes slack. Birds, sea turtles and salmon that navigate by the field are suddenly lost.'),
      ev(DAY, 'info', 'The auroras change', 'With no field to funnel the solar wind to the poles, the northern and southern lights fade. Faint, patchy glows can appear anywhere instead.'),
      ev(7 * DAY, 'warn', 'Satellites take a beating', 'Satellites in low orbit were inside the field’s shield. More of them now fail from radiation damage.', { effect: (s) => hit(s, { infra: 0.98 }) }),
      ev(YEAR, 'info', 'Radiation on the ground rises only slightly', 'It’s the thick atmosphere, not the magnetic field, that blocks most cosmic radiation. Pilots and astronauts get the biggest extra dose.'),
      ev(10 * KYR, 'warn', 'Solar storms thin the ozone', 'Particles from solar storms now reach deeper into the atmosphere and can thin the ozone layer for months at a time.'),
      ev(100 * MYR, 'warn', 'The air slowly leaks away', 'The solar wind now strips the upper atmosphere directly. Earth keeps most of its air for billions of years, but the loss never stops.'),
    ],
  },
  {
    id: 'core', name: 'Earth’s core', cat: 'planet', visual: 'planet',
    blurb: 'The iron ball at Earth’s centre, 7,000 km across and as hot as the surface of the Sun.',
    impulse: (s) => { s.mag = 0; },
    events: [
      ev(0, 'doom', 'A hole where the core was', 'A third of Earth’s mass vanishes, leaving a void 7,000 km wide. Gravity at the surface drops by a third, and the planet starts to fall in on itself.'),
      ev(20 * MIN, 'doom', 'The mantle collapses', 'Thousands of kilometres of rock fall toward the centre. The energy released is enough to melt the whole planet.', { effect: coreCollapse }),
      ev(HOUR, 'doom', 'The oceans flash to steam', 'Seawater boils into a scalding atmosphere of steam hundreds of times thicker than today’s air.'),
      ev(YEAR, 'doom', 'Earth glows red', 'Earth is now a ball of magma about 12,000 km across, smaller than before and glowing through its steam.'),
      ev(100 * MYR, 'info', 'No magnetic field, ever again', 'With the iron core gone, nothing can power a magnetic field. The solar wind slowly strips the new atmosphere.'),
      ev(300 * MYR, 'info', 'A blank slate', 'If oceans form again on the cooled crust, any life has to start from scratch, as it did around 4 billion years ago.'),
    ],
  },
  {
    id: 'rotation', name: 'Earth’s spin', cat: 'planet',
    blurb: 'Earth’s rotation, which turns it once a day.',
    impulse: (s) => { s.spin = 0; },
    events: [
      ev(0, 'doom', 'Earth stops turning. Nothing else does', 'The ground stops, but the air, the oceans and everything not anchored to bedrock keep moving east at up to 1,670 km/h.'),
      ev(MIN, 'doom', 'Supersonic winds', 'The atmosphere slams into the ground at close to the speed of sound, flattening forests and cities. People, cars and loose rock are flung eastward.', {
        effect: (s) => { hit(s, { humans: 0.08, animals: 0.15, insects: 0.5, plants: 0.6, infra: 0.03, energy: 0.1 }); s.dust = 0.8; },
      }),
      ev(HOUR, 'doom', 'Mega-tsunamis', 'The oceans keep sloshing east and crash onto every west-facing coast, kilometres inland.', { effect: (s) => hit(s, { fish: 0.8 }), when: (s) => s.ocean > 0.3 }),
      ev(7 * DAY, 'bad', 'The oceans flow to the poles', 'Earth bulges at the equator because it spins. Without the spin, water flows toward the poles, leaving one giant continent around the equator between two polar oceans.', { when: (s) => s.ocean > 0.3 }),
      ev(30 * DAY, 'warn', 'A day lasts a year', 'The Sun now rises and sets once a year: six months of daylight, six months of night.'),
      ev(0.5 * YEAR, 'bad', 'Day side bakes, night side freezes', 'Weather becomes one giant flow of air from the scorching day side to the frozen night side. Thick clouds build up under the Sun, which cools things a little.'),
      ev(10 * KYR, 'warn', 'The magnetic field weakens', 'Earth’s spin helps organise the churning iron that powers the magnetic field. Without it, the field is likely to weaken.'),
      ev(GYR, 'info', 'The Moon creeps closer', 'Earth’s tides now pull the Moon backward instead of forward. Very slowly, it spirals inward.', { when: (_s, c) => !c.has('moon') }),
    ],
  },
  {
    id: 'tilt', name: 'Earth’s tilt', cat: 'planet',
    blurb: 'The 23.4° lean of Earth’s axis that gives us seasons.',
    events: [
      ev(0, 'info', 'Earth stands up straight', 'With no tilt, every day of the year is like the equinox: 12 hours of day and 12 of night everywhere.'),
      ev(30 * DAY, 'info', 'Seasons disappear', 'No summer and no winter. Each place has the same weather all year round.'),
      ev(YEAR, 'warn', 'The poles get colder', 'The Sun never climbs high over the poles, so ice spreads there while the tropics stay hot all year.'),
      ev(YEAR + DAY, 'warn', 'Farming has to change', 'Crops that need a cold winter, like many fruit trees and winter wheat, struggle. Animals that migrate with the seasons lose their cues.'),
      ev(KYR, 'info', 'Permanent twilight at the poles', 'At the poles the Sun now always sits on the horizon, never fully rising or setting.'),
    ],
  },
  {
    id: 'tectonics', name: 'Plate tectonics', cat: 'planet',
    blurb: 'The slow drift of the plates that make up Earth’s crust.',
    events: [
      ev(0, 'info', 'The plates freeze in place', 'Continents stop drifting. They were moving about as fast as your fingernails grow.'),
      ev(DAY, 'good', 'Most earthquakes stop', 'Nearly all big earthquakes happen where plates grind past each other. Japan, California and Chile go quiet.'),
      ev(KYR, 'info', 'Volcanoes at plate edges die down', 'The Ring of Fire around the Pacific slowly goes quiet.'),
      ev(100 * MYR, 'warn', 'Mountains wear down', 'Without new uplift, rain and ice grind the mountains down. The Himalayas lose much of their height.'),
      ev(300 * MYR, 'bad', 'The carbon cycle breaks', 'Plates carried carbon down into the mantle and volcanoes breathed it back out. Without that recycling, CO₂ slowly drains from the air.'),
      ev(GYR, 'warn', 'The magnetic field fades', 'Plate tectonics kept the core cooling and churning. Without it, the dynamo that makes the magnetic field may slowly run down.'),
    ],
  },
  {
    id: 'volcanoes', name: 'Volcanoes', cat: 'planet',
    blurb: 'All 1,350 potentially active volcanoes, and every future eruption.',
    events: [
      ev(0, 'good', 'Every volcano goes quiet', 'Etna, Kīlauea and Yellowstone stop for good, and so do the thousands of volcanoes hidden on the ocean floor.'),
      ev(YEAR, 'info', 'Hawaii and Iceland stop growing', 'These islands were built by eruptions. Now waves and rain will slowly wear them away.'),
      ev(60 * KYR, 'good', 'No supervolcano', 'A Toba-sized eruption, which happens every 50,000 years or so, now never comes.'),
      ev(MYR, 'warn', 'Soils get poorer', 'Volcanic ash makes some of the most fertile soil on Earth. Places like Java and southern Italy slowly lose that natural fertiliser.'),
      ev(10 * MYR, 'bad', 'CO₂ starts to run out', 'Volcanoes topped up the air’s CO₂ while rocks slowly soaked it up. Without the top-up, CO₂ falls and Earth cools.'),
    ],
  },
  {
    id: 'mountains', name: 'Mountains', cat: 'planet',
    blurb: 'Every bit of land more than 1,000 m above sea level.',
    impulse: (s) => hit(s, { landIce: 0.2, humans: 0.9, infra: 0.9, animals: 0.97 }),
    events: [
      ev(0, 'doom', 'The mountains are gone', 'The Himalayas, Andes, Alps and Rockies are sliced off at 1,000 m, along with most of Antarctica’s and Greenland’s ice. Hundreds of millions of people in cities like Mexico City, Addis Ababa and Denver plunge to the new ground.'),
      ev(DAY, 'bad', 'Rivers lose their sources', 'Many great rivers start as mountain snow and glaciers. The Ganges, Indus, Yangtze and Colorado lose much of their water.'),
      ev(YEAR, 'bad', 'Monsoons weaken', 'The Himalayas and the Tibetan Plateau help drive the South Asian monsoon. The rains that feed nearly 2 billion people become weaker and less reliable.'),
      ev(YEAR + DAY, 'good', 'Rain shadows disappear', 'Deserts that formed because mountains blocked the rain, like the Atacama and Patagonia, get wetter.'),
      ev(100 * YEAR, 'info', 'New weather patterns', 'Jet streams and storm tracks that used to bend around the Rockies and the Himalayas flow straighter. Weather shifts across the northern hemisphere.'),
    ],
  },
  {
    id: 'ozone', name: 'The ozone layer', cat: 'planet', partOf: ['oxygen', 'atmosphere'],
    blurb: 'The thin layer of ozone high in the atmosphere that blocks harsh ultraviolet light.',
    impulse: (s) => { s.ozone = 0; },
    events: [
      ev(0, 'bad', 'The ozone layer is gone', 'Harsh ultraviolet light that never reached the ground now does.'),
      ev(10 * MIN, 'bad', 'Sunburn in minutes', 'Bare skin burns within minutes in full sun. UV levels are far beyond the top of today’s UV index.'),
      ev(7 * DAY, 'bad', 'Crops and plankton suffer', 'UV damages the DNA in leaves and in the plankton near the ocean surface. Harvests drop and the base of the ocean food chain thins.'),
      ev(30 * DAY, 'good', 'Ozone starts rebuilding itself', 'Sunlight splits oxygen molecules, which recombine into ozone. As long as there is oxygen in the air, the layer starts repairing itself straight away.', { when: (s) => s.o2 > 0.01 }),
      ev(1.5 * YEAR, 'good', 'The ozone layer is mostly back', 'Deleting it was a disaster, but not a permanent one.', { when: (s) => s.ozone > 0.7 }),
      ev(10 * YEAR, 'warn', 'A wave of skin cancers and cataracts', 'Damage from that first year without ozone keeps showing up for decades.', { when: (s) => s.humans > 0.01 }),
    ],
  },
  {
    id: 'ice', name: 'Ice', cat: 'planet', visual: 'ice', partOf: ['cold'],
    blurb: 'Every glacier, ice sheet, iceberg and snowflake.',
    impulse: (s) => { s.landIce = 0; s.seaIce = 0; },
    events: [
      ev(0, 'warn', 'All ice is gone', 'Greenland and Antarctica are bare rock, much of it below sea level. The sea doesn’t rise: the ice was deleted, not melted.'),
      ev(MIN, 'info', 'Sea level drops near Greenland', 'The ice sheets’ gravity was pulling the ocean toward them. Without it, the sea sinks nearby and rises slightly everywhere else.'),
      ev(DAY, 'warn', 'The Arctic is open water', 'Dark water absorbs sunlight that bright ice used to reflect, so the Arctic warms quickly.'),
      ev(YEAR, 'bad', 'Glacier-fed rivers falter', 'Glaciers in the Himalayas, Andes and Alps supply dry-season water to over a billion people.'),
      ev(10 * YEAR, 'info', 'The ground springs back', 'Freed from kilometres of ice, Greenland and Antarctica rise by centimetres a year, and earthquakes there become more common.'),
      ev(100 * YEAR, 'info', 'Sea ice returns in winter', 'Polar winters are still cold, so the sea freezes again every year.', { when: (s) => s.seaIce > 0.02 }),
      ev(10 * KYR, 'info', 'Ice sheets start to regrow', 'Snow is piling up on Antarctica again, but rebuilding an ice sheet kilometres thick takes tens of thousands of years.', { when: (s) => s.landIce > 0.1 }),
    ],
  },
  {
    id: 'clouds', name: 'Clouds', cat: 'planet', visual: 'clouds', partOf: ['atmosphere'],
    blurb: 'Every cloud in the sky.',
    impulse: (s) => { s.clouds = 0; },
    events: [
      ev(0, 'info', 'A perfectly clear sky', 'For the first time in history, the whole planet is cloudless at once.'),
      ev(HOUR, 'warn', 'It gets hot in the sun', 'Clouds reflect about a fifth of incoming sunlight back to space. Without them, every sunny place heats up fast.'),
      ev(12 * HOUR, 'info', 'A cold night', 'Clouds also trap heat at night, like a blanket. Under clear skies, temperatures plunge after dark.'),
      ev(3 * DAY, 'good', 'The clouds are back', 'Water keeps evaporating, so new clouds form within hours. By now the sky looks normal again.', { when: (s) => s.clouds > 0.3 }),
    ],
  },
  {
    id: 'rain', name: 'Rain', cat: 'planet',
    blurb: 'Water can no longer fall from the sky as rain, snow or hail.',
    events: [
      ev(0, 'warn', 'The last drops hang in the air', 'Water can still evaporate, but it can never fall again. Clouds just keep growing.'),
      ev(7 * DAY, 'bad', 'Rivers start to shrink', 'Rivers are refilled by rain. Without it, smaller ones dry up within weeks.'),
      ev(90 * DAY, 'doom', 'Harvests fail', 'About 80% of the world’s farmland relies on rain alone. Without it, most crops die.'),
      ev(YEAR, 'bad', 'A permanent overcast', 'All the water that would have fallen stays in the sky. A thick grey ceiling covers the planet and the air is muggy everywhere.'),
      ev(10 * YEAR, 'doom', 'Forests die', 'Trees draw on groundwater for a while, but as it runs out, rainforests and woodlands die off.'),
      ev(KYR, 'doom', 'Lakes and aquifers dry up', 'Fresh water on land slowly evaporates into the sky and never comes back. Life survives mostly in the oceans.'),
    ],
  },
  {
    id: 'wind', name: 'Wind', cat: 'planet', partOf: ['atmosphere'],
    blurb: 'Air can no longer flow across the planet.',
    events: [
      ev(0, 'info', 'The air stands still', 'No breeze, no storms. Flags hang limp and sailboats drift.'),
      ev(DAY, 'warn', 'Weather stops moving', 'Moist air no longer travels inland. Deserts stay bone dry, while some coasts get rain day after day.'),
      ev(7 * DAY, 'bad', 'Smog builds up', 'With no wind to carry it away, pollution piles up over cities and fires.'),
      ev(30 * DAY, 'bad', 'The tropics overheat, the poles freeze', 'Winds carried much of the heat that flows from the equator to the poles. Without them, the difference gets extreme.'),
      ev(YEAR, 'bad', 'Ocean currents slow down', 'Surface currents like the Gulf Stream are driven by wind. Without it, they weaken and the oceans stagnate.'),
      ev(YEAR + DAY, 'warn', 'Wind turbines stop', 'Wind made about 8% of the world’s electricity.'),
      ev(10 * YEAR, 'bad', 'Many plants can’t reproduce', 'Grasses, including wheat, rice and maize, and many trees rely on the wind to carry their pollen.'),
    ],
  },
  {
    id: 'lightning', name: 'Lightning', cat: 'planet',
    blurb: 'Every bolt of lightning, about 45 every second worldwide.',
    events: [
      ev(0, 'info', 'Silent storms', 'Thunderstorms still rain, but without lightning or thunder.'),
      ev(YEAR, 'good', 'Fewer wildfires', 'Lightning starts many of the biggest wildfires in remote forests. There are fewer of them now.'),
      ev(10 * YEAR, 'info', 'Fire-loving forests age', 'Some pines need fire to open their cones, and some grasslands need it to stay grasslands. Slowly, they change.'),
      ev(100 * YEAR, 'info', 'A little less natural fertiliser', 'Lightning turns nitrogen in the air into a form plants can use. It’s a small part of the supply, and bacteria make up the difference.'),
    ],
  },
  {
    id: 'rivers', name: 'Rivers', cat: 'planet',
    blurb: 'The water in every river and stream.',
    impulse: (s) => hit(s, { energy: 0.9 }),
    events: [
      ev(0, 'bad', 'Riverbeds run dry', 'The Amazon, the Nile and the Mississippi are empty channels. Boats sit in the mud.'),
      ev(HOUR, 'bad', 'Hydropower shuts down', 'Hydroelectric dams supply about 15% of the world’s electricity. Their turbines stop.'),
      ev(DAY, 'warn', 'Cities run short of water', 'Many cities draw drinking water straight from rivers. Taps sputter until reservoirs are tapped.'),
      ev(7 * DAY, 'good', 'The rivers come back', 'Rivers are just rain and snowmelt on their way to the sea. The next rains fill them up again.', { when: (_s, c) => !c.has('rain') }),
      ev(30 * DAY, 'info', 'Some fish lose a season', 'Salmon and other fish that migrate up rivers miss a spawning run, but they recover within a few years.'),
    ],
  },
  {
    id: 'salt', name: 'Salt in the sea', cat: 'planet', partOf: ['oceans'],
    blurb: 'All 50 quadrillion tonnes of salt dissolved in the oceans.',
    impulse: (s) => hit(s, { fish: 0.25, plankton: 0.5 }),
    events: [
      ev(0, 'bad', 'The oceans turn fresh', 'Seawater is suddenly drinkable. For almost everything that lives in it, that’s a disaster.'),
      ev(HOUR, 'doom', 'Sea life swells and dies', 'Marine fish, corals and jellyfish are built for salt water. In fresh water, their cells take on water until they stop working.'),
      ev(DAY, 'good', 'No more water shortages on the coast', 'Coastal cities can pump drinking water straight from the sea. Desalination plants switch off.'),
      ev(YEAR, 'warn', 'Sea ice spreads', 'Salt kept seawater liquid down to −1.9 °C. Fresh water freezes at 0 °C, so more of the polar seas ice over.'),
      ev(10 * YEAR, 'bad', 'The ocean conveyor stalls', 'Salty water is denser and sinks near the poles, which helps drive currents like the Gulf Stream. Without salt, that engine weakens and northern Europe cools.'),
      ev(100 * MYR, 'info', 'The sea is salty again', 'Rivers keep washing dissolved minerals from rocks into the oceans. Over a hundred million years, the salt builds back up.'),
    ],
  },
  {
    id: 'soil', name: 'Soil', cat: 'planet',
    blurb: 'The fertile top layer of the land, where 95% of our food grows.',
    impulse: (s) => { s.soil = 0; hit(s, { plants: 0.25, fungi: 0.3, microbes: 0.6, insects: 0.7, animals: 0.9 }); },
    events: [
      ev(0, 'doom', 'The land is bare rock', 'Forests and fields topple as the ground under their roots disappears. Earthworms, ants and trillions of microbes go with it.'),
      ev(7 * DAY, 'bad', 'Rain runs straight off', 'Soil soaked up water like a sponge. Now rain rushes off the rock into rivers, causing flash floods, then droughts.'),
      ev(90 * DAY, 'doom', 'Famine', 'Crops can’t grow on bare rock. Greenhouses and hydroponics feed only a tiny fraction of the world.'),
      ev(KYR, 'info', 'New soil begins', 'Lichens, moss and weathering slowly turn rock back into soil. Making a few centimetres takes hundreds to thousands of years.', { when: (s) => lifeIndex(s) > 0.05 }),
    ],
  },
  {
    id: 'land', name: 'Land', cat: 'planet', visual: 'land',
    blurb: 'Every continent and island, down to the level of the seafloor.',
    impulse: (s) => {
      s.plants = 0; s.animals = 0; s.insects = 0; s.fungi = 0; s.soil = 0; s.landIce = 0;
      s.humans *= 0.0003; s.microbes *= 0.6; s.infra = 0; s.energy *= 0.05;
    },
    events: [
      ev(0, 'doom', 'The continents are gone', 'The land vanishes down to the depth of the ocean floor, and with it everyone and everything that lived there.'),
      ev(MIN, 'doom', 'The oceans pour in', 'Seawater rushes into the enormous hollows. When it settles, a single ocean about 2.6 km deep covers the whole planet.'),
      ev(HOUR, 'doom', 'The last humans are at sea', 'About two million sailors, fishers and offshore workers are left, plus the passengers of planes with nowhere to land.'),
      ev(7 * DAY, 'bad', 'Desperate fleets', 'Ships can make fresh water and catch fish, but fuel and spare parts are running out.'),
      ev(KYR, 'info', 'A water world', 'With no land, the ocean runs the climate. Currents and clouds spread heat evenly, and sea life carries on.', { when: (s) => s.ocean > 0.3 }),
      ev(100 * MYR, 'info', 'Volcanic islands rise', 'Undersea volcanoes slowly build new islands above the waves, the way Hawaii and Iceland formed.', { when: (_s, c) => volcanic(c) }),
    ],
  },
];
