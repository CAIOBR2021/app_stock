import * as THREE from 'three'
import { fbm, smoothstep, lerp, mulberry32, clamp } from '../util'
import { T } from '../tuning'

// ---------------- Layout do mapa (metros) ----------------
export const MAP = {
  start: new THREE.Vector3(-6, 0, 8),
  forestPath: [[0, 0], [8, -40], [-14, -85], [6, -130], [30, -175], [18, -220], [34, -256]] as [number, number][],
  roadZ: -262,
  roadX: [-70, 310] as [number, number],
  sawmill: { x0: 205, x1: 315, z0: -372, z1: -274, cx: 260, cz: -323 },
  trail: [[260, -376], [275, -405], [300, -445]] as [number, number][],
  hill: { cx: 330, cz: -520, plateauR: 40, plateauH: 30, falloffR: 62, rampR0: 80, rampTurns: 1.25, rampWidth: 7 },
  lighthouse: { x: 330, z: -524 },
}
const H = MAP.hill
export const RAMP_A0 = Math.atan2(-445 - H.cz, 300 - H.cx) // ângulo do pé da rampa
export const RAMP_SPAN = H.rampTurns * Math.PI * 2

const RAMP_R1 = H.plateauR - 4
/** t em que a rampa cruza a borda do platô: a altura chega ao máximo aí, sem degrau. */
const RAMP_T_TOP = (H.rampR0 - H.plateauR) / (H.rampR0 - RAMP_R1)
export function rampHeight(t: number) { return H.plateauH * clamp(t / RAMP_T_TOP, 0, 1) }
export function rampPoint(t: number): [number, number, number] {
  // t ∈ [0,1] ao longo da rampa -> (x, z, altura)
  const a = RAMP_A0 + t * RAMP_SPAN
  const r = lerp(H.rampR0, RAMP_R1, t)
  return [H.cx + Math.cos(a) * r, H.cz + Math.sin(a) * r, rampHeight(t)]
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az
  const l2 = dx * dx + dz * dz
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0
  t = clamp(t, 0, 1)
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}
export function polyDist(px: number, pz: number, poly: [number, number][]) {
  let d = Infinity
  for (let i = 0; i < poly.length - 1; i++) d = Math.min(d, segDist(px, pz, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]))
  return d
}

export function rampInfo(x: number, z: number): { d: number; h: number; t: number } {
  const dx = x - H.cx, dz = z - H.cz
  const r = Math.hypot(dx, dz)
  const a = Math.atan2(dz, dx)
  let best = { d: Infinity, h: 0, t: 0 }
  for (let k = -1; k <= 2; k++) {
    const au = a + k * Math.PI * 2
    const t = (au - RAMP_A0) / RAMP_SPAN
    if (t < -0.08 || t > 1.05) continue
    const tc = clamp(t, 0, 1)
    const rs = lerp(H.rampR0, RAMP_R1, tc)
    const d = Math.abs(r - rs) + (t < 0 ? -t * 40 : 0)
    if (d < best.d) best = { d, h: rampHeight(tc), t: tc }
  }
  return best
}

export function heightAt(x: number, z: number): number {
  let h = 1.6 * fbm(x / 55 + 3.1, z / 55 - 1.7, 3) + 0.35 * fbm(x / 12, z / 12, 2)
  // Clareira inicial
  h *= smoothstep(6, 16, Math.hypot(x - MAP.start.x - 2, z - MAP.start.z - 2))
  // Estrada plana
  if (x > MAP.roadX[0] - 10 && x < MAP.roadX[1] + 10) h *= smoothstep(6, 12, Math.abs(z - MAP.roadZ))
  // Serraria plana
  const s = MAP.sawmill
  const inS = Math.max(s.x0 - 8 - x, x - s.x1 - 8, s.z0 - 8 - z, z - s.z1 - 8)
  h *= smoothstep(-2, 6, inS)
  // Trilha suave
  h *= 0.35 + 0.65 * smoothstep(2, 6, polyDist(x, z, MAP.trail))
  // Morro do farol com rampa em espiral
  const r = Math.hypot(x - H.cx, z - H.cz)
  if (r < H.rampR0 + 14) {
    const hillH = H.plateauH * (1 - smoothstep(H.plateauR, H.falloffR, r))
    const ri = rampInfo(x, z)
    const w = 1 - smoothstep(H.rampWidth * 0.55, H.rampWidth, ri.d)
    const base = Math.max(h, hillH)
    h = lerp(base, Math.max(ri.h, r < H.plateauR ? H.plateauH : 0), w)
    if (r < H.plateauR) h = Math.max(h, H.plateauH)
  }
  // Mar / penhasco
  const sea = smoothstep(-590, -640, z) + smoothstep(420, 470, x)
  h = lerp(h, -30, clamp(sea, 0, 1))
  return h
}

