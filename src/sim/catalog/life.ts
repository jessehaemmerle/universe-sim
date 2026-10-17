import type { Deletable } from '../types';
import { DAY, KYR, MYR, YEAR } from '../units';
import { ev, hit } from './helpers';

export const LIFE: Deletable[] = [
  {
    id: 'humans', name: 'Humans', cat: 'life', visual: 'lights',
    blurb: 'All 8.1 billion people.',
    impulse: (s) => { s.humans = 0; },
    events: [
      ev(0, 'info', 'Everyone is gone', 'Cars roll to a stop, planes fly on autopilot until their fuel runs out, and dinners burn on the stove.'),
      ev(DAY, 'info', 'The lights go out', 'With nobody feeding them fuel or balancing them, power grids fail within a day or two. The night side of Earth goes dark.'),
      ev(2 * DAY, 'info', 'Subways flood', 'The pumps that keep New York’s subway dry stop, and the tunnels fill with water within days.'),
      ev(30 * DAY, 'warn', 'Pets and livestock fend for themselves', 'Cattle, chickens and sheep bred to depend on us struggle. Dogs and cats go feral; many don’t make it.'),
      ev(YEAR, 'warn', 'Nuclear waste overheats', 'At some of the world’s 400 nuclear plants, pools of spent fuel boil dry without cooling, leaving radioactive hotspots.'),
      ev(20 * YEAR, 'good', 'Nature moves into the cities', 'Plants crack the pavement, roofs leak, and wooden houses rot. Wolves, deer and boar roam the suburbs.'),
      ev(300 * YEAR, 'info', 'Steel bridges fall', 'Without paint and maintenance, rust eats through bridges and towers. Most collapse within a few centuries.'),
      ev(10 * KYR, 'info', 'CO₂ drifts back to normal', 'The extra CO₂ we added takes thousands of years to be absorbed. Earth slowly cools back toward its pre-industrial climate.'),
      ev(100 * KYR, 'info', 'Some things last', 'Pottery, bronze statues and stone monuments like the pyramids could last hundreds of thousands of years. So will a lot of plastic.'),
      ev(MYR, 'info', 'Our signals are still out there', 'The radio and TV we leaked into space is now a thin shell of fading noise a million light-years out, and the Voyager probes are still drifting between the stars.', { cosmic: true }),
    ],
  },
  {
    id: 'animals', name: 'Animals', cat: 'life',
    blurb: 'Every animal except humans, from ants and whales to cows and coral.',
    impulse: (s) => { s.animals = 0; s.insects = 0; s.fish = 0; },
    events: [
      ev(0, 'doom', 'The planet goes silent', 'No birdsong, no buzzing, no fish in the sea. Every farm animal and pet is gone too.'),
      ev(7 * DAY, 'bad', 'No more meat, milk, eggs or fish', 'Animal foods made up about a fifth of humanity’s calories and a large share of its protein.'),
      ev(30 * DAY, 'bad', 'Fruit stops forming', 'With no bees, butterflies or bats to pollinate them, apples, berries, coffee and cocoa bear no fruit.'),
      ev(YEAR, 'warn', 'Dead plants pile up', 'Worms, termites and beetles broke down dead leaves and wood. Now only fungi and bacteria do it, much more slowly.'),
      ev(10 * YEAR, 'info', 'Plants grow unchecked', 'Nothing eats them anymore. Forests and grasslands grow dense, then crowd and smother themselves.'),
      ev(MYR, 'info', 'Animals don’t come back', 'Animals can’t re-evolve from nothing on any useful timescale. It took over 3 billion years for the first ones to appear.'),
    ],
  },
  {
    id: 'plants', name: 'Plants', cat: 'life', visual: 'plants',
    blurb: 'Every tree, flower, grass and moss on land.',
    impulse: (s) => { s.plants = 0; },
    events: [
      ev(0, 'doom', 'The land turns brown', 'Every forest, field and lawn vanishes. Plants made up about 80% of the mass of all life on Earth.'),
      ev(DAY, 'doom', 'Food runs short', 'Every crop is gone. The world’s grain stores last a few months.'),
      ev(30 * DAY, 'doom', 'Grazing animals starve', 'Cows, deer, elephants and leaf-eating insects go first; the predators that eat them follow.'),
      ev(YEAR, 'bad', 'Dust storms', 'With no roots holding it, soil blows away in enormous dust storms.'),
      ev(10 * YEAR, 'info', 'Oxygen is fine, for now', 'Land plants made about half of Earth’s oxygen, but there is enough in the air to last for a very long time. Starvation comes far sooner.'),
      ev(100 * YEAR, 'warn', 'CO₂ rises', 'Microbes keep eating dead plant matter in the soil and breathing out CO₂, and nothing on land absorbs it.'),
    ],
  },
  {
    id: 'trees', name: 'Trees', cat: 'life', visual: 'plants', partOf: ['plants'],
    blurb: 'All three trillion trees.',
    impulse: (s) => hit(s, { plants: 0.4, insects: 0.8, animals: 0.5, fungi: 0.7 }),
    events: [
      ev(0, 'doom', 'The forests are gone', 'A third of the land is suddenly open ground. Birds, monkeys and squirrels have nowhere to live.'),
      ev(7 * DAY, 'bad', 'Wood runs out', 'No more timber or paper, and no firewood for the two billion people who cook with it.'),
      ev(YEAR, 'bad', 'Landslides and floods', 'Tree roots held slopes together and soaked up heavy rain. Hillsides slide and rivers flood.'),
      ev(10 * YEAR, 'bad', 'The Amazon stops making its own rain', 'Rainforests recycle their rainfall through their leaves. Without trees, the Amazon basin dries out.'),
      ev(100 * YEAR, 'info', 'Shrubs take over', 'Trees can’t regrow without seeds. Bushes and grasses spread over the land where forests stood.'),
    ],
  },
  {
    id: 'grass', name: 'Grass', cat: 'life', partOf: ['plants'],
    blurb: 'Every grass species, including wheat, rice, maize, sugarcane and bamboo.',
    impulse: (s) => hit(s, { plants: 0.75, animals: 0.75, insects: 0.9 }),
    events: [
      ev(0, 'doom', 'The grain is gone', 'Wheat, rice, maize, barley and sugarcane are all grasses. Together they supplied about half of humanity’s calories.'),
      ev(DAY, 'bad', 'Grasslands turn to bare ground', 'The prairies, savannas and steppes lose their main plant. Huge parts of every continent are suddenly bare.'),
      ev(30 * DAY, 'doom', 'Grazers starve', 'Cattle, sheep, horses, zebras and wildebeest live on grass. Giant pandas, which eat almost nothing but bamboo, don’t make it either.'),
      ev(YEAR, 'bad', 'A worldwide dust bowl', 'Grass roots held the soil of the plains together. The Dust Bowl of the 1930s repeats on every continent.'),
    ],
  },
  {
    id: 'insects', name: 'Insects', cat: 'life', partOf: ['animals'],
    blurb: 'All ten quintillion insects.',
    impulse: (s) => { s.insects = 0; },
    events: [
      ev(0, 'info', 'A quieter world', 'No buzzing, no chirping. Insects outnumbered us more than a billion to one.'),
      ev(7 * DAY, 'bad', 'Birds go hungry', 'Most songbirds feed their chicks on insects. So do frogs, lizards, bats and many fish.', { effect: (s) => hit(s, { animals: 0.9 }) }),
      ev(30 * DAY, 'bad', 'Fruit and vegetables fail', 'About three quarters of crop types need pollinators. Wheat and rice are pollinated by wind, but diets get very bland.'),
      ev(YEAR, 'warn', 'Dung and dead things pile up', 'Beetles, flies and termites cleared away dung, carcasses and dead wood. Now it piles up and rots slowly.'),
      ev(10 * YEAR, 'doom', 'Ecosystems unravel', 'The biologist E. O. Wilson warned that without insects, life on land would collapse into chaos. Many flowering plants die out.'),
    ],
  },
  {
    id: 'bees', name: 'Bees', cat: 'life', partOf: ['insects', 'animals'],
    blurb: 'All 20,000 species of bee, honeybees included.',
    events: [
      ev(0, 'warn', 'The hives are empty', 'Honeybees, bumblebees and thousands of wild bee species vanish.'),
      ev(30 * DAY, 'bad', 'Orchards bloom for nothing', 'California’s almond orchards rely almost entirely on bees. Blueberries, apples and cherries yield far less too.'),
      ev(YEAR, 'info', 'Other pollinators step in', 'Flies, butterflies, beetles, birds and bats pollinate too. Many crops get by with smaller harvests.'),
      ev(2 * YEAR, 'bad', 'Worse diets', 'A 2015 study estimated that losing all pollinators would cause about 1.4 million extra deaths a year from poorer nutrition.'),
    ],
  },
  {
    id: 'mosquitoes', name: 'Mosquitoes', cat: 'life', partOf: ['insects', 'animals'],
    blurb: 'All 3,500 species of mosquito.',
    events: [
      ev(0, 'good', 'No more itching', 'The deadliest animal to humans is gone.'),
      ev(YEAR, 'good', 'Malaria fades away', 'Malaria, dengue, Zika and yellow fever lose their carriers. Malaria alone killed around 600,000 people a year, mostly young children.'),
      ev(YEAR + DAY, 'info', 'Some fish and birds go hungry', 'Mosquito larvae fed fish, and adults fed birds, bats and spiders. Most of them switch to other prey.'),
      ev(10 * YEAR, 'info', 'The Arctic shifts a little', 'Arctic mosquito swarms fed migrating birds and steered caribou herds. Scientists think most ecosystems would adjust.'),
    ],
  },
  {
    id: 'earthworms', name: 'Earthworms', cat: 'life', partOf: ['animals', 'soil', 'land'],
    blurb: 'All 7,000 species of earthworm.',
    events: [
      ev(0, 'warn', 'The soil goes still', 'Earthworms mixed and aerated the soil and turned dead leaves into rich humus.'),
      ev(YEAR, 'info', 'Leaves pile up', 'In many forests, leaf litter that worms used to pull underground stays on the surface.'),
      ev(10 * YEAR, 'warn', 'Harder, poorer soil', 'Without worm tunnels, rain soaks in more slowly and soil packs down. Farm yields drop a little.'),
      ev(100 * YEAR, 'good', 'Some forests recover', 'In parts of North America, earthworms were invaders brought by European settlers. Native forest floors there bounce back.'),
    ],
  },
  {
    id: 'fish', name: 'Fish', cat: 'life', partOf: ['animals', 'oceans'],
    blurb: 'Every fish, from goldfish to great white sharks.',
    impulse: (s) => hit(s, { fish: 0.3 }),
    events: [
      ev(0, 'doom', 'The seas empty', 'About 35,000 species of fish vanish, from mountain streams to the deep sea.'),
      ev(DAY, 'bad', 'Fishing boats come back empty', 'Fish supplied about 15% of the animal protein people eat, and much more in many coastal countries.'),
      ev(30 * DAY, 'doom', 'Seabirds, seals and dolphins starve', 'Most of them lived on fish.', { effect: (s) => hit(s, { animals: 0.95 }) }),
      ev(YEAR, 'warn', 'Jellyfish take over', 'With nothing eating them and nothing competing for plankton, jellyfish swarms fill the seas.'),
      ev(100 * MYR, 'info', 'Something new fills the oceans', 'Given enough time, other animals evolve to fill the empty niches, as mammals did after the dinosaurs.'),
    ],
  },
  {
    id: 'plankton', name: 'Phytoplankton', cat: 'life', partOf: ['oceans'],
    blurb: 'The microscopic algae drifting in the sunlit ocean.',
    impulse: (s) => { s.plankton = 0; },
    events: [
      ev(0, 'doom', 'The sea turns crystal clear', 'The green tint of the ocean is gone, and with it the base of almost every marine food chain.'),
      ev(7 * DAY, 'doom', 'Krill starve', 'Krill and tiny copepods that graze on phytoplankton start dying off.'),
      ev(30 * DAY, 'doom', 'Fish, whales and seabirds follow', 'Each step up the food chain collapses in turn.'),
      ev(YEAR, 'warn', 'Half of the oxygen supply is gone', 'Phytoplankton made about half of the oxygen produced on Earth. The air still holds enough for a very long time.'),
      ev(10 * YEAR, 'info', 'Fewer clouds over the sea', 'Plankton give off a gas, dimethyl sulfide, that helps seed clouds. Skies over the ocean get clearer.'),
      ev(100 * YEAR, 'bad', 'CO₂ rises', 'Plankton carried carbon into the deep sea when they died and sank. Without this biological pump, much more CO₂ stays in the air.'),
    ],
  },
  {
    id: 'bacteria', name: 'Bacteria', cat: 'life',
    blurb: 'Every bacterium, including the 38 trillion living in your body.',
    impulse: (s) => { s.microbes = Math.min(s.microbes, 0.1); hit(s, { plankton: 0.6 }); },
    events: [
      ev(0, 'warn', 'Your gut goes quiet', 'About half the cells in your body were bacteria. Digestion gets harder, but nobody drops dead.'),
      ev(DAY, 'good', 'Bacterial diseases vanish', 'Tuberculosis, cholera and plague are gone. Antibiotics are suddenly pointless.'),
      ev(7 * DAY, 'bad', 'Cows and sheep start starving', 'Cattle, sheep and termites need gut bacteria to digest grass and wood. Without them, they can’t get energy out of their food.', { effect: (s) => hit(s, { animals: 0.7 }) }),
      ev(30 * DAY, 'bad', 'Nothing rots', 'Dead leaves, food scraps and bodies stop decaying. Fungi do some of the work, but far more slowly.'),
      ev(YEAR, 'doom', 'The nitrogen supply collapses', 'Bacteria turned nitrogen from the air into fertiliser for plants. Farms can use factory-made fertiliser; wild plants can’t.'),
      ev(10 * YEAR, 'info', 'Archaea and fungi carry on', 'Bacteria’s distant cousins, the archaea, and fungi take over some of their jobs. The world is poorer and stranger, but not sterile.'),
    ],
  },
  {
    id: 'fungi', name: 'Fungi', cat: 'life',
    blurb: 'Every mushroom, mould and yeast.',
    impulse: (s) => { s.fungi = 0; },
    events: [
      ev(0, 'info', 'No more bread, beer or blue cheese', 'Yeast and moulds are gone, along with every mushroom, and the mould that gave us penicillin.'),
      ev(30 * DAY, 'bad', 'Plants lose their partners', 'About 90% of plants trade sugar with fungi in their roots in exchange for water and nutrients. Without them, they weaken.'),
      ev(YEAR, 'warn', 'Dead wood piles up', 'Only fungi can efficiently break down lignin, the tough stuff in wood. Fallen trees stop rotting.'),
      ev(10 * YEAR, 'info', 'Forests choke on their own debris', 'When trees first evolved, there were no fungi to digest wood yet. Some scientists think that is partly why so much coal formed back then.'),
      ev(10 * YEAR + DAY, 'good', 'Fewer plant diseases', 'Rusts, blights and Dutch elm disease are fungi too. Some crops and trees do better.'),
    ],
  },
  {
    id: 'viruses', name: 'Viruses', cat: 'life',
    blurb: 'Every virus, from flu to the trillions that infect bacteria.',
    events: [
      ev(0, 'good', 'No more colds or flu', 'COVID, flu, HIV, measles and rabies vanish in an instant.'),
      ev(7 * DAY, 'warn', 'Bacteria go unchecked', 'Viruses called phages killed a large share of the ocean’s bacteria every day. Now bacterial blooms explode.'),
      ev(30 * DAY, 'bad', 'Ocean chemistry shifts', 'Bacteria burst open by viruses were a key source of nutrients for plankton. That recycling loop is broken.'),
      ev(YEAR, 'warn', 'Ecosystems reshuffle', 'Viruses kept the most common species in check. Some populations boom, then crash.'),
      ev(10 * YEAR, 'info', 'We’re partly viral', 'About 8% of human DNA came from ancient viruses, including a gene that helps build the placenta. Luckily, those aren’t viruses anymore.'),
    ],
  },
  {
    id: 'cows', name: 'Cows', cat: 'life', partOf: ['animals', 'farming'],
    blurb: 'All 1.5 billion cattle.',
    impulse: (s) => hit(s, { animals: 0.9 }),
    events: [
      ev(0, 'warn', 'The pastures are empty', 'One and a half billion cattle disappear, along with all beef, milk, cheese and leather.'),
      ev(7 * DAY, 'warn', 'Food prices spike', 'Beef and dairy were a big part of diets in many countries. People switch to other foods.'),
      ev(YEAR, 'good', 'Less methane', 'Cattle burps were a major source of methane, a powerful greenhouse gas. Warming slows a little.'),
      ev(10 * YEAR, 'good', 'Land goes wild', 'Pasture and fields of cattle feed covered vast areas. Much of it returns to forest and grassland.'),
    ],
  },
];

