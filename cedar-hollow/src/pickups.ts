import * as THREE from 'three'
import { makeGlow } from './world/lights'
import type { Game } from './game'
import { PAGES, THERMOS } from './narrative'
import { MAP, rampPoint } from './world/terrain'

export type PickupKind = 'battery' | 'ammo' | 'flare' | 'page' | 'thermos'
export interface Pickup { id: string; kind: PickupKind; pos: THREE.Vector3; mesh: THREE.Group; taken: boolean; amount: number; pageId?: string }

const M = MAP.sawmill
const r = (t: number) => rampPoint(t)
/** Recursos: escassos de propósito. */
const RESOURCES: [PickupKind, number, number][] = [
  // Ato 1
  ['battery', -3, -28], ['ammo', 10, -62], ['battery', -16, -92], ['flare', -10, -84], ['ammo', 2, -128], ['battery', 28, -168], ['ammo', 22, -222],
  // Estrada
  ['battery', 30, MAP.roadZ - 3], ['ammo', 100, MAP.roadZ + 4], ['battery', 152, MAP.roadZ - 3], ['flare', 190, MAP.roadZ + 3],
  // Serraria
  ['battery', M.x0 + 10, M.z1 - 20], ['ammo', M.x0 + 26, M.z1 - 44], ['battery', M.x1 - 14, M.z1 - 14], ['flare', M.x1 - 26, M.z1 - 50],
  ['ammo', M.cx - 24, M.z0 + 12], ['battery', M.cx + 26, M.z0 + 12], ['battery', M.cx + 6, M.z0 + 40], ['ammo', M.cx - 10, M.z1 - 40],
  // Ato 3: só pilhas e um sinalizador
  ['battery', 272, -400], ['battery', r(0.2)[0], r(0.2)[1]], ['flare', r(0.42)[0], r(0.42)[1]], ['battery', r(0.62)[0], r(0.62)[1]], ['battery', r(0.9)[0], r(0.9)[1]],
  ['battery', MAP.lighthouse.x - 6, MAP.lighthouse.z + 9],
]

export class Pickups {
  list: Pickup[] = []
  constructor(private game: Game) {
    RESOURCES.forEach(([k, x, z], i) => this.add(`r${i}`, k, x, z))
    for (const p of PAGES) this.add(p.id, 'page', p.x, p.z, p.id)
    THERMOS.forEach((t, i) => this.add(`t${i}`, 'thermos', t.x, t.z))
  }
  private add(id: string, kind: PickupKind, x: number, z: number, pageId?: string) {
    const g = new THREE.Group()
    const y = this.game.world.h(x, z)
    let m: THREE.Mesh, glowColor = 0xffc16b, amount = 1
    switch (kind) {
      case 'battery': m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0xd8c08a })); m.rotation.z = 0.4; glowColor = 0x8fd0ff; break
      case 'ammo': m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.2), new THREE.MeshLambertMaterial({ color: 0x8a6a3a })); amount = 6; glowColor = 0xffa040; break
      case 'flare': m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), new THREE.MeshLambertMaterial({ color: 0xc0302a })); m.rotation.z = 1.2; glowColor = 0xff5030; break
      case 'page': m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), new THREE.MeshBasicMaterial({ color: 0xf2e6c8, side: THREE.DoubleSide })); m.rotation.x = -0.4; glowColor = 0xfff2c0; break
      default: m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8), new THREE.MeshLambertMaterial({ color: 0xc9812e })); glowColor = 0xffb060
    }
    m.position.y = 0.3; g.add(m)
    const gl = makeGlow(glowColor, kind === 'page' ? 1.6 : 1.0, kind === 'page' ? 0.9 : 0.55); gl.position.y = 0.35; g.add(gl)
    g.position.set(x, y, z); this.game.scene.add(g)
    this.list.push({ id, kind, pos: new THREE.Vector3(x, y, z), mesh: g, taken: false, amount, pageId })
  }
  setTaken(ids: Set<string>) {
    for (const p of this.list) { p.taken = ids.has(p.id); p.mesh.visible = !p.taken }
  }
  update(dt: number) {
    const g = this.game, pp = g.player.pos
    for (const p of this.list) {
      if (p.taken) continue
      const d2 = (p.pos.x - pp.x) ** 2 + (p.pos.z - pp.z) ** 2
      if (d2 > 40 * 40) continue
      p.mesh.rotation.y += dt * 1.5; p.mesh.position.y = p.pos.y + Math.sin(g.time * 2 + p.pos.x) * 0.06
      if (d2 < 1.5 * 1.5 && Math.abs(p.pos.y - pp.y) < 2.5) { p.taken = true; p.mesh.visible = false; g.onPickup(p) }
    }
  }
}