// ---------------- Colisão (círculos numa grade) ----------------
export interface Circle { x: number; z: number; r: number; tag?: string }
export class CollisionGrid {
  private cell = 8
  private map = new Map<string, Circle[]>()
  all: Circle[] = []
  private key(cx: number, cz: number) { return `${cx},${cz}` }
  add(c: Circle) {
    this.all.push(c)
    const cx = Math.floor(c.x / this.cell), cz = Math.floor(c.z / this.cell)
    const span = Math.ceil(c.r / this.cell) + 1
    for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) {
      const k = this.key(cx + i, cz + j)
      let arr = this.map.get(k); if (!arr) { arr = []; this.map.set(k, arr) }
      arr.push(c)
    }
  }
  remove(c: Circle) {
    this.all = this.all.filter((x) => x !== c)
    for (const arr of this.map.values()) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1) }
  }
  near(x: number, z: number): Circle[] {
    return this.map.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) ?? []
  }
  /** Empurra (x,z) para fora de todos os círculos; retorna nova posição. */
  resolve(x: number, z: number, r: number): [number, number] {
    for (let it = 0; it < 3; it++) {
      let moved = false
      for (const c of this.near(x, z)) {
        const dx = x - c.x, dz = z - c.z
        const d = Math.hypot(dx, dz), min = c.r + r
        if (d < min && d > 1e-4) { x = c.x + (dx / d) * min; z = c.z + (dz / d) * min; moved = true }
        else if (d <= 1e-4) { x += min; moved = true }
      }
      if (!moved) break
    }
    return [x, z]
  }
  /** Teste de linha (para IA / visão) contra colisores. */
  blocked(ax: number, az: number, bx: number, bz: number, ignoreTag?: string) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 3)
    for (let i = 1; i < steps; i++) {
      const t = i / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t
      for (const c of this.near(x, z)) {
        if (ignoreTag && c.tag === ignoreTag) continue
        if (Math.hypot(x - c.x, z - c.z) < c.r) return true
      }
    }
    return false
  }
}

// ---------------- Malha do terreno ----------------
export function buildTerrain(): THREE.Mesh {
  const W = 800, D = 900, SEG = 220
  const geo = new THREE.PlaneGeometry(W, D, SEG, SEG)
  geo.rotateX(-Math.PI / 2)
  const cx = 180, cz = -280
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c1 = new THREE.Color(0x15282a), c2 = new THREE.Color(0x24362f), cRoad = new THREE.Color(0x3a332c), cRock = new THREE.Color(0x2e373f)
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, z = pos.getZ(i) + cz
    const h = heightAt(x, z)
    pos.setXYZ(i, x, h, z)
    const n = fbm(x / 9, z / 9, 2) * 0.5 + 0.5
    tmp.copy(c1).lerp(c2, n)
    const onRoad = Math.abs(z - MAP.roadZ) < 5 && x > MAP.roadX[0] && x < MAP.roadX[1]
    if (onRoad || polyDist(x, z, MAP.trail) < 3 || polyDist(x, z, MAP.forestPath) < 2.5) tmp.lerp(cRoad, 0.7)
    const r = Math.hypot(x - H.cx, z - H.cz)
    if (r < H.falloffR + 6) tmp.lerp(cRock, 0.6)
    if (h < -2) tmp.set(0x03080f)
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'terrain'
  return mesh
}

// ---------------- Floresta instanciada ----------------
export function buildForest(grid: CollisionGrid): THREE.Group {
  const g = new THREE.Group()
  const rnd = mulberry32(T.world.seed)
  const s = MAP.sawmill
  const positions: [number, number, number][] = []
  let tries = 0
  while (positions.length < T.world.treeCount && tries++ < T.world.treeCount * 8) {
    const x = -160 + rnd() * 600, z = 90 - rnd() * 720
    if (heightAt(x, z) < -0.5) continue
    if (Math.hypot(x - MAP.start.x - 2, z - MAP.start.z - 2) < 13) continue
    if (polyDist(x, z, MAP.forestPath) < 4.5) continue
    if (Math.abs(z - MAP.roadZ) < 9 && x > MAP.roadX[0] - 5 && x < MAP.roadX[1] + 5) continue
    if (x > s.x0 - 6 && x < s.x1 + 6 && z > s.z0 - 6 && z < s.z1 + 6) continue
    if (polyDist(x, z, MAP.trail) < 4.5) continue
    if (Math.hypot(x - H.cx, z - H.cz) < H.rampR0 + 10) continue
    // Densidade: mais denso na floresta (Ato 1), mais esparso perto da estrada
    const dens = z > MAP.roadZ + 12 ? 0.95 : 0.55
    if (rnd() > dens) continue
    positions.push([x, z, 0.8 + rnd() * 0.6])
  }
  // Algumas árvores ao redor do platô (fora da rampa)
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = 8 + rnd() * 22
    const x = H.cx + Math.cos(a) * r, z = H.cz + Math.sin(a) * r
    if (Math.hypot(x - MAP.lighthouse.x, z - MAP.lighthouse.z) < 9) continue
    positions.push([x, z, 0.7 + rnd() * 0.4])
  }
  const n = positions.length
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 4.5, 6)
  trunkGeo.translate(0, 2.25, 0)
  const folGeo = new THREE.ConeGeometry(2.4, 10, 7)
  folGeo.translate(0, 3.2 + 5, 0)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2a1d13 })
  const folMat = new THREE.MeshLambertMaterial({ color: 0x17382f })
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n)
  const fol = new THREE.InstancedMesh(folGeo, folMat, n)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3()
  const col = new THREE.Color()
  for (let i = 0; i < n; i++) {
    const [x, z, s] = positions[i]
    const y = heightAt(x, z) - 0.3
    p.set(x, y, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2); sc.set(s, s * (0.9 + rnd() * 0.4), s)
    m.compose(p, q, sc); trunks.setMatrixAt(i, m); fol.setMatrixAt(i, m)
    col.setHSL(0.45 + rnd() * 0.06, 0.35, 0.16 + rnd() * 0.07); fol.setColorAt(i, col)
    grid.add({ x, z, r: 0.42 * s, tag: 'tree' })
  }
  trunks.instanceMatrix.needsUpdate = true; fol.instanceMatrix.needsUpdate = true
  if (fol.instanceColor) fol.instanceColor.needsUpdate = true
  trunks.frustumCulled = false; fol.frustumCulled = false
  g.add(trunks, fol)
  return g
}
