export type Severity = 'info' | 'good' | 'warn' | 'bad' | 'doom';

export type Category = 'start' | 'space' | 'planet' | 'air' | 'life' | 'civ' | 'physics';

/** What the renderer should visibly erase when something is deleted. */
export type Visual =
  | 'moon' | 'sun' | 'oceans' | 'atmosphere' | 'clouds' | 'ice' | 'stars' | 'land'
  | 'lights' | 'aurora' | 'plants' | 'planet';

/**
 * Everything the model tracks about the planet. Biosphere and civilisation values
 * are relative to today (1 = today), gases are partial pressures.
 */
export interface State {
  T: number;          // radiative mean surface temperature, K
  Td: number;         // ocean / deep heat reservoir, K
  geo: number;        // internal heat expressed as a temperature floor, K
  ocean: number;      // liquid + sea-ice ocean volume (1 = today)
  landIce: number;    // ice sheets (1 = today, about 2% of the ocean volume)
  seaIce: number;     // fraction of the ocean surface frozen
  iceDepth: number;   // typical thickness of that sea ice, m
  steam: number;      // ocean water held in the atmosphere as steam (ocean units)
  runaway: number;    // 1 once a runaway or moist greenhouse has started
  clouds: number;     // cloud cover fraction
  dust: number;       // aerosols, smoke, debris dimming the sky (0..1)
  n2: number;         // nitrogen inventory, bar
  o2: number;         // oxygen inventory, bar
  co2: number;        // carbon dioxide, µbar (≈ ppm at 1 bar)
  ozone: number;      // ozone column (1 = today)
  ghg: number;        // extra greenhouse forcing from methane, permafrost etc., W/m²
  mag: number;        // magnetic field strength (1 = today)
  spin: number;       // rotation rate (1 = 24 h day)
  bulge: number;      // 0 = oceans shaped by spin, 1 = oceans pooled at the poles
  tilt: number;       // axial tilt, degrees
  dist: number;       // distance from the Sun (or where it was), AU
  moonDist: number;   // Earth–Moon distance (1 = today)
  sun: number;        // the Sun's existence / brightness factor (0..1)
  integrity: number;  // 1 = planet in one piece, 0 = scattered debris
  radius: number;     // planet radius (1 = today)
  microbes: number;
  plankton: number;
  plants: number;
  fungi: number;
  insects: number;
  animals: number;    // land and air animals (not insects, not fish, not humans)
  fish: number;       // ocean animals
  humans: number;     // 1 = 8.1 billion people
  energy: number;     // usable energy supply for civilisation
  infra: number;      // cities, networks, supply chains
  farm: number;       // farming know-how, crops and livestock
  soil: number;       // fertile topsoil
}

export type StateKey = keyof State;

export interface Ctx {
  /** Whether a thing is deleted at this moment of the simulation. */
  has(id: string): boolean;
  /** Seconds since the thing was deleted, or Infinity if it was not. */
  since(id: string): number;
  /** Seconds since the first deletion. */
  tAbs: number;
}

export interface ScriptedEvent {
  /** Seconds after the deletion. */
  at: number;
  title: string;
  body: string;
  sev: Severity;
  /** Only show the event if this holds at that moment. */
  when?: (s: State, c: Ctx) => boolean;
  /** Change the planet at that moment. */
  effect?: (s: State, c: Ctx) => void;
  /** Still meaningful after Earth itself is gone. */
  cosmic?: boolean;
}

export interface Deletable {
  id: string;
  name: string;
  cat: Category;
  /** One plain sentence: what exactly gets deleted. */
  blurb: string;
  visual?: Visual;
  /** Instant change at the moment of deletion. */
  impulse?: (s: State, c: Ctx) => void;
  events: ScriptedEvent[];
  /** Deleting it still makes sense after Earth is destroyed. */
  cosmic?: boolean;
  /** Already gone if any of these was deleted first (bees went with the insects). */
  partOf?: string[];
}

export interface Combo {
  ids: string[];
  /** Seconds after the last of the ids was deleted. */
  at: number;
  title: string;
  body: string;
  sev: Severity;
}

export interface SimEvent {
  key: string;
  /** Seconds since the first deletion. */
  t: number;
  /** Which deletion caused it: a deletable id, 'combo', 'nature' or 'auto'. */
  source: string;
  title: string;
  body: string;
  sev: Severity;
}
