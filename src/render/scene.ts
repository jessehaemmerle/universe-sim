import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Visual } from '../sim/types';
import { Hypsometry } from './hypsometry';
import {
  ATMO_FRAG, CLOUD_FRAG, EARTH_FRAG, EARTH_VERT, MOON_FRAG, SPARK_FRAG, SPARK_VERT, STAR_FRAG, STAR_VERT,
} from './shaders';
import type { Visuals } from './visuals';

const SUN_DIR = new THREE.Vector3(5, 1.4, 3).normalize();
const PINK = new THREE.Color(1, 0.36, 0.52);
const SPARKS = 900;

type Smoothed = Omit<Visuals, 'cloudTint' | 'atmoTint' | 'sunColor' | 'frozen' | 'vaporised'>;
const SMOOTH_KEYS: (keyof Smoothed)[] = [
  'ocean', 'bulge', 'seaIceLat', 'snowLat', 'landIce', 'veg', 'dry', 'salt', 'plankton', 'heat', 'molten', 'frost',
  'clouds', 'atmo', 'dust', 'lights', 'aurora', 'sunLight', 'sunSize', 'sunVisible', 'moonDist', 'integrity', 'radius',
  'spin', 'tilt', 'starFade',
];

function glowTexture(inner: string, outer: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.12, inner);
  grad.addColorStop(0.3, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

export class PlanetView {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private hyps = new Hypsometry();

  private tiltGroup = new THREE.Group();
  private spinGroup = new THREE.Group();
  private earth!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private clouds!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private atmo!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private moonPivot = new THREE.Group();
  private moon!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private sun!: THREE.Sprite;
  private sunCore!: THREE.Sprite;
  private stars!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private fragments: THREE.Group | null = null;
  private fragmentDirs: THREE.Vector3[] = [];
  private sparks!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private sparkCursor = 0;
  private ring!: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private ringAge = Infinity;
  private flash!: THREE.Sprite;
  private flashAge = Infinity;
  private plasma!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private plasmaAge = Infinity;

  private cur: Smoothed | null = null;
  private target: Visuals | null = null;
  private seaLevel = 0;
  private time = 0;
  private sweep = 1;
  private moonDissolve = 0;
  private moonAngle = 0.8;
  private insets = { left: 0, right: 0, top: 0, bottom: 0 };
  private reduceMotion = false;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 2000);
    this.camera.position.set(0.4, 0.9, 4.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 40;
    this.controls.rotateSpeed = 0.6;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    // Once the player zooms (wheel or pinch), stop re-fitting the globe on resize.
    let startDist = 0;
    this.controls.addEventListener('start', () => (startDist = this.camera.position.length()));
    this.controls.addEventListener('end', () => {
      if (Math.abs(this.camera.position.length() - startDist) > 0.01) this.userZoomed = true;
    });

    this.scene.add(this.tiltGroup);
    this.tiltGroup.add(this.spinGroup);
    this.scene.add(this.moonPivot);
  }

  async load(colorUrl: string, dataUrl: string) {
    const [colorImg, dataImg] = await Promise.all([loadImage(colorUrl), loadImage(dataUrl)]);
    this.hyps.load(dataImg);
    const color = new THREE.Texture(colorImg);
    color.colorSpace = THREE.SRGBColorSpace;
    color.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    color.needsUpdate = true;
    const data = new THREE.Texture(dataImg);
    data.colorSpace = THREE.NoColorSpace;
    data.needsUpdate = true;
    this.build(color, data);
    this.resize();
  }

  private earthUniforms(color: THREE.Texture, data: THREE.Texture) {
    return {
      uColor: { value: color }, uData: { value: data },
      uSunDir: { value: SUN_DIR.clone() }, uSunColor: { value: new THREE.Color(1, 1, 1) }, uSunLight: { value: 1 },
      uRot: { value: new THREE.Matrix3() }, uBump: { value: 1 },
      uSeaLevel: { value: 0 }, uOcean: { value: 1 }, uBulge: { value: 0 }, uLandCut: { value: 0 }, uMountainCut: { value: 0 },
      uSeaIceLat: { value: 71 }, uSnowLat: { value: 71 }, uLandIce: { value: 1 }, uVeg: { value: 1 }, uDry: { value: 0 },
      uSalt: { value: 0 }, uPlankton: { value: 1 }, uHeat: { value: 0 }, uMolten: { value: 0 }, uFrost: { value: 0 },
      uLights: { value: 1 }, uAtmo: { value: 1 }, uAtmoTint: { value: new THREE.Color(0.3, 0.55, 1) }, uDust: { value: 0 },
      uTime: { value: 0 }, uSweep: { value: 1 },
    };
  }

  private build(color: THREE.Texture, data: THREE.Texture) {
    const earthMat = new THREE.ShaderMaterial({
      uniforms: this.earthUniforms(color, data),
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    });
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 128), earthMat);
    this.spinGroup.add(this.earth);

    const cloudMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() }, uSunColor: { value: new THREE.Color(1, 1, 1) }, uSunLight: { value: 1 },
        uCover: { value: 0.67 }, uTint: { value: new THREE.Color(1, 1, 1) }, uTime: { value: 0 },
      },
      vertexShader: EARTH_VERT, fragmentShader: CLOUD_FRAG, transparent: true, depthWrite: false,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 128, 96), cloudMat);
    this.spinGroup.add(this.clouds);

    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() }, uSunLight: { value: 1 }, uDensity: { value: 1 },
        uTint: { value: new THREE.Color(0.3, 0.55, 1) }, uAurora: { value: 1 }, uTime: { value: 0 },
      },
      vertexShader: EARTH_VERT, fragmentShader: ATMO_FRAG,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.atmo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 64), atmoMat);
    this.tiltGroup.add(this.atmo);

    const moonMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() }, uSunColor: { value: new THREE.Color(1, 1, 1) }, uSunLight: { value: 1 },
        uDissolve: { value: 0 },
      },
      vertexShader: EARTH_VERT, fragmentShader: MOON_FRAG,
    });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 64, 48), moonMat);
    this.moonPivot.add(this.moon);
    // The real Moon is 60 Earth radii away; here it circles close, nearly face-on to the camera.
    this.moonPivot.rotation.x = 1.2;
    this.moonPivot.rotation.z = 0.35;

    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,250,235,1)', 'rgba(255,190,90,0.35)'),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    this.sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,1)', 'rgba(255,240,200,0.0)'),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    this.sun.position.copy(SUN_DIR).multiplyScalar(300);
    this.sunCore.position.copy(this.sun.position);
    this.scene.add(this.sun, this.sunCore);

    this.buildStars();
    this.buildSparks();

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.03, 128),
      new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.scene.add(this.ring);

    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,1)', 'rgba(255,170,220,0.5)'),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
    }));
    this.scene.add(this.flash);

    const plasmaGeo = new THREE.BufferGeometry();
    const pp = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.3 + Math.random() * 0.7);
      pp.set([v.x, v.y, v.z], i * 3);
    }
    plasmaGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.plasma = new THREE.Points(plasmaGeo, new THREE.PointsMaterial({
      color: new THREE.Color(1, 0.55, 0.3), size: 0.035, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.plasma.visible = false;
    this.scene.add(this.plasma);
  }

  private buildStars() {
    const n = 4200;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const dist = new Float32Array(n);
    const col = new Float32Array(n * 3);
    // the Milky Way: a band tilted against the ecliptic
    const bandNormal = new THREE.Vector3(0.2, 0.86, -0.47).normalize();
    for (let i = 0; i < n; i++) {
      let v: THREE.Vector3;
      const inBand = i > 1700;
      if (inBand) {
        v = new THREE.Vector3().randomDirection();
        v.addScaledVector(bandNormal, -v.dot(bandNormal) * (0.88 + Math.random() * 0.12)).normalize();
        dist[i] = 1000 + Math.pow(Math.random(), 0.7) * 50000;
        size[i] = 0.8 + Math.random() * 1.2;
      } else {
        v = new THREE.Vector3().randomDirection();
        dist[i] = Math.pow(10, 0.62 + Math.random() * 2.9);
        size[i] = 1 + Math.pow(Math.random(), 6) * 3.5;
      }
      if (i === 0) dist[i] = 4.24;
      if (i === 1) { dist[i] = 8.6; size[i] = 4.5; }
      v.multiplyScalar(900);
      pos.set([v.x, v.y, v.z], i * 3);
      const warm = Math.random();
      const b = inBand ? 0.35 + Math.random() * 0.35 : 0.6 + Math.random() * 0.4;
      col.set([b * (0.85 + 0.15 * warm), b * 0.9, b * (1 - 0.25 * warm)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aDist', new THREE.BufferAttribute(dist, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uYears: { value: -1 }, uFade: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() } },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  private buildSparks() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    geo.setAttribute('aBirth', new THREE.BufferAttribute(new Float32Array(SPARKS).fill(-100), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(SPARKS), 1));
    this.sparks = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: this.renderer.getPixelRatio() } },
      vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);
  }

  /** Pink eraser crumbs bursting from a point, spread over a radius. */
  private burst(center: THREE.Vector3, radius: number, count: number, speed: number) {
    const g = this.sparks.geometry;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const vel = g.getAttribute('aVel') as THREE.BufferAttribute;
    const birth = g.getAttribute('aBirth') as THREE.BufferAttribute;
    const size = g.getAttribute('aSize') as THREE.BufferAttribute;
    for (let k = 0; k < count; k++) {
      const i = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % SPARKS;
      const dir = new THREE.Vector3().randomDirection();
      const p = center.clone().addScaledVector(dir, radius * Math.cbrt(Math.random()));
      const v = dir.clone().multiplyScalar(speed * (0.3 + Math.random()));
      pos.setXYZ(i, p.x, p.y, p.z);
      vel.setXYZ(i, v.x, v.y, v.z);
      birth.setX(i, this.time + Math.random() * 0.25);
      size.setX(i, 3 + Math.random() * 7);
    }
    pos.needsUpdate = vel.needsUpdate = birth.needsUpdate = size.needsUpdate = true;
  }

  /** Play the erase effect for something that was just deleted. */
  erase(visual: Visual | undefined) {
    if (!this.earth) return;
    const surface = (n: number) => {
      for (let i = 0; i < 6; i++) this.burst(new THREE.Vector3().randomDirection().multiplyScalar(1.02), 0.25, n / 6, 0.5);
    };
    switch (visual) {
      case 'moon': {
        const p = new THREE.Vector3();
        this.moon.getWorldPosition(p);
        this.burst(p, 0.3, 220, 0.9);
        this.moonDissolve = 0.0001;
        break;
      }
      case 'sun':
        this.burst(this.sun.position.clone().setLength(20), 1.5, 260, 3);
        break;
      case 'stars':
        for (let i = 0; i < 12; i++) this.burst(new THREE.Vector3().randomDirection().multiplyScalar(12), 1.2, 18, 1.5);
        break;
      case 'oceans': case 'atmosphere': case 'clouds': case 'ice': case 'land': case 'plants': case 'lights': case 'aurora':
        surface(260);
        this.sweep = 0;
        break;
      case 'planet':
        surface(320);
        this.pulse();
        break;
      default:
        this.pulse();
        surface(120);
    }
  }

  private pulse() {
    this.ringAge = 0;
  }

  /** Flash for the strong force: Earth turns into plasma. */
  vaporise() {
    this.flashAge = 0;
    this.plasmaAge = 0;
  }

  setInsets(insets: { left: number; right: number; top: number; bottom: number }) {
    this.insets = insets;
    this.resize();
  }

  resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const { left, right, top, bottom } = this.insets;
    this.camera.setViewOffset(w, h, (right - left) / 2, (bottom - top) / 2, w, h);
    // Fit the globe into the free area between the panels.
    const fitPx = Math.max(160, Math.min(w - left - right, h - top - bottom));
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const want = h / 2 / (0.3 * fitPx * tan);
    if (!this.userZoomed) this.camera.position.setLength(Math.max(this.controls.minDistance + 0.2, want));
    this.camera.updateProjectionMatrix();
    if (this.stars) this.stars.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
  }

  private userZoomed = false;

  setVisuals(v: Visuals) {
    this.target = v;
    if (!this.cur) this.cur = { ...v };
  }

  private buildFragments() {
    const src = new THREE.IcosahedronGeometry(1, 16);
    const p = src.getAttribute('position') as THREE.BufferAttribute;
    const seeds: THREE.Vector3[] = [];
    const nSeeds = 34;
    for (let i = 0; i < nSeeds; i++) {
      const y = 1 - (2 * (i + 0.5)) / nSeeds;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      seeds.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).add(new THREE.Vector3().randomDirection().multiplyScalar(0.28)).normalize());
    }
    const buckets: number[][] = seeds.map(() => []);
    const c = new THREE.Vector3();
    for (let t = 0; t < p.count; t += 3) {
      c.set(0, 0, 0);
      for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, t + k));
      c.normalize();
      let best = 0;
      let bestD = -2;
      seeds.forEach((s, i) => {
        const d = s.dot(c) + (Math.random() - 0.5) * 0.02;
        if (d > bestD) { bestD = d; best = i; }
      });
      buckets[best].push(t);
    }
    const group = new THREE.Group();
    const mat = this.earth.material.clone();
    mat.uniforms = THREE.UniformsUtils.clone(this.earth.material.uniforms);
    mat.uniforms.uColor.value = this.earth.material.uniforms.uColor.value;
    mat.uniforms.uData.value = this.earth.material.uniforms.uData.value;
    mat.uniforms.uBump.value = 0;
    mat.side = THREE.DoubleSide;
    mat.defines = { FRAGMENTS: 1 };
    // Each chunk is a solid wedge: the crust on top, walls down its edges, and a molten
    // underside, so it reads as rock when it tumbles.
    const INNER = 0.45;
    const key = (v: THREE.Vector3) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    buckets.forEach((tris, i) => {
      if (tris.length === 0) return;
      const pos: number[] = [];
      const inner: number[] = [];
      const push = (v: THREE.Vector3, molten: number) => { pos.push(v.x, v.y, v.z); inner.push(molten); };
      const edges = new Map<string, [THREE.Vector3, THREE.Vector3, number]>();
      for (const t of tris) {
        const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, t + k));
        v.forEach((a) => push(a, 0));
        for (let k = 2; k >= 0; k--) push(v[k].clone().multiplyScalar(INNER), 1);
        for (let k = 0; k < 3; k++) {
          const a = v[k];
          const b = v[(k + 1) % 3];
          const ek = [key(a), key(b)].sort().join('|');
          const e = edges.get(ek);
          if (e) e[2]++; else edges.set(ek, [a, b, 1]);
        }
      }
      for (const [a, b, n] of edges.values()) {
        if (n !== 1) continue;
        const ai = a.clone().multiplyScalar(INNER);
        const bi = b.clone().multiplyScalar(INNER);
        push(b, 1); push(a, 1); push(ai, 1);
        push(b, 1); push(ai, 1); push(bi, 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aInner', new THREE.Float32BufferAttribute(inner, 1));
      g.computeVertexNormals();
      group.add(new THREE.Mesh(g, mat));
      this.fragmentDirs.push(seeds[i].clone().multiplyScalar(0.5 + Math.random() * 0.7));
    });
    src.dispose();
    this.fragments = group;
    this.spinGroup.add(group);
  }

  /** Advance animations by dt real seconds and draw. */
  frame(dt: number) {
    if (!this.earth || !this.target || !this.cur) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const t = this.target;
    const cur = this.cur;
    const k = 1 - Math.exp(-dt / 0.45);
    for (const key of SMOOTH_KEYS) {
      const a = cur[key] as number;
      const b = t[key] as number;
      (cur[key] as number) = Number.isFinite(a) && Number.isFinite(b) ? a + (b - a) * k : b;
    }
    cur.starYears = t.starYears;
    cur.landCut = t.landCut;
    cur.mountainCut = t.mountainCut;
    cur.moon = t.moon;

    const running = !t.frozen;
    if (running) this.time += dt;

    // Planet orientation.
    this.tiltGroup.rotation.z = THREE.MathUtils.degToRad(cur.tilt);
    if (running && !this.reduceMotion) this.spinGroup.rotation.y += dt * 0.06 * cur.spin;
    this.tiltGroup.scale.setScalar(cur.radius);

    // Sea level from ocean volume and surface shape.
    const sea = this.hyps.seaLevel(cur.ocean, { bulge: cur.bulge, landCut: cur.landCut, mountainCut: cur.mountainCut });
    this.seaLevel += (sea - this.seaLevel) * (1 - Math.exp(-dt / 0.35));

    const sunColor = new THREE.Color(...t.sunColor);
    const u = this.earth.material.uniforms;
    u.uRot.value.setFromMatrix4(this.earth.matrixWorld);
    u.uSeaLevel.value = this.seaLevel;
    u.uOcean.value = cur.ocean;
    u.uBulge.value = cur.bulge;
    u.uLandCut.value = cur.landCut;
    u.uMountainCut.value = cur.mountainCut;
    u.uSeaIceLat.value = cur.seaIceLat;
    u.uSnowLat.value = cur.snowLat;
    u.uLandIce.value = cur.landIce;
    u.uVeg.value = cur.veg;
    u.uDry.value = cur.dry;
    u.uSalt.value = cur.salt;
    u.uPlankton.value = cur.plankton;
    u.uHeat.value = cur.heat;
    u.uMolten.value = cur.molten;
    u.uFrost.value = cur.frost;
    u.uLights.value = cur.lights;
    u.uAtmo.value = cur.atmo;
    (u.uAtmoTint.value as THREE.Color).setRGB(...t.atmoTint);
    u.uDust.value = cur.dust;
    u.uSunLight.value = cur.sunLight;
    (u.uSunColor.value as THREE.Color).copy(sunColor);
    u.uTime.value = this.time;
    if (this.sweep < 1) this.sweep = Math.min(1, this.sweep + dt / 1.4);
    u.uSweep.value = this.sweep;

    const cu = this.clouds.material.uniforms;
    cu.uCover.value = cur.clouds * Math.min(1, cur.integrity * 1.2);
    (cu.uTint.value as THREE.Color).setRGB(...t.cloudTint);
    cu.uSunLight.value = cur.sunLight;
    (cu.uSunColor.value as THREE.Color).copy(sunColor);
    cu.uTime.value = this.time;
    this.clouds.visible = cur.clouds > 0.01 && cur.integrity > 0.985;

    const au = this.atmo.material.uniforms;
    au.uDensity.value = cur.atmo * Math.max(0, (cur.integrity - 0.5) * 2);
    (au.uTint.value as THREE.Color).setRGB(...t.atmoTint);
    au.uSunLight.value = cur.sunLight;
    au.uAurora.value = cur.aurora;
    au.uTime.value = this.time;
    this.atmo.visible = au.uDensity.value > 0.005;

    // Shattering.
    const shattered = cur.integrity < 0.985 && !t.vaporised;
    if (shattered && !this.fragments) this.buildFragments();
    this.earth.visible = !shattered && !t.vaporised;
    if (this.fragments) {
      this.fragments.visible = shattered;
      const spread = Math.pow(1 - cur.integrity, 0.8) * 1.9;
      const fu = (this.fragments.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms;
      for (const key of Object.keys(u)) if (key !== 'uColor' && key !== 'uData' && key !== 'uBump') fu[key].value = u[key].value;
      fu.uBump.value = 0;
      this.fragments.children.forEach((m, i) => {
        const d = this.fragmentDirs[i];
        m.position.copy(d).multiplyScalar(spread);
        m.rotation.set(d.z * spread * 0.5, d.x * spread * 0.5, d.y * spread * 0.5);
      });
    }

    // Moon.
    if (running && !this.reduceMotion) this.moonAngle += dt * 0.025;
    const moonR = Math.min(60, 2.5 * cur.moonDist);
    this.moonPivot.rotation.y = this.moonAngle;
    this.moon.position.set(moonR, 0, 0);
    const mu = this.moon.material.uniforms;
    mu.uSunLight.value = cur.sunLight;
    (mu.uSunColor.value as THREE.Color).copy(sunColor);
    if (this.moonDissolve > 0) this.moonDissolve = Math.min(1, this.moonDissolve + dt / 1.3);
    if (t.moon > 0.5 && this.moonDissolve >= 1) this.moonDissolve = 0;
    mu.uDissolve.value = this.moonDissolve;
    this.moon.visible = t.moon > 0.5 || (this.moonDissolve > 0 && this.moonDissolve < 1);

    // Sun.
    const sunVis = cur.sunVisible;
    const sm = this.sun.material;
    sm.color.copy(sunColor);
    sm.opacity = sunVis;
    this.sun.scale.setScalar(70 * Math.max(0.02, cur.sunSize));
    this.sunCore.material.opacity = sunVis;
    this.sunCore.scale.setScalar(16 * Math.max(0.02, cur.sunSize));
    this.sun.visible = this.sunCore.visible = sunVis > 0.01;

    // Stars, by light travel time.
    const su = this.stars.material.uniforms;
    su.uYears.value = Number.isFinite(cur.starYears) ? cur.starYears : -1;
    su.uFade.value = cur.starFade;

    // Effects.
    this.sparks.material.uniforms.uTime.value = this.time;
    this.ringAge += dt;
    const ra = this.ringAge / 1.4;
    this.ring.visible = ra < 1;
    if (ra < 1) {
      this.ring.scale.setScalar(1.05 + ra * 2.6);
      this.ring.material.opacity = (1 - ra) * 0.9;
      this.ring.quaternion.copy(this.camera.quaternion);
    }
    this.flashAge += dt;
    const fa = this.flashAge / 2.5;
    this.flash.visible = fa < 1;
    if (fa < 1) {
      this.flash.scale.setScalar(2 + fa * 14);
      this.flash.material.opacity = 1 - fa;
    }
    this.plasmaAge += dt;
    this.plasma.visible = t.vaporised && this.plasmaAge < 14;
    if (this.plasma.visible) {
      this.plasma.scale.setScalar(1 + this.plasmaAge * 1.6);
      this.plasma.material.opacity = Math.max(0, 1 - this.plasmaAge / 14);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  get canvas() {
    return this.renderer.domElement;
  }
}
