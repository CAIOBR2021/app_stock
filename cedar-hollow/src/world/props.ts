import * as THREE from 'three'
import { heightAt, CollisionGrid } from './terrain'
import { LightPool, LightSource, makeGlow, makeLightCone, makeHaloDisc } from './lights'
import { T } from '../tuning'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type HavenKind = 'lamp' | 'generator' | 'flood' | 'cabin' | 'flare' | 'lighthouse'
export interface Haven {
  pos: THREE.Vector3
  radius: number
  on: boolean
  kind: HavenKind
  light?: LightSource
  glow?: THREE.Sprite
  cone?: THREE.Mesh
  disc?: THREE.Mesh
  bulb?: THREE.Mesh
  flicker?: number
  refresh?: () => void
}

const MAT = {
  metal: new THREE.MeshLambertMaterial({ color: 0x3b3f44 }),
  darkMetal: new THREE.MeshLambertMaterial({ color: 0x24272b }),
  wood: new THREE.MeshLambertMaterial({ color: 0x4a3524 }),
  log: new THREE.MeshLambertMaterial({ color: 0x5a3f2b }),
  wall: new THREE.MeshLambertMaterial({ color: 0x3a3330 }),
  roof: new THREE.MeshLambertMaterial({ color: 0x2b2522 }),
  rust: new THREE.MeshLambertMaterial({ color: 0x6b3a22 }),
  bulbOn: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  bulbOff: new THREE.MeshBasicMaterial({ color: 0x2a2622 }),
  lighthouse: new THREE.MeshLambertMaterial({ color: 0xc9bfae }),
  lighthouseBand: new THREE.MeshLambertMaterial({ color: 0x7a2a22 }),
  rock: new THREE.MeshLambertMaterial({ color: 0x2e343a }),
}

export function applyHavenVisual(h: Haven) {
  const on = h.on
  if (h.light) h.light.on = on
  if (h.glow) h.glow.visible = on
  if (h.cone) h.cone.visible = on
  if (h.disc) h.disc.visible = on
  if (h.bulb) h.bulb.material = on ? MAT.bulbOn : MAT.bulbOff
}

export function buildLampPost(scene: THREE.Scene, pool: LightPool, grid: CollisionGrid, x: number, z: number, opts: { on?: boolean; flicker?: number; rotY?: number } = {}): Haven {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = opts.rotY ?? 0
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6, 8), MAT.metal); pole.position.y = 3; g.add(pole)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), MAT.metal); arm.position.set(0.6, 5.9, 0); g.add(arm)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), MAT.darkMetal); head.position.set(1.2, 5.85, 0); g.add(head)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), MAT.bulbOn); bulb.position.set(1.2, 5.68, 0); g.add(bulb)
  const glow = makeGlow(T.world.lampColor, 3.2, 0.9); glow.position.copy(bulb.position); g.add(glow)
  const cone = makeLightCone(T.world.lampColor, 5.8, 3.6, 0.12); cone.position.copy(bulb.position); g.add(cone)
  const disc = makeHaloDisc(T.world.lampColor, T.haven.lampRadius, 0.13); disc.position.set(1.2, 0.05, 0); g.add(disc)
  scene.add(g)
  grid.add({ x, z, r: 0.25, tag: 'prop' })
  const wp = new THREE.Vector3(1.2, 5.6, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).add(g.position)
  const light = pool.add({ pos: wp, color: new THREE.Color(T.world.lampColor), intensity: T.world.lampIntensity, distance: 16, on: opts.on ?? true, flicker: opts.flicker ?? 0, priority: 1 })
  const h: Haven = { pos: new THREE.Vector3(wp.x, y, wp.z), radius: T.haven.lampRadius, on: opts.on ?? true, kind: 'lamp', light, glow, cone, disc, bulb, flicker: opts.flicker }
  applyHavenVisual(h)
  return h
}

