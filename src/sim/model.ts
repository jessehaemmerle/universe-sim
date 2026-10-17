import type { Ctx, State } from './types';
import { DAY, GYR, HOUR, KYR, MIN, MYR, YEAR } from './units';

/*
 * A deliberately small planet model. Every quantity relaxes toward an equilibrium set by
 * the current conditions, with a timescale taken from the real process (days for clouds,
 * millennia for ice sheets, millions of years for oxygen). Relaxation is exact for any
 * step size, so the same code handles the first second and the next ten billion years.
 */

const SIGMA = 5.670374e-8;
const S0 = 1361;
const AU_KM = 1.496e8;
const MOON_KM = 384400;
const EARTH_ORBIT_KMS = 29.78;
const MOON_ORBIT_KMS = 1.022;

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function smooth(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function relax(x: number, target: number, tau: number, dt: number): number {
  if (!(tau > 0)) return target;
  return target + (x - target) * Math.exp(-dt / tau);
}

function relax2(x: number, target: number, tauUp: number, tauDown: number, dt: number): number {
  return relax(x, target, target > x ? tauUp : tauDown, dt);
}

export function baseline(): State {
  return {
    T: 288, Td: 288, geo: 36,
    ocean: 1, landIce: 1, seaIce: 0.057, iceDepth: 2, steam: 0, runaway: 0,
    clouds: 0.67, dust: 0,
    n2: 0.79, o2: 0.21, co2: 420, ozone: 1, ghg: 0, mag: 1,
    spin: 1, bulge: 0, tilt: 23.44, dist: 1, moonDist: 1, sun: 1,
    integrity: 1, radius: 1,
    microbes: 1, plankton: 1, plants: 1, fungi: 1, insects: 1, animals: 1, fish: 1, humans: 1,
    energy: 1, infra: 1, farm: 1, soil: 1,
  };
}

/* ---------- the Sun ---------- */

/** The Sun's natural brightening, red giant phase and white dwarf fade, relative to today. */
export function sunNatural(tAbs: number): number {
  const g = tAbs / GYR;
  if (g < 5) return 1 + 0.1 * g;
  if (g < 7) return 1.5 * Math.pow(20, (g - 5) / 2);
  if (g < 7.6) return 30 * Math.pow(90, (g - 7) / 0.6);
  if (g < 7.75) return 60;
  return Math.max(5e-4, 60 * Math.exp(-(g - 7.75) * 12));
}

/** Sunlight reaching Earth, relative to today. */
export function solarFlux(s: State, c: Ctx): number {
  const light = c.has('light') ? 0.5 : 1;
  return (s.sun * sunNatural(c.tAbs) * light) / (s.dist * s.dist);
}

/* ---------- air ---------- */

const n2Gas = (s: State) => s.n2 * smooth(55, 80, s.T);
export const o2Gas = (s: State) => s.o2 * smooth(55, 90, s.T);
export const co2Gas = (s: State) => s.co2 * smooth(150, 195, s.T);

/** Surface pressure in bar. Gases freeze out of the sky when it gets cold enough. */
export function pressure(s: State): number {
  return n2Gas(s) + o2Gas(s) + co2Gas(s) * 1e-6 + s.steam * 270;
}

/* ---------- temperatures by latitude ---------- */

/** Equator-to-pole temperature difference. */
function spread(s: State, c: Ctx): number {
  const P = pressure(s);
  let d = c.has('wind') ? 75 : 45;
  if (s.ocean < 0.2) d += 12 * (1 - Math.max(0, s.ocean) / 0.2);
  if (P < 0.02) d = 90;
  else if (P > 5) d = Math.max(4, d / (1 + (P - 5) / 8));
  return d;
}

/*
 * Annual mean temperature by latitude: T(μ) = T + d·(1/3 − μ²), with μ = sin(latitude) so
 * equal steps of μ cover equal areas. The profile averages to T. A deleted cold puts a floor
 * under every latitude, a deleted heat a ceiling over it.
 */
interface Bands { top: number; d: number; floor: number; ceil: number; }

function bands(s: State, c: Ctx): Bands {
  const d = spread(s, c);
  return {
    top: s.T + d / 3,
    d,
    // If both are deleted the rules contradict each other; the heat ceiling wins.
    floor: c.has('cold') && !c.has('heat') ? 293 : -Infinity,
    ceil: c.has('heat') ? 273 : Infinity,
  };
}

/** μ where the unclamped profile equals x (warmer than x for all smaller μ). */
function muAt(b: Bands, x: number): number {
  return Math.sqrt(clamp((b.top - x) / b.d, 0, 1));
}

/** Mean surface temperature as felt on the ground (includes the cold floor / heat ceiling). */
export function surfaceTemp(s: State, c: Ctx): number {
  if (!c.has('cold') && !c.has('heat')) return s.T;
  const b = bands(s, c);
  const a = muAt(b, b.ceil);
  const e = muAt(b, b.floor);
  const middle = b.top * (e - a) - (b.d * (e * e * e - a * a * a)) / 3;
  return (Number.isFinite(b.ceil) ? b.ceil * a : 0) + middle + (Number.isFinite(b.floor) ? b.floor * (1 - e) : 0);
}

/** Fraction of the surface whose annual mean temperature lies in [lo, hi]. */
export function fracBetween(s: State, c: Ctx, lo: number, hi: number): number {
  const b = bands(s, c);
  if (b.floor > hi || b.ceil < lo) return 0;
  const upper = b.floor >= lo ? 1 : muAt(b, lo);
  const lower = b.ceil <= hi ? 0 : muAt(b, hi);
  return Math.max(0, upper - lower);
}

/** Fraction of the surface cold enough for permanent ice and snow. */
export function iceCover(s: State, c: Ctx, tIce = 263): number {
  return 1 - fracBetween(s, c, tIce, Infinity);
}

/** Latitude (degrees) where permanent ice begins, for the renderer. */
export function iceLatitude(s: State, c: Ctx, tIce = 263): number {
  return (Math.asin(clamp(1 - iceCover(s, c, tIce), 0, 1)) * 180) / Math.PI;
}

/* ---------- derived numbers for the interface ---------- */

export function molten(s: State): number {
  return smooth(1250, 1450, s.T);
}

export function dayHours(s: State, c: Ctx): number {
  if (c.has('rotation')) return 8766;
  return 24 / Math.max(1e-6, s.spin);
}

export function civTech(s: State): number {
  return Math.pow(clamp(s.energy, 0, 1), 0.6) * Math.pow(clamp(s.infra, 0, 1), 0.7);
}

export function civ(s: State): number {
  return clamp(s.humans / 0.02, 0, 1) * civTech(s);
}

export function lifeIndex(s: State): number {
  const m = (x: number) => clamp(x, 0, 1.2);
  return (
    0.3 * m(s.plants) + 0.15 * m(s.plankton) + 0.15 * m(s.microbes) + 0.1 * m(s.animals) +
    0.1 * m(s.insects) + 0.1 * m(s.fish) + 0.1 * m(s.fungi)
  );
}

/* ---------- normalisers so today's Earth scores 1 ---------- */

const NO_DELETIONS: Ctx = { has: () => false, since: () => Infinity, tAbs: 0 };
const B = baseline();
const NORM_PLANTS = fracBetween(B, NO_DELETIONS, 263, 320);
const NORM_ANIMALS = fracBetween(B, NO_DELETIONS, 258, 320);
const NORM_HUMANS = fracBetween(B, NO_DELETIONS, 250, 316);
const NORM_OCEAN = fracBetween(B, NO_DELETIONS, 270, 306);
const OPEN_TODAY = 1 - 0.85 * B.seaIce;

/* ---------- climate ---------- */

interface Climate { Teq: number; g: number; }

function greenhouseAndBalance(s: State, c: Ctx): Climate {
  const P = pressure(s);
  const T = s.T;

  // Water vapour, the strongest greenhouse gas, follows temperature and needs open water.
  let vap = 0;
  if (P > 0.006) {
    const water = Math.min(1, Math.max(0, s.ocean) / 0.05) * 0.92 + Math.min(0.08, s.landIce * 0.08);
    vap = water * clamp(Math.exp(0.07 * (T - 288)), 0, 3) * (1 - 0.7 * s.seaIce);
    if (c.has('rain')) vap *= 1.8;
    if (c.has('vapor') && c.since('vapor') < 9 * DAY) vap *= c.since('vapor') / (9 * DAY);
  }
  const co2 = co2Gas(s);
  const gCO2 = 0.045 * Math.max(0, 1 + 0.104 * Math.log2(Math.max(co2, 1e-3) / 420));
  // Logarithmic in vapour: gentle near today's climate, collapsing as the air dries out.
  const gH2O = vap > 0 ? 0.0774 * Math.max(0, 1 + 0.25 * Math.log(vap)) : 0;
  const pf = P > 0 ? Math.min(2.5, Math.pow(P, 0.2)) : 0;
  const g = (gCO2 + gH2O + 0.0035 * s.ghg) * pf + 2.0 * Math.sqrt(Math.min(1.5, s.steam));

  // Albedo: clouds, ice, oceans, deserts, vegetation, dust.
  const oceanArea = c.has('land')
    ? clamp(s.ocean / 0.05, 0, 1)
    : Math.min(1, 0.71 * Math.pow(Math.max(0, s.ocean), 0.3));
  const landArea = 1 - oceanArea;
  const snow = Math.max(iceCover(s, c), Math.min(0.9, 0.11 * Math.pow(Math.max(0, s.landIce), 0.7)));
  const landAlb = 0.32 - 0.14 * clamp(s.plants, 0, 1);
  const surfAlb =
    oceanArea * ((1 - s.seaIce) * 0.06 + s.seaIce * 0.5) + landArea * ((1 - snow) * landAlb + snow * 0.55);
  const cloudAlb = P < 0.01 ? 0 : s.steam > 0.02 ? 0.65 : 0.3 * s.clouds;
  const alpha = clamp(cloudAlb + (1 - cloudAlb) * surfAlb * 0.75 + 0.3 * s.dust, 0, 0.95);

  const S = S0 * solarFlux(s, c);
  const Te = Math.pow((S * (1 - alpha)) / (4 * SIGMA), 0.25);
  const Trad = Te * (1 + g) * CAL;
  return { Teq: Math.pow(Math.pow(Trad, 4) + Math.pow(s.geo, 4), 0.25), g };
}

// Small calibration so today's Earth sits exactly at 288 K.
let CAL = 1;
CAL = 288 / greenhouseAndBalance(B, NO_DELETIONS).Teq;

function stepClimate(s: State, c: Ctx, dt: number) {
  const { Teq, g } = greenhouseAndBalance(s, c);
  const P = pressure(s);
  const oc = clamp(s.ocean, 0, 1.5);
  const Cs = 3.5e6 + 4e5 * Math.min(P, 300);
  const Cd = 2e7 + 3.5e8 * oc;
  // Heat from the ocean reaches the surface easily through open water, barely through thick ice.
  const wet = Math.min(1, oc);
  const throughIce = Math.min(1.6, 2.2 / Math.max(1, s.iceDepth));
  const gamma = 0.25 * (1 - 0.71 * wet) + 0.71 * wet * ((1 - s.seaIce) * 1.6 + s.seaIce * throughIce);
  const sig = SIGMA / Math.pow((1 + g) * CAL, 4);

  s.Td = relax(s.Td, s.T, Cd / gamma, dt);

  // Surface temperature where outgoing radiation balances heat from the ocean reservoir.
  const f = (x: number) => sig * (Math.pow(Teq, 4) - Math.pow(x, 4)) + gamma * (s.Td - x);
  let lo = 2;
  let hi = Math.max(Teq, s.Td, s.T) * 1.01 + 10;
  for (let i = 0; i < 48; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) > 0) lo = mid; else hi = mid;
  }
  const Tstar = 0.5 * (lo + hi);
  const Tm = Math.max(s.T, Tstar);
  s.T = relax(s.T, Tstar, Cs / (4 * sig * Tm * Tm * Tm + gamma), dt);

  // Freezing a whole ocean releases enormous latent heat: the water under the ice stays
  // near its freezing point until the ice reaches the sea floor.
  const frozenSolid = s.iceDepth >= 3700 * Math.max(0.01, s.ocean);
  if (s.ocean > 0.02 && !frozenSolid && !c.has('heat')) s.Td = Math.max(s.Td, 271);
  if (c.has('cold')) s.Td = Math.max(s.Td, 293);
  if (c.has('heat')) s.Td = Math.min(s.Td, 273);
}

