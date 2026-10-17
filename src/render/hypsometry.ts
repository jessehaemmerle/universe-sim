/**
 * Turns an ocean volume into a sea level, using the real shape of Earth's surface.
 * Built from a small copy of the height map: a histogram of surface heights weighted
 * by area, so volume below any level is a quick sum.
 */

const W = 512;
const H = 256;
const MIN_H = -11500;
const MAX_H = 9000;
const BIN = 10;
const NBINS = Math.ceil((MAX_H - MIN_H) / BIN);

export const LAND_MAX = 6400;
export const SEA_MAX = 8000;
/** Equator-to-pole sea-surface change when Earth stops spinning, m. */
export const BULGE = 8400;
export const LAND_FLOOR = -3800;
export const MOUNTAIN_CUT = 1000;

export function decodeHeight(r255: number): number {
  const h = (r255 - 128) / 127;
  return h >= 0 ? h * h * LAND_MAX : -h * h * SEA_MAX;
}

export interface SurfaceShape {
  bulge: number;
  landCut: number;
  mountainCut: number;
}

export function shapeHeight(h: number, latRad: number, shape: SurfaceShape): number {
  let v = h;
  if (shape.mountainCut > 0 && v > MOUNTAIN_CUT) v = MOUNTAIN_CUT;
  if (shape.landCut > 0 && v > -200) v = LAND_FLOOR;
  const c = Math.cos(latRad);
  return v + BULGE * (c * c - 2 / 3) * shape.bulge;
}

export class Hypsometry {
  private heights = new Float32Array(W * H);
  private weights = new Float32Array(W * H);
  private lats = new Float32Array(W * H);
  private tables = new Map<string, Float64Array>();
  private v0 = 1;
  ready = false;

  load(img: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) {
      const lat = (Math.PI / 2) * (1 - (2 * (y + 0.5)) / H);
      const w = Math.cos(lat);
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        this.heights[i] = decodeHeight(px[i * 4]);
        this.weights[i] = w;
        this.lats[i] = lat;
      }
    }
    this.v0 = this.volumeBelow(this.histogram({ bulge: 0, landCut: 0, mountainCut: 0 }), 0);
    this.ready = true;
  }

  private histogram(shape: SurfaceShape): Float64Array {
    const hist = new Float64Array(NBINS);
    for (let i = 0; i < this.heights.length; i++) {
      const v = shapeHeight(this.heights[i], this.lats[i], shape);
      const b = Math.min(NBINS - 1, Math.max(0, Math.floor((v - MIN_H) / BIN)));
      hist[b] += this.weights[i];
    }
    return hist;
  }

  private volumeBelow(hist: Float64Array, level: number): number {
    let v = 0;
    for (let b = 0; b < NBINS; b++) {
      const h = MIN_H + (b + 0.5) * BIN;
      if (h >= level) break;
      v += hist[b] * (level - h);
    }
    return v;
  }

  /** Sea level in metres relative to today for an ocean volume (1 = today). */
  seaLevel(ocean: number, shape: SurfaceShape): number {
    if (!this.ready) return 0;
    if (ocean <= 0) return MIN_H - 100;
    const key = `${shape.bulge.toFixed(1)}|${shape.landCut}|${shape.mountainCut}`;
    let table = this.tables.get(key);
    if (!table) {
      const hist = this.histogram({ ...shape, bulge: Number(shape.bulge.toFixed(1)) });
      table = new Float64Array(161);
      for (let i = 0; i < table.length; i++) {
        const target = (i / 100) * this.v0;
        let lo = MIN_H;
        let hi = MAX_H;
        for (let k = 0; k < 40; k++) {
          const mid = 0.5 * (lo + hi);
          if (this.volumeBelow(hist, mid) < target) lo = mid; else hi = mid;
        }
        table[i] = 0.5 * (lo + hi);
      }
      this.tables.set(key, table);
    }
    const f = Math.min(1.6, ocean) * 100;
    const i = Math.min(table.length - 2, Math.floor(f));
    return table[i] + (table[i + 1] - table[i]) * (f - i);
  }
}
