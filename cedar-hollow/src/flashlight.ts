import * as THREE from 'three'
import { T } from './tuning'
import { damp, clamp, smoothstep } from './util'
import { makeLightCone } from './world/lights'
import type { Game } from './game'

export class Flashlight {
  spot: THREE.SpotLight
  cone: THREE.Mesh
  coneFocus: THREE.Mesh
  on = true
  focusing = false
  battery = T.flashlight.battery
  spares = 0
  origin = new THREE.Vector3()
  dir = new THREE.Vector3(0, 0, -1)
  burnIntensity = 0      // 0..1 feedback (queimando alguém)
  private curAngle = THREE.MathUtils.degToRad(T.flashlight.normalConeDeg / 2)
  private curInt = T.flashlight.normalIntensity
  private curColor = new THREE.Color(T.flashlight.color)
  private focusColor = new THREE.Color(T.flashlight.focusColor)
  private normalColor = new THREE.Color(T.flashlight.color)
  focusSoundLevel = 0

  constructor(private game: Game) {
    this.spot = new THREE.SpotLight(T.flashlight.color, T.flashlight.normalIntensity, T.flashlight.normalRange, this.curAngle, 0.55, 1.2)
    game.scene.add(this.spot); game.scene.add(this.spot.target)
    this.cone = makeLightCone(T.flashlight.color, 18, 5.2, 0.075)
    this.coneFocus = makeLightCone(T.flashlight.focusColor, 24, 2.2, 0.16)
    game.scene.add(this.cone, this.coneFocus)
  }

  toggle() { this.on = !this.on; this.game.audio.play('click') }

  /** Troca por uma pilha nova (só se tiver e se a bateria estiver abaixo de 100). */
  swapBattery(): boolean {
    if (this.spares <= 0 || this.battery >= T.flashlight.battery - 0.5) return false
    this.spares--; this.battery = T.flashlight.battery; this.game.audio.play('battery'); return true
  }

  update(dt: number) {
    const g = this.game, p = g.player, inp = g.input, F = T.flashlight
    if (inp.wasPressed('flashlightToggle')) this.toggle()
    const wantFocus = (inp.rmb || g.debug.forceFocus) && this.on && this.battery > 0 && !p.dead
    if (wantFocus && !this.focusing) g.audio.play('focusStart')
    this.focusing = wantFocus
    if (this.focusing && !T.debug.infiniteBattery) {
      this.battery = Math.max(0, this.battery - F.focusDrainPerSecond * dt)
      if (this.battery <= 0) { g.audio.play('batteryDead'); if (!this.swapBattery()) this.focusing = false }
    }
    // Troca automática quando zera (se tiver pilha)
    if (this.battery <= 0 && this.spares > 0) this.swapBattery()

    // Posição: mão do jogador; direção: para onde a câmera aponta (ponto a 30m)
    p.handAnchor.getWorldPosition(this.origin)
    const camDir = g.cam.forward(new THREE.Vector3())
    // Ponto de mira real: o que a mira da câmera acerta (inimigo > terreno > 30 m). Assim a lanterna
    // (que sai do ombro) converge exatamente no alvo em vez de num ponto paralelo à câmera.
    const camPos = g.cam.cam.position
    let aim: THREE.Vector3 | null = null
    const hit = g.enemies.raycast(camPos, camDir, 45)
    if (hit) aim = hit.point
    else for (let d = 3; d <= 30; d += 2) { const q = camPos.clone().addScaledVector(camDir, d); if (q.y < g.world.h(q.x, q.z)) { aim = q; break } }
    if (!aim) aim = camPos.clone().addScaledVector(camDir, 30)
    this.dir.copy(aim).sub(this.origin).normalize()
    this.spot.position.copy(this.origin)
    this.spot.target.position.copy(aim)

    const tAngle = THREE.MathUtils.degToRad((this.focusing ? F.focusConeDeg : F.normalConeDeg) / 2)
    const tInt = !this.on ? 0 : this.focusing ? F.focusIntensity : F.normalIntensity
    this.curAngle = damp(this.curAngle, tAngle, 14, dt)
    this.curInt = damp(this.curInt, tInt, 14, dt)
    this.curColor.lerp(this.focusing ? this.focusColor : this.normalColor, 1 - Math.exp(-10 * dt))
    const battK = this.battery < F.lowBatteryWarn ? 0.6 + 0.4 * Math.abs(Math.sin(performance.now() * 0.02)) : 1
    this.spot.angle = this.curAngle; this.spot.intensity = this.curInt * battK; this.spot.color.copy(this.curColor)
    this.spot.distance = this.focusing ? F.focusRange : F.normalRange

    // Cones falsos alinhados ao feixe
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), this.dir)
    for (const c of [this.cone, this.coneFocus]) { c.position.copy(this.origin); c.quaternion.copy(q) }
    const cm = this.cone.material as THREE.MeshBasicMaterial, fm = this.coneFocus.material as THREE.MeshBasicMaterial
    cm.opacity = this.on ? (this.focusing ? 0.03 : 0.075) * battK : 0
    fm.opacity = this.on && this.focusing ? 0.14 + 0.1 * this.burnIntensity : 0
    this.cone.scale.setScalar(1)
    this.burnIntensity = damp(this.burnIntensity, 0, 4, dt)
  }

  /** Fator de queima (0..1) para um ponto do mundo no modo foco. */
  burnFactor(target: THREE.Vector3): number {
    if (!this.focusing || !this.on) return 0
    const to = target.clone().sub(this.origin)
    const d = to.length(); if (d < 0.01) return 1
    to.divideScalar(d)
    const ang = Math.acos(clamp(to.dot(this.dir), -1, 1))
    const half = THREE.MathUtils.degToRad(T.flashlight.focusHitHalfAngleDeg)
    if (ang > half) return 0
    const angK = 1 - smoothstep(half * 0.6, half, ang)
    const distK = 1 - smoothstep(T.flashlight.burnFullRange, T.flashlight.burnZeroRange, d)
    return angK * distK
  }
  /** Ponto está dentro do feixe normal (para IA hesitar)? */
  inNormalBeam(target: THREE.Vector3): boolean {
    if (!this.on) return false
    const to = target.clone().sub(this.origin); const d = to.length(); to.divideScalar(d || 1)
    const ang = Math.acos(clamp(to.dot(this.dir), -1, 1))
    return ang < THREE.MathUtils.degToRad(T.flashlight.normalConeDeg / 2) && d < T.flashlight.normalRange * 0.6
  }
  notifyBurn(k: number) { this.burnIntensity = Math.max(this.burnIntensity, k) }
}