/* ---------- water and ice ---------- */

function stepWater(s: State, c: Ctx, dt: number, Ts: number) {
  const P = pressure(s);

  // Sea ice
  let seaEq = iceCover(s, c, c.has('salt') ? 266 : 263);
  if (P < 0.006) seaEq = 1; // an ocean under vacuum boils, cools and freezes over
  if (c.has('heat')) seaEq = 1;
  if (c.has('cold') && !c.has('heat')) seaEq = 0;
  if (s.ocean < 0.002) { s.seaIce = 0; } else s.seaIce = relax(s.seaIce, seaEq, 0.4 * YEAR, dt);

  // Ice thickens as the cold conducts through it, until Earth's own heat flow balances it.
  if (s.seaIce > 0.5 && Ts < 268 && s.ocean > 0.002) {
    const maxDepth = Math.min(3700 * s.ocean, (2.2 * (271 - Ts)) / 0.09);
    s.iceDepth = Math.min(maxDepth, Math.sqrt(s.iceDepth * s.iceDepth + (2 * 2.2 * (271 - Ts) * dt) / 3.06e8));
  } else {
    s.iceDepth = relax(s.iceDepth, 2, s.seaIce < 0.3 ? 2 * YEAR : 300 * YEAR, dt);
  }

  // Ice sheets lock up or release ocean water (1 unit of ice = 2.1% of today's ocean).
  let sheetEq = Ts >= 288 ? clamp((298 - Ts) / 10, 0, 1) : 1 + (288 - Ts) * 0.25;
  if (c.has('heat')) sheetEq = 4;
  if (c.has('cold') && !c.has('heat')) sheetEq = 0;
  sheetEq = Math.min(sheetEq, 6, Math.max(0, s.ocean) * 47);
  const melting = sheetEq < s.landIce;
  const tauSheet = melting ? (Ts > 300 ? 600 * YEAR : 3 * KYR) : 30 * KYR;
  const before = s.landIce;
  s.landIce = relax(s.landIce, sheetEq, tauSheet, dt);
  s.ocean = Math.max(0, s.ocean - (s.landIce - before) * 0.021);

  // Runaway greenhouse: oceans boil into a steam atmosphere.
  if (s.ocean > 0.001 && Ts > 345 && P > 0.01) s.runaway = 1;
  if (s.runaway > 0 && s.ocean > 0) {
    const moved = s.ocean * (1 - Math.exp(-dt / (2 * KYR)));
    s.ocean -= moved;
    s.steam += moved;
  }
  if (s.runaway > 0 && Ts < 320) s.runaway = 0;
  if (s.runaway === 0 && s.steam > 0) {
    const moved = s.steam * (1 - Math.exp(-dt / KYR));
    s.steam -= moved;
    s.ocean += moved;
  }
  // Steam is split by sunlight and its hydrogen leaks to space, as happened on Venus.
  if (s.steam > 0) s.steam = relax(s.steam, 0, 300 * MYR, dt);

  // A brightening Sun slowly drives water into the upper air where it is lost (moist greenhouse).
  const flux = solarFlux(s, c);
  if (flux > 1.08 && s.ocean > 0) s.ocean = relax(s.ocean, 0, 500 * MYR * Math.pow(1.08 / flux, 4), dt);
  // Without air, exposed water slowly sublimates and escapes.
  if (P < 0.006 && s.ocean > 0) s.ocean = relax(s.ocean, 0, 400 * MYR, dt);
}

