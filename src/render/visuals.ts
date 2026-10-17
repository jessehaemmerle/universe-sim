import { clamp, civ, iceLatitude, molten, pressure, solarFlux, sunNatural, surfaceTemp } from '../sim/model';
import type { Ctx, State } from '../sim/types';
import { YEAR } from '../sim/units';

/** Everything the 3D scene needs to know, in plain numbers. */
export interface Visuals {
  ocean: number;          // ocean volume (1 = today)
  bulge: number;          // 1 = oceans pooled at the poles
  landCut: number;        // 1 = continents deleted
  mountainCut: number;    // 1 = mountains deleted
  seaIceLat: number;      // degrees; sea ice poleward of this
  snowLat: number;        // degrees; land snow poleward of this
  landIce: number;        // ice sheets (1 = today)
  veg: number;            // vegetation 0..1
  dry: number;            // drought / desert tint 0..1
  salt: number;           // salt crust on dried seafloor 0..1
  plankton: number;
  heat: number;           // 0..1 red-hot surface glow
  molten: number;         // 0..1 lava
  frost: number;          // 0..1 frozen air / deep freeze tint
  clouds: number;
  cloudTint: [number, number, number];
  atmo: number;           // atmosphere visibility 0..1.5
  atmoTint: [number, number, number];
  dust: number;
  lights: number;         // city lights 0..1
  aurora: number;
  sunLight: number;       // light reaching Earth, display units
  sunColor: [number, number, number];
  sunSize: number;        // apparent sun size multiplier
  sunVisible: number;
  moon: number;           // 1 = present
  moonDist: number;
  starYears: number;      // years since the stars were deleted (Infinity = never)
  starFade: number;       // 0..1 extra dimming (dark matter)
  integrity: number;
  radius: number;
  spin: number;           // relative spin rate for the animation
  tilt: number;           // degrees
  frozen: boolean;        // time deleted
  vaporised: boolean;     // strong force deleted
}

export function visualsFrom(s: State, c: Ctx): Visuals {
  const Ts = surfaceTemp(s, c);
  const P = pressure(s);
  const flux = solarFlux(s, c);
  const L = sunNatural(c.tAbs);
  const redGiant = clamp(Math.log10(Math.max(1, L)) / 3.4, 0, 1);
  const seaIceFrac = clamp(s.seaIce, 0, 1);
  const steam = s.steam > 0.02;
  const thick = clamp((P - 3) / 60, 0, 1);

  const cloudTint: [number, number, number] = steam
    ? [1.0, 0.93, 0.8]
    : [1 - 0.35 * s.dust, 1 - 0.4 * s.dust, 1 - 0.45 * s.dust];
  const atmoTint: [number, number, number] = [
    0.3 + 0.6 * thick + 0.4 * s.dust,
    0.55 + 0.25 * thick + 0.1 * s.dust,
    1.0 - 0.55 * thick - 0.4 * s.dust,
  ];

  const stars = c.since('stars');
  const strong = c.since('strong');
  const starYears = Math.min(stars, strong) / YEAR;

  return {
    ocean: s.ocean,
    bulge: clamp(s.bulge, 0, 1),
    landCut: c.has('land') ? 1 : 0,
    mountainCut: c.has('mountains') ? 1 : 0,
    seaIceLat: (Math.asin(clamp(1 - seaIceFrac, 0, 1)) * 180) / Math.PI,
    snowLat: s.integrity > 0.5 ? iceLatitude(s, c) : 90,
    landIce: s.landIce,
    veg: clamp(s.plants, 0, 1),
    dry: clamp(1 - Math.min(1, s.ocean / 0.3) + (c.has('rain') ? 0.6 : 0), 0, 1),
    salt: s.ocean < 0.3 && !c.has('oceans') ? clamp(1 - s.ocean / 0.3, 0, 1) : 0,
    plankton: clamp(s.plankton, 0, 1),
    heat: clamp((Ts - 600) / 700, 0, 1),
    molten: molten(s),
    frost: clamp((150 - Ts) / 100, 0, 1),
    clouds: clamp(s.clouds, 0, 1),
    cloudTint,
    atmo: P < 0.002 ? 0 : clamp(Math.pow(P, 0.3), 0.15, 1.6),
    atmoTint,
    dust: clamp(s.dust, 0, 1),
    lights: clamp(Math.sqrt(clamp(s.humans, 0, 1)) * civ(s) * (c.has('electricity') ? 0 : 1), 0, 1),
    aurora: s.mag > 0.1 && P > 0.01 && !c.has('solarwind') && s.sun > 0.5 ? clamp(s.mag, 0, 1) : 0,
    sunLight: s.sun > 0 ? clamp(Math.pow(flux, 0.35), 0, 3) : 0,
    sunColor: [1, 0.96 - 0.45 * redGiant, 0.9 - 0.7 * redGiant],
    sunSize: (s.sun > 0 ? 1 : 0) * clamp((1 + 40 * redGiant * redGiant) / s.dist, 0.02, 60),
    sunVisible: clamp(s.sun, 0, 1) * (c.has('light') ? 0 : 1),
    moon: c.has('moon') || c.has('strong') ? 0 : 1,
    moonDist: s.moonDist,
    starYears: Number.isFinite(starYears) ? starYears : Infinity,
    starFade: c.has('darkmatter') ? clamp((c.since('darkmatter') / YEAR - 5e7) / 1e9, 0, 0.6) : 0,
    integrity: clamp(s.integrity, 0, 1),
    radius: s.radius,
    spin: c.has('rotation') ? 0 : clamp(s.spin, 0, 2),
    tilt: s.tilt,
    frozen: c.has('time'),
    vaporised: c.has('strong'),
  };
}
