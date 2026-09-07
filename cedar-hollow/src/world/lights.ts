import * as THREE from 'three'
import { T } from '../tuning'

/** Fonte de luz lógica: o pool decide quais viram PointLight reais. */
export interface LightSource {
  pos: THREE.Vector3
  color: THREE.Color
  intensity: number
  distance: number
  on: boolean
  flicker?: number   // 0..1 intensidade de tremulação
  priority?: number  // maior = mais chance de ser real
}

export class LightPool {
  lights: THREE.PointLight[] = []
  sources: LightSource[] = []
  constructor(scene: THREE.Scene, n = T.world.lightPoolSize) {
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 20, 1.6)
      l.visible = true
      scene.add(l); this.lights.push(l)
    }
  }
  add(s: LightSource) { this.sources.push(s); return s }
  remove(s: LightSource) { const i = this.sources.indexOf(s); if (i >= 0) this.sources.splice(i, 1) }
  update(playerPos: THREE.Vector3, time: number) {
    const active = this.sources.filter((s) => s.on && s.intensity > 0)
    active.sort((a, b) => (a.pos.distanceToSquared(playerPos) / (1 + (a.priority ?? 0))) - (b.pos.distanceToSquared(playerPos) / (1 + (b.priority ?? 0))))
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i], s = active[i]
      if (!s) { l.intensity = 0; continue }
      l.position.copy(s.pos); l.color.copy(s.color)
      let k = 1
      if (s.flicker) k = 1 - s.flicker * (0.5 + 0.5 * Math.sin(time * 37 + s.pos.x) * Math.sin(time * 11.3))
      l.intensity = s.intensity * k; l.distance = s.distance
    }
  }
}

let glowTex: THREE.Texture | null = null
export function getGlowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas'); c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  return glowTex
}

export function makeGlow(color: number, size: number, opacity = 0.8, fog = true) {
  const mat = new THREE.SpriteMaterial({ map: getGlowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog })
  const s = new THREE.Sprite(mat); s.scale.set(size, size, 1)
  return s
}

/** Cone "volumétrico" falso: aditivo, transparente, some com a distância pela neblina. */
export function makeLightCone(color: number, length: number, radius: number, opacity = 0.14, fog = true) {
  const geo = new THREE.ConeGeometry(radius, length, 24, 1, true)
  geo.translate(0, -length / 2, 0)
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog })
  const m = new THREE.Mesh(geo, mat)
  return m
}

export function makeHaloDisc(color: number, radius: number, opacity = 0.16) {
  const geo = new THREE.CircleGeometry(radius, 32)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  const m = new THREE.Mesh(geo, mat)
  return m
}
