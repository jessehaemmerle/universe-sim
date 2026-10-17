/*
 * GLSL for the planet. The 3D simplex noise is by Ian McEwan and Ashima Arts (MIT licence),
 * https://github.com/ashima/webgl-noise
 */
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
`;

export const EARTH_VERT = /* glsl */ `
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vInner;
#ifdef FRAGMENTS
attribute float aInner;
#endif
void main() {
  vPos = position;
  #ifdef FRAGMENTS
  vInner = aInner;
  #else
  vInner = 0.0;
  #endif
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const EARTH_FRAG = /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uData;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunLight;
uniform mat3 uRot;
uniform float uBump;
uniform float uSeaLevel;
uniform float uOcean;
uniform float uBulge;
uniform float uLandCut;
uniform float uMountainCut;
uniform float uSeaIceLat;
uniform float uSnowLat;
uniform float uLandIce;
uniform float uVeg;
uniform float uDry;
uniform float uSalt;
uniform float uPlankton;
uniform float uHeat;
uniform float uMolten;
uniform float uFrost;
uniform float uLights;
uniform float uAtmo;
uniform vec3 uAtmoTint;
uniform float uDust;
uniform float uTime;
uniform float uSweep;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormalW;
varying float vInner;

${NOISE}

const float PI = 3.14159265359;

float decodeH(float r) {
  float h = (r * 255.0 - 128.0) / 127.0;
  return h >= 0.0 ? h * h * 6400.0 : -h * h * 8000.0;
}

float shapeH(float h, float lat) {
  if (uMountainCut > 0.5) h = min(h, 1000.0);
  if (uLandCut > 0.5 && h > -200.0) h = -3800.0;
  float c = cos(lat);
  return h + 8400.0 * (c * c - 2.0 / 3.0) * uBulge;
}

void main() {
  vec3 d = normalize(vPos);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float u = atan(d.z, -d.x) / (2.0 * PI);
  vec2 uv = vec2(fract(u), 0.5 + lat / PI);
  // Seamless mip selection across the date line (Tarini's trick).
  float u2 = fract(u + 0.5) - 0.5;
  vec2 dx = vec2(abs(dFdx(fract(u))) < abs(dFdx(u2)) ? dFdx(fract(u)) : dFdx(u2), dFdx(uv.y));
  vec2 dy = vec2(abs(dFdy(fract(u))) < abs(dFdy(u2)) ? dFdy(fract(u)) : dFdy(u2), dFdy(uv.y));

  vec4 data = textureGrad(uData, uv, dx, dy);
  vec3 albedo = textureGrad(uColor, uv, dx, dy).rgb;
  float rawH = decodeH(data.r);
  float h = shapeH(rawH, lat);

  // Relief shading from neighbouring heights.
  vec2 tx = vec2(1.0 / 2048.0, 0.0);
  vec2 ty = vec2(0.0, 1.0 / 1024.0);
  float hE = shapeH(decodeH(textureGrad(uData, uv + tx, dx, dy).r), lat);
  float hN = shapeH(decodeH(textureGrad(uData, uv + ty, dx, dy).r), lat + PI / 1024.0);
  vec3 east = normalize(vec3(-d.z, 0.0, d.x) + 1e-5);
  vec3 north = normalize(cross(d, east));
  float metresPerTexel = 6.371e6 * PI / 1024.0;
  vec3 nObj = normalize(d - uBump * ((hE - h) / (metresPerTexel * max(cos(lat), 0.05)) * east + (hN - h) / metresPerTexel * north) * 12.0);
  vec3 Ng = normalize(vNormalW);
  vec3 N = uBump > 0.0 ? normalize(uRot * nObj) : Ng;
  if (!gl_FrontFacing) { N = -N; Ng = -Ng; }

  float absLat = abs(lat) * 180.0 / PI;
  float n1 = snoise(d * 9.0) * 0.5 + snoise(d * 31.0) * 0.25;
  float depth = uSeaLevel - h;
  float wet = uOcean > 0.0005 ? smoothstep(-2.0, 6.0, depth) : 0.0;

  // --- land ---
  float wasSea = smoothstep(0.0, -60.0, rawH);
  float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
  // How much of this pixel is vegetation: green standing out from red and blue (linear colour).
  float green = smoothstep(0.0, 0.2, (albedo.g - max(albedo.r, albedo.b)) / max(albedo.g, 0.02));
  vec3 barren = mix(vec3(0.42, 0.36, 0.30), vec3(0.62, 0.52, 0.40), smoothstep(0.1, 0.4, lum)) * (0.8 + 0.4 * lum);
  vec3 land = mix(albedo, barren, clamp(green * (1.0 - uVeg) + uDry * green * 0.5, 0.0, 1.0));
  // baked-in ice sheets shrink from their edges as land ice disappears
  float bakedIce = smoothstep(1.0 - clamp(uLandIce, 0.0, 1.0) - 0.02, 1.0 - clamp(uLandIce, 0.0, 1.0) + 0.08, data.b);
  vec3 bedrock = mix(vec3(0.33, 0.31, 0.29), vec3(0.45, 0.41, 0.36), n1 * 0.5 + 0.5);
  land = mix(land, bedrock, (1.0 - bakedIce) * smoothstep(0.2, 0.6, data.b));
  // dry seafloor
  vec3 floorCol = mix(vec3(0.52, 0.47, 0.40), vec3(0.20, 0.20, 0.22), smoothstep(200.0, 7000.0, -rawH));
  floorCol = mix(floorCol, vec3(0.86, 0.84, 0.80), uSalt * smoothstep(-4500.0, -800.0, rawH) * (0.6 + 0.4 * n1));
  land = mix(land, floorCol * (0.9 + 0.2 * n1), wasSea);
  // snow and growing ice sheets
  float snowEdge = uSnowLat + n1 * 6.0;
  float snow = smoothstep(snowEdge - 2.0, snowEdge + 3.0, absLat);
  snow = max(snow, step(1.05, uLandIce) * smoothstep(0.0, 1.0, (uLandIce - 1.0) * 0.6) * smoothstep(50.0 - uLandIce * 6.0, 60.0 - uLandIce * 6.0, absLat + n1 * 8.0));
  land = mix(land, vec3(0.92, 0.94, 0.97), max(snow, bakedIce * smoothstep(0.2, 0.6, data.b)));

  // --- water ---
  vec3 shallow = mix(vec3(0.035, 0.16, 0.22), vec3(0.06, 0.30, 0.38), 1.0 - uPlankton);
  vec3 mid = vec3(0.016, 0.07, 0.16);
  vec3 deep = vec3(0.008, 0.028, 0.085);
  vec3 water = mix(shallow, mid, smoothstep(0.0, 160.0, depth));
  water = mix(water, deep, smoothstep(300.0, 4500.0, depth));
  float iceEdge = uSeaIceLat + n1 * 5.0;
  float seaIce = smoothstep(iceEdge - 1.5, iceEdge + 2.0, absLat);
  water = mix(water, vec3(0.80, 0.86, 0.92), seaIce);

  vec3 base = mix(land, water, wet);
  base = mix(base, vec3(0.82, 0.86, 0.92), uFrost * 0.7);

  // --- light ---
  float ndl = dot(N, uSunDir);
  float ndlG = dot(Ng, uSunDir);
  float dayMask = smoothstep(-0.12, 0.2, ndlG) * clamp(uSunLight * 3.0, 0.0, 1.0);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 col = base * uSunColor * uSunLight * max(mix(ndlG, ndl, 1.0 - wet), 0.0) * 1.25;
  col += base * vec3(0.012, 0.014, 0.022);
  vec3 Hh = normalize(uSunDir + V);
  float spec = pow(max(dot(Ng, Hh), 0.0), 70.0) * wet * (1.0 - seaIce) * 0.9;
  col += uSunColor * uSunLight * spec * (1.0 - uDust);

  // city lights on the night side
  float lights = data.g * data.g * uLights * (1.0 - dayMask) * (1.0 - wet);
  col += vec3(1.0, 0.72, 0.38) * lights * 2.2;

  // heat and lava
  float crack = smoothstep(0.15, 0.0, abs(fbm(d * 6.0 + vec3(0.0, uTime * 0.01, 0.0))));
  vec3 glow = mix(vec3(0.45, 0.04, 0.0), vec3(1.0, 0.45, 0.08), crack);
  col = mix(col, col * 0.4 + glow * (0.6 + 0.8 * crack), uMolten);
  col += vec3(0.6, 0.08, 0.0) * uHeat * (0.5 + 0.5 * n1) * (1.0 - uMolten);
  if (vInner > 0.5) {
    // Exposed mantle: dark rock with glowing seams, lit faintly by the Sun.
    float depthIn = 1.0 - smoothstep(0.45, 1.0, length(vPos));
    float seam = smoothstep(0.1, 0.0, abs(fbm(vPos * 5.0)));
    vec3 rock = vec3(0.075, 0.06, 0.055) * (0.4 + 1.1 * max(ndlG, 0.0) * uSunLight);
    vec3 hot = mix(vec3(0.55, 0.06, 0.0), vec3(1.0, 0.55, 0.15), seam);
    col = rock + hot * (seam * 1.4 + depthIn * depthIn * 0.9);
  }

  // haze at the limb
  float fres = pow(1.0 - max(dot(Ng, V), 0.0), 2.4);
  col = mix(col, uAtmoTint * uSunLight * (0.08 + dayMask * 0.9), clamp(fres * uAtmo * 0.55 + uDust * 0.3 * dayMask, 0.0, 0.9));

  // eraser sweep
  float sw = 1.0 - smoothstep(0.0, 0.035, abs(d.y - (1.0 - 2.0 * uSweep)));
  col += vec3(1.0, 0.36, 0.52) * sw * step(0.001, uSweep) * step(uSweep, 0.999) * 1.4;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const CLOUD_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunLight;
uniform float uCover;
uniform vec3 uTint;
uniform float uTime;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE}
void main() {
  vec3 d = normalize(vPos);
  float lat = asin(d.y);
  // Large weather systems stretched east-west, with finer streaks warped along them.
  vec3 p = d * vec3(1.6, 2.6, 1.6) + vec3(uTime * 0.004, 0.0, uTime * 0.002);
  vec3 warp = vec3(fbm(p * 0.9), fbm(p * 0.9 + 7.1), fbm(p * 0.9 + 3.7));
  float n = fbm(p * 1.4 + warp * 1.6);
  float streaks = fbm(vec3(p.x * 6.0, p.y * 14.0, p.z * 6.0) + warp * 3.0) * 0.12;
  float bands = 0.12 * cos(lat * 6.0) - 0.05;
  float thr = mix(0.7, -0.6, uCover);
  float a = smoothstep(thr, thr + 0.55, n + bands + streaks) * smoothstep(0.0, 0.08, uCover);
  a = a * a * (3.0 - 2.0 * a) * mix(0.8, 0.95, uCover);
  float ndl = dot(normalize(vNormalW), uSunDir);
  float lit = smoothstep(-0.15, 0.35, ndl);
  vec3 col = uTint * uSunColor * uSunLight * (0.15 + 0.95 * lit) + vec3(0.01);
  gl_FragColor = vec4(col, a * 0.92);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const ATMO_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uSunLight;
uniform float uDensity;
uniform vec3 uTint;
uniform float uAurora;
uniform float uTime;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE}
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float rim = pow(clamp(1.0 + dot(N, V) * 1.25, 0.0, 1.0), 2.2);
  float lit = smoothstep(-0.35, 0.4, dot(N, uSunDir));
  vec3 sunset = vec3(1.0, 0.45, 0.2) * smoothstep(0.4, 0.0, abs(dot(N, uSunDir))) * 0.6;
  vec3 col = (uTint + sunset) * rim * uDensity * (0.03 + lit * uSunLight);
  // aurora: curtains around the magnetic poles on the night side
  vec3 d = normalize(vPos);
  float lat = abs(asin(d.y)) * 57.2958;
  float band = smoothstep(62.0, 67.0, lat) * smoothstep(74.0, 69.0, lat);
  float curtain = smoothstep(0.35, 0.85, snoise(vec3(d.xz * 4.0, uTime * 0.08)) * 0.5 + 0.5);
  col += vec3(0.25, 1.0, 0.55) * band * curtain * uAurora * smoothstep(-0.1, -0.5, dot(N, uSunDir)) * rim * 0.3;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const MOON_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunLight;
uniform float uDissolve;
varying vec3 vPos;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE}
void main() {
  vec3 d = normalize(vPos);
  float n = fbm(d * 3.0);
  float craters = smoothstep(0.55, 0.62, snoise(d * 11.0) * 0.5 + 0.5) * 0.25;
  float maria = smoothstep(0.1, 0.3, snoise(d * 1.6 + 3.0));
  vec3 base = mix(vec3(0.62, 0.60, 0.58), vec3(0.32, 0.31, 0.31), maria) * (0.85 + 0.25 * n) - craters * 0.3;
  float ndl = max(dot(normalize(vNormalW), uSunDir), 0.0);
  vec3 col = base * uSunColor * uSunLight * ndl * 1.3 + base * 0.01;
  float edge = snoise(d * 7.0) * 0.5 + 0.5;
  if (edge < uDissolve) discard;
  col += vec3(1.0, 0.36, 0.52) * smoothstep(uDissolve + 0.08, uDissolve, edge) * step(0.001, uDissolve) * 3.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const STAR_VERT = /* glsl */ `
attribute float aSize;
attribute float aDist;
attribute vec3 aColor;
uniform float uYears;
uniform float uFade;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = step(uYears, aDist) * (1.0 - uFade);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
}
`;

export const STAR_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(p)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

export const SPARK_VERT = /* glsl */ `
attribute vec3 aVel;
attribute float aBirth;
attribute float aSize;
uniform float uTime;
uniform float uPixelRatio;
varying float vLife;
void main() {
  float t = uTime - aBirth;
  vLife = clamp(1.0 - t / 1.6, 0.0, 1.0);
  vec3 p = position + aVel * (1.0 - exp(-t * 2.2)) * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * vLife * (t >= 0.0 ? 1.0 : 0.0) * (3.0 / max(0.5, -mv.z));
}
`;

export const SPARK_FRAG = /* glsl */ `
varying float vLife;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.15, length(p)) * vLife;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.0, 0.42, 0.56) * a, a);
}
`;