export function buildGenerator(scene: THREE.Scene, pool: LightPool, grid: CollisionGrid, x: number, z: number, rotY = 0): Haven & { body: THREE.Group } {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.0), MAT.rust); body.position.y = 0.55; g.add(body)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 10), MAT.darkMetal); tank.rotation.z = Math.PI / 2; tank.position.set(0, 1.3, 0); g.add(tank)
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), MAT.darkMetal); pipe.position.set(-0.6, 1.9, 0.3); g.add(pipe)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 6), MAT.metal); pole.position.set(0.7, 1.8, -0.4); g.add(pole)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), MAT.bulbOff); bulb.position.set(0.7, 3.7, -0.4); g.add(bulb)
  const glow = makeGlow(0xffcc77, 4.5, 0.95); glow.position.copy(bulb.position); g.add(glow)
  const disc = makeHaloDisc(0xffcc77, T.haven.generatorRadius, 0.12); disc.position.set(0, 0.05, 0); g.add(disc)
  scene.add(g)
  for (let i = -1; i <= 1; i++) grid.add({ x: x + Math.cos(rotY) * i * 0.6, z: z - Math.sin(rotY) * i * 0.6, r: 0.7, tag: 'prop' })
  const wp = bulb.position.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY).add(g.position)
  const light = pool.add({ pos: wp, color: new THREE.Color(0xffcc77), intensity: 45, distance: 20, on: false, priority: 2 })
  const h = { pos: new THREE.Vector3(x, y, z), radius: T.haven.generatorRadius, on: false, kind: 'generator' as HavenKind, light, glow, disc, bulb, body: g }
  applyHavenVisual(h)
  return h
}

export function buildFloodTower(scene: THREE.Scene, pool: LightPool, grid: CollisionGrid, x: number, z: number, aimX: number, aimZ: number): Haven {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 9, 8), MAT.metal); pole.position.y = 4.5; g.add(pole)
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), MAT.darkMetal); head.position.y = 9; g.add(head)
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.1), MAT.bulbOff); bulb.position.set(0, 8.95, 0.3); g.add(bulb)
  const ang = Math.atan2(aimX - x, aimZ - z)
  g.rotation.y = ang
  const glow = makeGlow(0xffd08a, 7, 0.9); glow.position.set(0, 9, 0.3); g.add(glow)
  const cone = makeLightCone(0xffd08a, 12, 7, 0.1); cone.position.set(0, 9, 0.3); cone.rotation.x = -0.55; g.add(cone)
  const disc = makeHaloDisc(0xffd08a, T.haven.floodRadius, 0.1); disc.position.set(Math.sin(0) * 0, 0.05, 6); g.add(disc)
  scene.add(g)
  grid.add({ x, z, r: 0.3, tag: 'prop' })
  const center = new THREE.Vector3(x + Math.sin(ang) * 6, y, z + Math.cos(ang) * 6)
  const light = pool.add({ pos: new THREE.Vector3(x + Math.sin(ang) * 2, y + 8.5, z + Math.cos(ang) * 2), color: new THREE.Color(0xffd08a), intensity: 140, distance: 30, on: false, priority: 3 })
  const h: Haven = { pos: center, radius: T.haven.floodRadius, on: false, kind: 'flood', light, glow, cone, disc, bulb }
  applyHavenVisual(h)
  return h
}

