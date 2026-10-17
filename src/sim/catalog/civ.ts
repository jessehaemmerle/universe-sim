import type { Deletable } from '../types';
import { DAY, HOUR, KYR, MIN, YEAR } from '../units';
import { ev, hit } from './helpers';

const people = (s: { humans: number }) => s.humans > 0.01;

export const CIV: Deletable[] = [
  {
    id: 'electricity', name: 'Electricity', cat: 'civ', visual: 'lights',
    blurb: 'Electric current no longer flows through wires and circuits.',
    impulse: (s) => { s.energy = Math.min(s.energy, 0.08); hit(s, { infra: 0.7 }); },
    events: [
      ev(0, 'doom', 'Blackout, everywhere', 'Lights, phones, computers, hospitals and water pumps all stop. Every battery is dead weight.'),
      ev(MIN, 'doom', 'Planes in trouble', 'Modern airliners need electricity to fly. About 10,000 of them are in the air at any moment.', { effect: (s) => hit(s, { humans: 0.9999 }) }),
      ev(DAY, 'bad', 'Taps run dry', 'Electric pumps moved clean water into homes and sewage away from them.'),
      ev(30 * DAY, 'doom', 'Supply chains collapse', 'Without refrigeration, banking, fuel pumps or phones, food stops reaching the cities.'),
      ev(YEAR, 'doom', 'Back to the 1800s', 'Steam engines, horses and windmills return. Before electricity, the world supported about 1.5 billion people.'),
    ],
  },
  {
    id: 'internet', name: 'The internet', cat: 'civ',
    blurb: 'Every network, server and data centre, and all the data in them.',
    impulse: (s) => hit(s, { infra: 0.55, energy: 0.95 }),
    events: [
      ev(0, 'warn', 'Offline', 'Messages, maps, streaming, cloud storage and every website vanish.'),
      ev(HOUR, 'bad', 'Payments stop', 'Card payments and bank transfers fail. Most money only existed as data.'),
      ev(DAY, 'bad', 'Shelves empty', 'Shops, ports and trucking all run on digital logistics. Deliveries stall.'),
      ev(30 * DAY, 'bad', 'Lost knowledge', 'Anything that only existed in the cloud, from family photos to research data, is gone for good.'),
      ev(5 * YEAR, 'good', 'A new network', 'The technology still exists, so engineers rebuild the networks piece by piece.', { when: (s) => s.humans > 0.3 }),
    ],
  },
  {
    id: 'fossil', name: 'Fossil fuels', cat: 'civ',
    blurb: 'All coal, oil and natural gas, in the ground and in tanks.',
    impulse: (s) => { s.energy = Math.min(s.energy, 0.2); hit(s, { infra: 0.9 }); },
    events: [
      ev(0, 'doom', '80% of the world’s energy is gone', 'Cars, planes, ships and most power plants stop at once.'),
      ev(7 * DAY, 'bad', 'Plastic and medicine run short', 'Most plastics, many medicines and most fertiliser were made from oil and gas.'),
      ev(30 * DAY, 'doom', 'Food shortages', 'Fertiliser made from natural gas fed about half the world, and tractors and trucks need diesel.'),
      ev(10 * YEAR, 'good', 'The great switch', 'Solar, wind, hydro and nuclear power expand as fast as humanly possible.', { when: people }),
      ev(100 * YEAR, 'good', 'CO₂ starts falling', 'With nothing left to burn, the extra CO₂ in the air slowly declines.'),
    ],
  },
  {
    id: 'plastic', name: 'Plastic', cat: 'civ',
    blurb: 'Every piece of plastic, out of about 10 billion tonnes ever made.',
    impulse: (s) => hit(s, { infra: 0.6 }),
    events: [
      ev(0, 'warn', 'Things fall apart', 'Phones, cars, keyboards and packaging lose their plastic parts. About 60% of clothing fibre is plastic too, so many people are suddenly half-dressed.'),
      ev(MIN, 'bad', 'Short circuits', 'Most electric wires were insulated with plastic. Power grids spark and fail.', { effect: (s) => hit(s, { energy: 0.6 }) }),
      ev(DAY, 'bad', 'Hospitals improvise', 'IV bags, syringes, gloves and tubing are gone.'),
      ev(YEAR, 'good', 'Cleaner oceans', 'The garbage patches and microplastics are gone. Turtles and seabirds stop swallowing plastic.'),
      ev(10 * YEAR, 'info', 'Glass, metal and paper are back', 'Factories switch to older materials. Everything is heavier and more expensive.', { when: people }),
    ],
  },
  {
    id: 'fire', name: 'Fire', cat: 'civ', partOf: ['oxygen', 'atmosphere'],
    blurb: 'Combustion stops working: nothing can burn.',
    impulse: (s) => { s.energy = Math.min(s.energy, 0.3); },
    events: [
      ev(0, 'doom', 'Every flame goes out', 'Stoves, candles, engines and every power plant that burns fuel stop.'),
      ev(HOUR, 'bad', 'Most power plants are dead', 'Coal, gas and oil plants depend on burning. Nuclear, hydro, wind and solar keep running.'),
      ev(DAY, 'bad', 'Engines are dead weight', 'Every petrol and diesel engine stops for good. Electric vehicles still run.'),
      ev(YEAR, 'info', 'No more wildfires', 'Forests stop burning, which sounds nice until fire-adapted forests and grasslands start to change.'),
      ev(10 * YEAR, 'good', 'An all-electric world', 'Humanity rebuilds around electricity: cooking, heating and steel-making all go electric.', { when: people }),
    ],
  },
  {
    id: 'satellites', name: 'Satellites', cat: 'civ',
    blurb: 'All 10,000-plus working satellites, and all the space junk.',
    impulse: (s) => hit(s, { infra: 0.92 }),
    events: [
      ev(0, 'warn', 'GPS goes dark', 'Navigation apps, ships and planes lose satellite positioning.'),
      ev(MIN, 'warn', 'Clocks drift', 'Power grids, phone networks and stock exchanges use GPS signals to keep time. Things start falling out of sync.'),
      ev(DAY, 'warn', 'Weather forecasts get worse', 'Forecasters lose their eyes in the sky. Storm warnings come later and are less accurate.'),
      ev(YEAR, 'good', 'Space is clean', 'No more orbital debris to dodge. New launches have a perfectly empty sky.'),
      ev(10 * YEAR, 'good', 'Rebuilt', 'With rockets and factories intact, replacing the most important satellites takes years, not decades.', { when: (s) => s.humans > 0.3 }),
    ],
  },
  {
    id: 'nukes', name: 'Nuclear weapons', cat: 'civ',
    blurb: 'All 12,000 nuclear warheads.',
    events: [
      ev(0, 'good', 'The warheads are gone', 'Missile silos and submarines suddenly carry empty shells. Not one nuclear weapon is left.'),
      ev(DAY, 'info', 'Nobody admits it', 'Each nuclear power discovers its own arsenal is gone, and has to wonder about everyone else’s.'),
      ev(YEAR, 'good', 'One less way to end the world', 'The fastest way humanity could have wiped itself out is gone. The know-how isn’t.'),
    ],
  },
  {
    id: 'cities', name: 'Cities', cat: 'civ', visual: 'lights',
    blurb: 'Every building, road and pipe in every town and city.',
    impulse: (s) => { s.infra = Math.min(s.infra, 0.2); hit(s, { energy: 0.5, humans: 0.95 }); },
    events: [
      ev(0, 'doom', 'Everyone is standing in a field', 'More than half of humanity, about 4.5 billion people, is suddenly on bare ground. Anyone on an upper floor falls.'),
      ev(DAY, 'doom', 'No water, no sewers, no shelter', 'Clean water, sanitation and roofs were all built infrastructure. Disease spreads fast.'),
      ev(30 * DAY, 'doom', 'Food doesn’t arrive', 'Farms still exist, but warehouses, ports and roads are gone.'),
      ev(YEAR, 'info', 'Dark nights', 'With no cities, the night side of Earth has almost no lights.'),
      ev(10 * YEAR, 'good', 'Rebuilding', 'People rebuild, starting with villages around farms and rivers, just as the first cities grew.', { when: people }),
    ],
  },
  {
    id: 'money', name: 'Money', cat: 'civ',
    blurb: 'Every coin, banknote and bank balance.',
    impulse: (s) => hit(s, { infra: 0.65 }),
    events: [
      ev(0, 'warn', 'Everyone is broke', 'Bank accounts read zero and wallets are empty, including every billionaire’s.'),
      ev(DAY, 'bad', 'Shops close', 'Nobody can pay, and nobody can be paid.'),
      ev(7 * DAY, 'warn', 'Barter is back', 'People trade food, fuel and favours directly. Canned food becomes a currency.'),
      ev(YEAR, 'good', 'New money', 'Governments issue new currencies. Prices are chaos for a while, but trade restarts.', { when: people }),
      ev(10 * YEAR, 'info', 'Debts are gone too', 'With every record wiped, nobody owes anybody anything. Some people love this.'),
    ],
  },
  {
    id: 'farming', name: 'Farming', cat: 'civ',
    blurb: 'Every crop, farm animal and field, and the know-how to farm.',
    impulse: (s) => { s.farm = 0.002; hit(s, { animals: 0.85 }); },
    events: [
      ev(0, 'doom', 'Back to foraging', 'Fields turn wild. Wheat, rice, maize, chickens and cattle are gone, and nobody remembers how to farm.'),
      ev(30 * DAY, 'doom', 'The great famine', 'Hunting and gathering can feed maybe 10 million people. There are 8 billion.'),
      ev(YEAR, 'good', 'The wild comes back', 'Farmland covered over a third of all land. Forests and grasslands start to reclaim it.'),
      ev(5 * KYR, 'good', 'Farming is reinvented', 'It took people thousands of years to domesticate crops the first time. Slowly, it happens again.', { when: (s) => s.humans > 0 }),
    ],
  },
];