/* ---------- air ---------- */

function volcanic(c: Ctx): boolean {
  return !c.has('volcanoes') && !c.has('tectonics') && !c.has('heat') && !c.has('core') && !c.has('iron');
}

function stepAir(s: State, c: Ctx, dt: number, Ts: number) {
  // Without a magnetic field the solar wind strips the upper atmosphere, slowly.
  if (s.mag < 0.3) {
    s.n2 = relax(s.n2, 0, 8 * GYR, dt);
    s.o2 = relax(s.o2, 0, 8 * GYR, dt);
  }
  if (c.has('atmosphere') && volcanic(c) && !c.has('nitrogen')) s.n2 = relax2(s.n2, 0.15, 1.5 * GYR, 1e30, dt);

  // Oxygen is kept topped up by photosynthesis; without it, rocks and volcanic gases slowly eat it.
  const producers = 0.5 * clamp(s.plants, 0, 1) + 0.5 * clamp(s.plankton, 0, 1);
  const o2Eq = 0.21 * clamp(producers * 1.6, 0, 1) * (s.o2 > 0.001 || producers > 0.05 ? 1 : 0);
  s.o2 = relax2(s.o2, o2Eq, 40 * MYR, 5 * MYR, dt);

  // Carbon dioxide
  const humansEmit = s.humans > 0.3 && s.energy > 0.5 && !c.has('fossil') && !c.has('fire');
  let co2Eq = humansEmit ? 420 : 280;
  const g = c.tAbs / GYR;
  const nat = g < 0.3 ? 1 - g * 0.6 : g < 0.6 ? 0.82 - (g - 0.3) * 0.95 : Math.max(0.01, 0.535 * Math.exp(-(g - 0.6) * 9));
  co2Eq *= nat;
  co2Eq += (1 - clamp(s.plants, 0, 1)) * 300 * (s.microbes > 0.2 ? 1 : 0.3) * (c.has('land') ? 0 : 1);
  co2Eq += (1 - clamp(s.plankton, 0, 1)) * 200 * (s.ocean > 0.3 ? 1 : 0);
  if (!c.has('fungi') && s.fungi < 0.2 && s.plants > 0.3) co2Eq *= 0.85; // undecayed wood locks up carbon
  let tauUp = 300 * YEAR;
  let tauDown = 5 * KYR;
  if (!volcanic(c)) { co2Eq = Math.min(co2Eq, 10); tauDown = 400 * KYR; }
  if (c.has('co2') || c.has('atmosphere')) tauUp = 300 * KYR;
  // On a frozen planet rocks stop weathering, so volcanic CO₂ piles up until it melts the ice.
  if (s.seaIce > 0.9 && s.ocean > 0.1 && volcanic(c) && solarFlux(s, c) > 0.5) { co2Eq = 1e5; tauUp = 4 * MYR; }
  if (pressure(s) < 0.006) co2Eq = Math.min(co2Eq, 50);
  s.co2 = relax2(s.co2, co2Eq, tauUp, tauDown, dt);

  // Ozone is remade from oxygen by sunlight within months.
  const ozEq = o2Gas(s) > 0.005 && solarFlux(s, c) > 0.02 ? Math.min(1.1, Math.sqrt(o2Gas(s) / 0.21)) : 0;
  s.ozone = relax(s.ozone, ozEq, 0.3 * YEAR, dt);

  // Extra greenhouse gases: thawing permafrost and methane hydrates in a warm deep ocean.
  let ghgEq = 0;
  if (Ts > 291 && s.integrity > 0.5) ghgEq += 1.5 * smooth(291, 296, Ts);
  if (s.Td > 291 && s.ocean > 0.3) ghgEq += 6 * smooth(291, 296, s.Td);
  if (c.has('cows')) ghgEq -= 0.25;
  if (s.humans < 0.05 || c.has('farming')) ghgEq -= 0.15;
  s.ghg = relax(s.ghg, ghgEq, ghgEq > s.ghg ? 400 * YEAR : 60 * YEAR, dt);

  // Clouds re-form within days from whatever water vapour is around.
  let cloudEq = 0.67;
  const P = pressure(s);
  if (P < 0.02) cloudEq = 0;
  else {
    cloudEq *= 0.25 + 0.75 * clamp(s.ocean / 0.3, 0, 1);
    if (Ts < 240) cloudEq *= 0.45;
    if (c.has('rain')) cloudEq = 0.95;
    if (c.has('wind')) cloudEq *= 0.8;
    if (c.has('rotation')) cloudEq = Math.min(1, cloudEq * 1.2);
    if (s.plankton < 0.2) cloudEq *= 0.93;
    if (s.steam > 0.02) cloudEq = 1;
  }
  s.clouds = relax(s.clouds, cloudEq, 3 * DAY, dt);
  s.dust = relax(s.dust, 0, 1.5 * YEAR, dt);
}