export function buildCabin(scene: THREE.Scene, pool: LightPool, grid: CollisionGrid, x: number, z: number): Haven {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z)
  const w = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), MAT.wood); w.position.y = 1.5; g.add(w)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2, 4), MAT.roof); roof.position.y = 4; roof.rotation.y = Math.PI / 4; g.add(roof)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2.1, 0.1), MAT.darkMetal); door.position.set(0, 1.05, 2.55); g.add(door)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), MAT.bulbOn); bulb.position.set(0, 2.6, 2.9); g.add(bulb)
  const glow = makeGlow(T.world.lampColor, 3, 0.9); glow.position.copy(bulb.position); g.add(glow)
  const disc = makeHaloDisc(T.world.lampColor, 4.5, 0.12); disc.position.set(0, 0.05, 4); g.add(disc)
  // rádio na varanda
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.25), MAT.darkMetal); radio.position.set(2, 0.45, 3.2); g.add(radio)
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), MAT.wood); crate.position.set(2, 0.15, 3.2); g.add(crate)
  const dial = makeGlow(0xffa040, 0.5, 0.9); dial.position.set(2, 0.5, 3.35); g.add(dial)
  scene.add(g)
  for (let i = -2; i <= 2; i++) { grid.add({ x: x + i * 1.3, z: z - 2.5, r: 0.9, tag: 'prop' }); grid.add({ x: x + i * 1.3, z: z + 2.5, r: 0.9, tag: 'prop' }) }
  for (let j = -1; j <= 1; j++) { grid.add({ x: x - 3, z: z + j * 1.5, r: 0.9, tag: 'prop' }); grid.add({ x: x + 3, z: z + j * 1.5, r: 0.9, tag: 'prop' }) }
  grid.add({ x: x + 2, z: z + 3.2, r: 0.45, tag: 'prop' })
  const light = pool.add({ pos: new THREE.Vector3(x, y + 2.6, z + 3), color: new THREE.Color(T.world.lampColor), intensity: 24, distance: 14, on: true, priority: 1 })
  const h: Haven = { pos: new THREE.Vector3(x, y, z + 4), radius: 4.5, on: true, kind: 'cabin', light, glow, disc, bulb }
  return h
}

export function buildLogPile(scene: THREE.Scene, grid: CollisionGrid, x: number, z: number, rotY: number, len = 6) {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY
  const geo = new THREE.CylinderGeometry(0.42, 0.42, len, 8)
  geo.rotateZ(Math.PI / 2)
  const rows = [[-1, 0, 1], [-0.5, 0.5], [0]]
  rows.forEach((row, r) => row.forEach((o) => {
    const m = new THREE.Mesh(geo, MAT.log); m.position.set(0, 0.42 + r * 0.74, o * 0.86); g.add(m)
  }))
  scene.add(g)
  for (let i = -1; i <= 1; i++) {
    const lx = x + Math.cos(rotY) * i * (len / 3), lz = z - Math.sin(rotY) * i * (len / 3)
    grid.add({ x: lx, z: lz, r: 1.45, tag: 'prop' })
  }
  return g
}

export function buildConveyor(scene: THREE.Scene, grid: CollisionGrid, x: number, z: number, rotY: number, len = 18) {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY
  const belt = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 1.3), MAT.darkMetal); belt.position.y = 1.2; g.add(belt)
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 0.08), MAT.rust); rail.position.set(0, 1.45, 0.6); g.add(rail)
  const rail2 = rail.clone(); rail2.position.z = -0.6; g.add(rail2)
  for (let i = -len / 2 + 1; i < len / 2; i += 3) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 1.2), MAT.metal); leg.position.set(i, 0.6, 0); g.add(leg)
    grid.add({ x: x + Math.cos(rotY) * i, z: z - Math.sin(rotY) * i, r: 0.9, tag: 'prop' })
  }
  scene.add(g)
  return g
}

