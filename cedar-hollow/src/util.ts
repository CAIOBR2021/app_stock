import * as THREE from 'three'

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Value-noise 2D simples e determinístico
const P = new Uint8Array(512)
{
  const r = mulberry32(99)
  const perm: number[] = []
  for (let i = 0; i < 256; i++) perm.push(i)
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]] }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255]
}
function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10) }
function grad(h: number, x: number, y: number) {
  switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y }
}
export function noise2(x: number, y: number) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255
  x -= Math.floor(x); y -= Math.floor(y)
  const u = fade(x), v = fade(y)
  const a = P[X] + Y, b = P[X + 1] + Y
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(grad(P[a], x, y), grad(P[b], x - 1, y), u),
    THREE.MathUtils.lerp(grad(P[a + 1], x, y - 1), grad(P[b + 1], x - 1, y - 1), u), v)
}
export function fbm(x: number, y: number, oct = 4) {
  let s = 0, a = 1, f = 1, n = 0
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); n += a; a *= 0.5; f *= 2 }
  return s / n
}

export const clamp = THREE.MathUtils.clamp
export const lerp = THREE.MathUtils.lerp
export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
}
export function damp(a: number, b: number, lambda: number, dt: number) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt))
}
export function angleLerp(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  return a + d * t
}
export function dist2D(ax: number, az: number, bx: number, bz: number) {
  return Math.hypot(ax - bx, az - bz)
}
export function fmtTime(s: number) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}