/* ---------- orbit, rotation, interior ---------- */

/** Deterministic smooth noise in [-1, 1] for the Moonless wandering tilt. */
function noise1(x: number): number {
  const h = (n: number) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

function stepOrbit(s: State, c: Ctx, dt: number) {
  // Distance from the Sun: without the Sun's pull Earth coasts off in a straight line.
  const free = Math.min(c.since('sun'), c.since('gravity'), c.since('strong'));
  if (Number.isFinite(free)) {
    const travelled = (EARTH_ORBIT_KMS * free) / AU_KM;
    s.dist = Math.sqrt(1 + travelled * travelled);
  } else {
    // The dying Sun loses mass and Earth's orbit widens.
    s.dist = 1 + 0.6 * smooth(6.5 * GYR, 7.7 * GYR, c.tAbs);
  }

  // The Moon: drifts off without gravity, creeps inward if Earth stops spinning.
  if (Number.isFinite(c.since('gravity'))) {
    s.moonDist = 1 + (MOON_ORBIT_KMS * c.since('gravity')) / MOON_KM;
  } else if (c.has('rotation')) {
    s.moonDist = Math.max(0.3, s.moonDist - (0.08 * dt) / GYR);
  } else if (!c.has('moon')) {
    s.moonDist = Math.min(1.25, s.moonDist + (0.01 * dt) / GYR);
  }

  // Day length: lunar tides keep braking Earth's spin by about 2 ms per century.
  if (c.has('rotation')) s.spin = 0;
  else {
    const withMoon = Math.min(c.tAbs, c.since('moon') < Infinity ? c.tAbs - c.since('moon') : c.tAbs);
    s.spin = Math.min(s.spin, 24 / (24 + 6.4 * (withMoon / GYR)));
  }
  s.bulge = relax(s.bulge, c.has('rotation') ? 1 : 0, 4 * DAY, dt);

  // Axial tilt: the Moon keeps it steady. Without it, the tilt slowly starts to wander.
  const baseTilt = c.has('tilt') ? 0 : 23.3 + 1.2 * Math.sin((2 * Math.PI * c.tAbs) / (41 * KYR));
  if (c.has('moon') && !c.has('rotation')) {
    const amp = 32 * smooth(1e5 * YEAR, 5e7 * YEAR, c.since('moon'));
    s.tilt = clamp(Math.abs(baseTilt + amp * noise1(c.tAbs / (3 * MYR) + 0.37)), 0, 85);
  } else {
    s.tilt = baseTilt;
  }

  // Internal heat after a core collapse fades over millions of years.
  if (c.has('heat')) s.geo = 0;
  else s.geo = relax(s.geo, 36, 4 * MYR, dt);

  // The magnetic field needs a liquid, convecting iron core.
  let magEq = 1;
  if (c.has('magfield') || c.has('core') || c.has('iron') || c.has('heat')) magEq = 0;
  if (c.has('rotation')) magEq = Math.min(magEq, 0.5);
  if (c.has('tectonics')) magEq = Math.min(magEq, 1 - 0.7 * smooth(0, 1.5 * GYR, c.since('tectonics')));
  s.mag = magEq === 0 ? 0 : relax(s.mag, magEq, 10 * KYR, dt);
}

/* ---------- life ---------- */

interface Habitat {
  intact: number;
  airOK: number;
  breathe: number;
  light: number;
  co2Plants: number;
  uv: number;
  tPlants: number;
  tAnimals: number;
  tHumans: number;
  tOcean: number;
  tMicrobes: number;
  oceanOpen: number;
  rainLand: number;
  lethalAir: boolean;
  lethalTemp: boolean;
}

function habitat(s: State, c: Ctx, Ts: number): Habitat {
  const P = pressure(s);
  const o2p = o2Gas(s);
  const flux = solarFlux(s, c) * (1 - 0.9 * s.dust);
  const co2 = co2Gas(s);
  let rainLand = c.has('rain') ? 0.12 : 1;
  rainLand *= 0.15 + 0.85 * clamp(s.ocean / 0.3, 0, 1);
  if (c.has('wind')) rainLand *= 0.55;
  if (c.has('mountains')) rainLand *= 0.93;
  if (c.has('trees')) rainLand *= 0.9;
  return {
    intact: s.integrity > 0.9 && molten(s) < 0.05 ? 1 : 0,
    airOK: smooth(0.03, 0.08, P),
    breathe: smooth(0.04, 0.12, o2p),
    light: smooth(0.003, 0.05, flux),
    co2Plants: 0.3 * smooth(4, 20, co2) + 0.7 * smooth(90, 180, co2),
    uv: 0.75 + 0.25 * Math.min(1, s.ozone),
    tPlants: clamp(fracBetween(s, c, 263, 320) / NORM_PLANTS, 0, 1),
    tAnimals: clamp(fracBetween(s, c, 258, 320) / NORM_ANIMALS, 0, 1),
    tHumans: clamp(fracBetween(s, c, 250, 316) / NORM_HUMANS, 0, 1),
    tOcean: clamp(fracBetween(s, c, 270, 306) / NORM_OCEAN, 0, 1),
    tMicrobes: smooth(170, 215, Ts) * (1 - smooth(390, 430, Ts)),
    oceanOpen: s.ocean > 0.02 && P > 0.006 ? 1 - 0.85 * s.seaIce : 0,
    rainLand,
    lethalAir: P < 0.03 || o2p < 0.03,
    lethalTemp: Ts > 335 || Ts < 215 || c.has('heat'),
  };
}

const EXTINCT = 1e-9;

/** Ecosystems have slack: a dependency only starts to hurt once it falls below k. */
const sat = (x: number, k: number) => clamp(x / k, 0, 1);

function grow(x: number, K: number, tauGrow: number, tauDie: number, dt: number): number {
  if (x <= 0) return 0;
  const v = relax2(x, K, tauGrow, tauDie, dt);
  return v < EXTINCT ? 0 : v;
}

function stepLife(s: State, c: Ctx, dt: number, Ts: number) {
  const h = habitat(s, c, Ts);
  const land = c.has('land') ? 0 : 1;
  const micro = clamp(s.microbes, 0, 1);
  const plants = clamp(s.plants, 0, 1);
  const soil = 0.3 + 0.7 * clamp(s.soil, 0, 1);

  // Microbes: deep underground they outlast almost anything short of a molten planet.
  const refuge = Ts < 650 ? 0.15 : 0;
  let Kmic = h.intact * (refuge + 0.85 * h.tMicrobes * (0.3 + 0.7 * Math.max(plants, clamp(s.plankton, 0, 1))));
  if (c.has('bacteria')) Kmic = Math.min(Kmic, 0.1); // archaea carry on
  s.microbes = grow(s.microbes, Kmic, 1 * YEAR, h.intact ? 2 * YEAR : MIN, dt);

  // Phytoplankton: sunlit, liquid, salty ocean.
  let Kplk = h.intact * Math.min(1, h.oceanOpen / OPEN_TODAY) * h.light * h.co2Plants * h.tOcean * h.uv * (0.6 + 0.4 * micro);
  if (c.has('salt')) Kplk *= 0.55;
  if (c.has('bacteria')) Kplk *= 0.7; // cyanobacteria were part of the plankton
  if (c.has('viruses')) Kplk *= 0.85;
  s.plankton = grow(s.plankton, Kplk, 30 * DAY, h.lethalAir && pressure(s) < 0.006 ? DAY : 20 * DAY, dt);

  // Land plants
  let capPlants = 1;
  if (c.has('trees')) capPlants *= 0.4;
  if (c.has('grass')) capPlants *= 0.75;
  if (c.has('earthworms')) capPlants *= 0.95;
  if (c.has('nitrogen')) capPlants *= 0.85;
  const Kpl =
    h.intact * land * h.light * h.co2Plants * h.tPlants * h.rainLand * soil * h.airOK *
    smooth(0.001, 0.01, o2Gas(s)) * (0.35 + 0.65 * sat(s.fungi, 0.6)) *
    (0.8 + 0.2 * sat(s.insects, 0.5)) * (0.4 + 0.6 * sat(micro, 0.5)) * h.uv * capPlants;
  const plantsDie = h.lethalAir ? 2 * DAY : Ts > 360 ? 7 * DAY : 0.5 * YEAR;
  s.plants = grow(s.plants, c.has('heat') ? Kpl * 0.2 : Kpl, 30 * YEAR, plantsDie, dt);

  const Kfun = h.intact * land * (0.6 + 0.4 * sat(plants, 0.6)) * Math.max(h.tPlants, 0.2) * h.airOK * (plants > 0 || s.fungi > 0.5 ? 1 : 0.3);
  s.fungi = grow(s.fungi, Kfun, 10 * YEAR, h.lethalAir ? 30 * DAY : 2 * YEAR, dt);

  const animalDie = h.lethalAir ? 30 * MIN : h.lethalTemp ? 20 * DAY : YEAR;
  const Kins = h.intact * land * Math.pow(sat(plants, 0.7), 0.7) * h.tAnimals * h.airOK * h.breathe;
  s.insects = grow(s.insects, c.has('heat') ? Kins * 0.1 : Kins, 3 * YEAR, h.lethalAir ? 30 * MIN : 0.5 * YEAR, dt);

  const freed = 1 + 0.15 * (1 - clamp(s.humans, 0, 1)) + (c.has('farming') ? 0.05 : 0);
  const Kani =
    h.intact * land * (0.1 + 0.9 * sat(plants, 0.7)) * (0.55 + 0.45 * sat(s.insects, 0.6)) * h.tAnimals *
    h.airOK * h.breathe * (0.5 + 0.5 * sat(micro, 0.5)) * Math.pow(h.uv, 0.3) * freed;
  s.animals = grow(s.animals, c.has('heat') ? 0 : Kani, 300 * YEAR, animalDie, dt);

  let Kfish =
    h.intact * (s.ocean > 0.05 ? 1 : 0) * Math.min(1, (1 - 0.6 * s.seaIce) / (1 - 0.6 * B.seaIce)) * Math.pow(sat(s.plankton, 0.7), 0.8) *
    Math.max(h.tOcean, c.has('heat') ? 0.15 : 0) * smooth(0.02, 0.1, o2Gas(s));
  if (c.has('salt')) Kfish *= 0.2;
  if (c.has('fish')) Kfish *= 0.3; // whales, squid, crabs and other sea animals remain
  s.fish = grow(s.fish, Kfish, 30 * YEAR, h.lethalAir && pressure(s) < 0.006 ? 5 * DAY : 0.5 * YEAR, dt);

  // People eat crops, livestock and fish, and need working civilisation to feed 8 billion.
  let cropMods = 1;
  if (c.has('grass')) cropMods *= 0.45;
  if (c.has('bees')) cropMods *= 0.95;
  if (c.has('earthworms')) cropMods *= 0.95;
  if (c.has('mountains')) cropMods *= 0.9;
  if (c.has('nitrogen')) cropMods *= 0.55;
  cropMods *= 0.9 + 0.1 * sat(s.insects, 0.5);
  cropMods *= 0.75 + 0.25 * sat(s.fungi, 0.5);
  cropMods *= 0.4 + 0.6 * sat(micro, 0.5);
  cropMods *= 0.5 + 0.5 * Math.min(1, s.energy / 0.8); // fertiliser, machines, transport
  const crop = sat(plants, 0.8) * h.tPlants * h.co2Plants * h.light * h.rainLand * Math.pow(soil, 1.5) * h.uv * cropMods;
  const livestock = sat(s.animals, 0.8) * (c.has('cows') ? 0.55 : 1) * (c.has('grass') ? 0.5 : 1);
  const food =
    s.farm * (0.75 * crop + 0.18 * livestock) + 0.07 * sat(s.fish, 0.7) +
    0.002 * Math.max(plants, clamp(s.animals, 0, 1), clamp(s.fish, 0, 1));
  const water = Math.min(s.ocean < 0.05 ? 0.2 : 1, c.has('rain') ? 0.35 : 1);
  const Khum =
    Math.min(1.02, h.intact * land * food * (0.17 + 0.83 * civTech(s)) * h.tHumans * h.airOK * h.breathe * water) *
    (c.has('heat') ? 0 : 1);
  const humansDie = h.lethalAir || c.has('heat') ? 2 * MIN : h.lethalTemp ? 20 * DAY : YEAR;
  s.humans = grow(s.humans, Khum, 35 * YEAR, humansDie, dt);

  // Civilisation: energy, infrastructure and farming knowledge.
  const people = clamp(s.humans / 0.02, 0, 1);
  let energyCap = 1;
  if (c.has('fossil')) energyCap = Math.min(energyCap, 0.8);
  if (c.has('fire')) energyCap = Math.min(energyCap, 0.55);
  if (c.has('electricity')) energyCap = Math.min(energyCap, 0.08);
  s.energy = relax2(s.energy, energyCap * people, 20 * YEAR, people < 0.05 ? 2 * DAY : YEAR, dt);
  const infraEq = people;
  const rebuild = s.energy > 0.3 ? 15 * YEAR : 300 * YEAR;
  s.infra = relax2(s.infra, infraEq, rebuild, people < 0.05 ? 300 * YEAR : 5 * YEAR, dt);
  if (s.humans > 0 && s.farm < 1) s.farm = relax(s.farm, 1, 4 * KYR, dt);
  const soilEq = plants > 0.2 && micro > 0.2 ? 1 : 0.2;
  s.soil = relax2(s.soil, soilEq, 3 * KYR, 600 * YEAR, dt);
}

/* ---------- catastrophes with their own physics ---------- */

function stepNoGravity(s: State, dt: number) {
  // Earth's interior is under 3.6 million atmospheres of pressure. Without gravity, it lets go.
  s.integrity = relax(s.integrity, 0, 20 * MIN, dt);
  s.n2 = relax(s.n2, 0, 40 * MIN, dt);
  s.o2 = relax(s.o2, 0, 40 * MIN, dt);
  s.co2 = relax(s.co2, 0, 40 * MIN, dt);
  s.ocean = relax(s.ocean, 0, 3 * HOUR, dt);
  s.landIce = relax(s.landIce, 0, 3 * HOUR, dt);
  s.clouds = relax(s.clouds, 0, 30 * MIN, dt);
  s.sun = relax(s.sun, 0, 2 * DAY, dt);
  for (const k of ['microbes', 'plankton', 'plants', 'fungi', 'insects', 'animals', 'fish', 'humans'] as const) {
    s[k] = grow(s[k], 0, 1, k === 'humans' || k === 'animals' ? 10 * MIN : HOUR, dt);
  }
  s.energy = relax(s.energy, 0, MIN, dt);
  s.infra = relax(s.infra, 0, 10 * MIN, dt);
  s.T = relax(s.T, 40, 30 * YEAR, dt);
  s.Td = s.T;
  s.mag = relax(s.mag, 0, DAY, dt);
}

/** One step of the whole planet. */
export function step(s: State, dt: number, c: Ctx) {
  if (dt <= 0) return;
  if (c.has('time')) return; // time no longer passes
  stepOrbit(s, c, dt);
  if (c.has('strong')) return; // nothing left to simulate
  if (c.has('gravity')) {
    stepNoGravity(s, dt);
    return;
  }
  if (s.integrity < 0.05) return;
  stepClimate(s, c, dt);
  const Ts = surfaceTemp(s, c);
  stepWater(s, c, dt, Ts);
  stepAir(s, c, dt, Ts);
  stepLife(s, c, dt, Ts);
}

/* ---------- summary for the interface ---------- */

export type Verdict = 'Thriving' | 'Struggling' | 'Collapsing' | 'Barely alive' | 'Microbes only' | 'Lifeless' | 'Destroyed';

export function verdict(s: State): Verdict {
  if (s.integrity < 0.3) return 'Destroyed';
  const life = lifeIndex(s);
  const complex = s.animals + s.fish + s.insects + s.plants;
  if (life <= 1e-6) return 'Lifeless';
  if (complex < 0.005) return 'Microbes only';
  if (life >= 0.85) return 'Thriving';
  if (life >= 0.6) return 'Struggling';
  if (life >= 0.2) return 'Collapsing';
  return 'Barely alive';
}