export function buildShed(scene: THREE.Scene, grid: CollisionGrid, x: number, z: number, w: number, d: number, h: number, openSide: 'n' | 's' | 'e' | 'w' = 's') {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z)
  const wallT = 0.3
  const mk = (sx: number, sz: number, px: number, pz: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), MAT.wall); m.position.set(px, h / 2, pz); g.add(m) }
  if (openSide !== 'n') mk(w, wallT, 0, -d / 2)
  if (openSide !== 's') mk(w, wallT, 0, d / 2)
  if (openSide !== 'w') mk(wallT, d, -w / 2, 0)
  if (openSide !== 'e') mk(wallT, d, w / 2, 0)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), MAT.roof); roof.position.y = h + 0.15; g.add(roof)
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), MAT.wood)
  const p1 = post.clone(); p1.position.set(-w / 2, h / 2, openSide === 's' ? d / 2 : -d / 2); g.add(p1)
  const p2 = post.clone(); p2.position.set(w / 2, h / 2, openSide === 's' ? d / 2 : -d / 2); g.add(p2)
  scene.add(g)
  const addRow = (ax: number, az: number, bx: number, bz: number) => {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.2)
    for (let i = 0; i <= n; i++) grid.add({ x: x + ax + (bx - ax) * i / n, z: z + az + (bz - az) * i / n, r: 0.7, tag: 'prop' })
  }
  if (openSide !== 'n') addRow(-w / 2, -d / 2, w / 2, -d / 2)
  if (openSide !== 's') addRow(-w / 2, d / 2, w / 2, d / 2)
  if (openSide !== 'w') addRow(-w / 2, -d / 2, -w / 2, d / 2)
  if (openSide !== 'e') addRow(w / 2, -d / 2, w / 2, d / 2)
  return g
}

export function buildFence(scene: THREE.Scene, grid: CollisionGrid, pts: [number, number][], gaps: [number, number][] = []) {
  const geos: THREE.BufferGeometry[] = []
  const postGeo = new THREE.BoxGeometry(0.18, 2.2, 0.18)
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3)
    const ang = Math.atan2(bx - ax, bz - az)
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n
      const mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2
      if (gaps.some(([gx, gz]) => Math.hypot(mx - gx, mz - gz) < 4)) continue
      const px = ax + (bx - ax) * t0, pz = az + (bz - az) * t0
      const post = postGeo.clone().translate(px, heightAt(px, pz) + 1.1, pz); geos.push(post)
      const my = heightAt(mx, mz)
      const rail = new THREE.BoxGeometry(0.08, 0.14, L / n).rotateY(ang).translate(mx, my + 1.6, mz); geos.push(rail)
      const rail2 = new THREE.BoxGeometry(0.08, 0.14, L / n).rotateY(ang).translate(mx, my + 0.8, mz); geos.push(rail2)
      const cn = Math.ceil((L / n) / 1.1)
      for (let c = 0; c <= cn; c++) { const t = t0 + (t1 - t0) * c / cn; grid.add({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, r: 0.6, tag: 'fence' }) }
    }
  }
  const merged = mergeGeometries(geos, false)!
  const mesh = new THREE.Mesh(merged, MAT.wood); mesh.frustumCulled = false
  scene.add(mesh)
  return mesh
}

export function buildRocks(scene: THREE.Scene, grid: CollisionGrid, list: [number, number, number][]) {
  const geo = new THREE.DodecahedronGeometry(1, 0)
  const im = new THREE.InstancedMesh(geo, MAT.rock, list.length)
  const m = new THREE.Matrix4()
  list.forEach(([x, z, s], i) => {
    m.compose(new THREE.Vector3(x, heightAt(x, z) + s * 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(x * 0.3, z * 0.7, 0)), new THREE.Vector3(s, s * 0.8, s))
    im.setMatrixAt(i, m)
    grid.add({ x, z, r: s * 0.9, tag: 'rock' })
  })
  im.frustumCulled = false
  scene.add(im)
}

export interface Lighthouse {
  group: THREE.Group
  beam: THREE.Group
  angle: number
  on: boolean
  lampLight: THREE.SpotLight
  lampPos: THREE.Vector3
  panelPos: THREE.Vector3
  glow: THREE.Sprite
  setOn(on: boolean): void
}

