import * as THREE from 'three'
import { T } from './tuning'
import type { Game } from './game'

export class Revolver {
  ammo = T.revolver.cylinder
  reserve = 6
  reloading = false
  reloadT = 0
  cooldown = 0
  shieldHitFlash = 0     // feedback HUD: acertou alvo imune
  muzzle: THREE.PointLight
  tracer: THREE.Line
  private tracerT = 0
  shotsFired = 0
  shotsWasted = 0

  constructor(private game: Game) {
    this.muzzle = new THREE.PointLight(0xffd9a0, 0, 9, 2); game.scene.add(this.muzzle)
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.8 }))
    this.tracer.visible = false; this.tracer.frustumCulled = false; game.scene.add(this.tracer)
  }

  get canFire() { return this.ammo > 0 && this.cooldown <= 0 && !this.game.player.dead }

  cancelReload() { if (this.reloading) { this.reloading = false; this.reloadT = 0 } }

  startReload() {
    if (this.reloading || this.ammo >= T.revolver.cylinder || this.reserve <= 0) { if (this.reserve <= 0 && this.ammo < T.revolver.cylinder) this.game.audio.play('empty'); return }
    this.reloading = true; this.reloadT = 0; this.game.audio.play('click')
  }

  update(dt: number) {
    const g = this.game, inp = g.input
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.shieldHitFlash = Math.max(0, this.shieldHitFlash - dt)
    this.muzzle.intensity *= Math.max(0, 1 - dt * 30)
    if (this.tracerT > 0) { this.tracerT -= dt; if (this.tracerT <= 0) this.tracer.visible = false }
    if (g.player.dead) { this.reloading = false; return }
    if (inp.wasPressed('reload')) this.startReload()
    if (this.reloading) {
      // Recarga manual, bala a bala: lenta de propósito.
      this.reloadT += dt
      if (this.reloadT >= T.revolver.reloadPerBullet) {
        this.reloadT -= T.revolver.reloadPerBullet
        this.ammo++; this.reserve--; g.audio.play('reloadClick')
        if (this.ammo >= T.revolver.cylinder || this.reserve <= 0) { this.reloading = false; this.reloadT = 0 }
      }
    }
    if (inp.lmbPressed) {
      if (this.reloading && this.ammo > 0) this.cancelReload()   // cancelável: atira com o que tem
      if (this.canFire && !this.reloading) this.fire()
      else if (this.ammo <= 0 && this.cooldown <= 0) { g.audio.play('empty'); if (this.reserve > 0 && !this.reloading) this.startReload() }
    }
  }

  fire() {
    const g = this.game
    this.ammo--; this.cooldown = T.revolver.fireCooldown; this.shotsFired++
    g.audio.play('shot'); g.cam.recoil += T.revolver.recoil; g.cam.shake(0.25)
    const origin = g.cam.cam.position.clone()
    const dir = g.cam.forward(new THREE.Vector3())
    // Origem visual do tiro: mão do jogador
    const hand = new THREE.Vector3(); g.player.handAnchor.getWorldPosition(hand); hand.y -= 0.05; hand.x -= 0.1
    this.muzzle.position.copy(hand); this.muzzle.intensity = 30
    const hit = g.enemies.raycast(origin, dir, T.revolver.range)
    let end: THREE.Vector3
    if (hit) {
      end = hit.point
      g.enemies.onShot(hit.enemy, hit.point, dir)
    } else {
      // Impacto no terreno (aproximação por passos)
      end = origin.clone().addScaledVector(dir, T.revolver.range)
      for (let d = 1; d < T.revolver.range; d += 1.5) {
        const p = origin.clone().addScaledVector(dir, d)
        if (p.y < g.world.h(p.x, p.z)) { end = p; g.particles.burst(p, 6, 3, 0.4, 0.25, new THREE.Color(0.6, 0.5, 0.3), 6); break }
      }
    }
    const pos = this.tracer.geometry.attributes.position as THREE.BufferAttribute
    pos.setXYZ(0, hand.x, hand.y, hand.z); pos.setXYZ(1, end.x, end.y, end.z); pos.needsUpdate = true
    this.tracer.visible = true; this.tracerT = 0.06
    g.particles.burst(hand, 5, 2, 0.15, 0.4, new THREE.Color(1, 0.8, 0.4))
  }

  get reloadProgress() { return this.reloading ? this.reloadT / T.revolver.reloadPerBullet : 0 }
}