export function buildLighthouse(scene: THREE.Scene, grid: CollisionGrid, x: number, z: number): Lighthouse {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z)
  const H = 24
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, H, 16), MAT.lighthouse); tower.position.y = H / 2; g.add(tower)
  for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(3.0 - i * 0.3, 3.15 - i * 0.3, 2.2, 16), MAT.lighthouseBand); band.position.y = 5 + i * 7; g.add(band) }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.5, 16), MAT.darkMetal); gallery.position.y = H; g.add(gallery)
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 3.2, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.35 })); lampRoom.position.y = H + 1.9; g.add(lampRoom)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2, 12), MAT.darkMetal); cap.position.y = H + 4.5; g.add(cap)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), MAT.darkMetal); door.position.set(0, 1.1, 3.55); g.add(door)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.3), MAT.rust); panel.position.set(2.8, 0.9, 3.0); g.add(panel)
  const panelLight = makeGlow(0xff4a2a, 0.6, 0.9); panelLight.position.set(2.8, 1.5, 3.2); g.add(panelLight)
  // Feixe duplo rotativo (visível através da neblina)
  const beam = new THREE.Group(); beam.position.y = H + 1.9
  const b1 = makeLightCone(0xffe6b0, 260, 14, 0.09, false); b1.rotation.x = Math.PI / 2 + 0.06; beam.add(b1)
  const b2 = makeLightCone(0xffe6b0, 260, 14, 0.09, false); b2.rotation.x = -Math.PI / 2 - 0.06; beam.add(b2)
  const core1 = makeLightCone(0xfff6dc, 120, 3, 0.18, false); core1.rotation.x = Math.PI / 2 + 0.06; beam.add(core1)
  const core2 = makeLightCone(0xfff6dc, 120, 3, 0.18, false); core2.rotation.x = -Math.PI / 2 - 0.06; beam.add(core2)
  g.add(beam)
  const glow = makeGlow(0xfff0c0, 22, 1, false); glow.position.y = H + 1.9; g.add(glow)
  const lampLight = new THREE.SpotLight(0xfff0c0, 0, 120, 0.22, 0.5, 0.8)
  lampLight.position.set(0, H + 1.9, 0); g.add(lampLight); g.add(lampLight.target)
  scene.add(g)
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) grid.add({ x: x + Math.cos(a) * 3.2, z: z + Math.sin(a) * 3.2, r: 0.9, tag: 'prop' })
  const lh: Lighthouse = {
    group: g, beam, angle: 0, on: false, lampLight, glow,
    lampPos: new THREE.Vector3(x, y + H + 1.9, z), panelPos: new THREE.Vector3(x + 2.8, y, z + 3.4),
    setOn(on: boolean) {
      lh.on = on; beam.visible = on; glow.visible = on; lampLight.intensity = on ? 400 : 0
      ;(panelLight.material as THREE.SpriteMaterial).color.set(on ? 0x40ff70 : 0xff4a2a)
      ;(lampRoom.material as THREE.MeshBasicMaterial).opacity = on ? 0.85 : 0.2
    },
  }
  lh.setOn(false)
  return lh
}

export function buildRadioSpot(scene: THREE.Scene, grid: CollisionGrid, x: number, z: number, kind: 'radio' | 'tv') {
  const y = heightAt(x, z)
  const g = new THREE.Group(); g.position.set(x, y, z)
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.7), MAT.wood); table.position.y = 0.4; g.add(table)
  if (kind === 'radio') {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.25), MAT.darkMetal); r.position.set(0, 0.95, 0); g.add(r)
    const d = makeGlow(0xffa040, 0.5, 0.9); d.position.set(0.15, 1.0, 0.15); g.add(d)
  } else {
    const tv = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), MAT.darkMetal); tv.position.set(0, 1.15, 0); g.add(tv)
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ color: 0x9fc4ff })); screen.position.set(0, 1.15, 0.31); g.add(screen)
    const gl = makeGlow(0x9fc4ff, 3, 0.7); gl.position.set(0, 1.2, 0.5); g.add(gl)
  }
  scene.add(g)
  grid.add({ x, z, r: 0.7, tag: 'prop' })
  return g
}
