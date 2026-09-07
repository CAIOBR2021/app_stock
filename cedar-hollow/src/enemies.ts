import * as THREE from 'three'
import { T } from './tuning'
import { clamp, damp } from './util'
import type { Game } from './game'

export type EnemyKind = 'lumberjack' | 'thrower' | 'brute' | 'crows' | 'possessed' | 'shadowKing'
export type EnemyState = 'spawning' | 'idle' | 'chase' | 'circle' | 'attack' | 'retreat' | 'stagger' | 'dying' | 'dead' | 'flee' | 'lurk' | 'windup'

const DARK = new THREE.Color(0.02, 0.03, 0.06)
const EMBER = new THREE.Color(1.0, 0.65, 0.25)
const WHITE = new THREE.Color(1, 0.95, 0.85)
const SPARK = new THREE.Color(0.7, 0.8, 1.0)

export class Enemy {
  pos = new THREE.Vector3()
  yaw = 0
  state: EnemyState = 'spawning'
  stateT = 0
  shield: number
  maxShield: number
  hp: number
  maxHp: number
  speed: number
  radius: number
  height: number
  group = new THREE.Group()
  aura: THREE.Mesh
  parts: { legL?: THREE.Object3D; legR?: THREE.Object3D; armR?: THREE.Object3D; body?: THREE.Object3D; crows?: THREE.Object3D[] } = {}
  burnT = 0          // tempo desde a última queimada
  burning = 0        // fator de queima no frame
  attackCd = 0
  circleDir = 1
  throwT = 0
  walk = 0
  flinch = 0
  alive = true
  spawnY = 0
  crowPhase: number[] = []
  summonT = 0
  boundsRect?: { x0: number; x1: number; z0: number; z1: number }
  chargeDir = new THREE.Vector3()
  fleeFrom = new THREE.Vector3()
  onDeath?: () => void

  constructor(public kind: EnemyKind, x: number, z: number, public game: Game) {
    const E = T.enemies
    const def: any = (E as any)[kind === 'crows' ? 'crowFlock' : kind]
    this.shield = this.maxShield = def.shield; this.hp = this.maxHp = def.hp
    this.speed = def.speed; this.radius = def.radius; this.height = def.height ?? 1.5
    this.pos.set(x, game.world.h(x, z), z)
    this.buildMesh()
    this.aura = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8, depthWrite: false }))
    const ar = kind === 'possessed' ? 2.8 : kind === 'crows' ? 2.0 : this.height * 0.62
    this.aura.scale.set(ar * 0.9, kind === 'possessed' ? ar * 0.6 : ar, ar * 0.9)
    this.aura.position.y = kind === 'crows' ? 0 : this.height * 0.5
    this.group.add(this.aura)
    game.scene.add(this.group)
    this.group.position.copy(this.pos)
  }

  private buildMesh() {
    const g = this.group, k = this.kind
    const skin = new THREE.MeshLambertMaterial({ color: 0x232a33 })
    const cloth = new THREE.MeshLambertMaterial({ color: 0x151a21 })
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xcfd8e0 })
    if (k === 'crows') {
      const crows: THREE.Object3D[] = []
      const geo = new THREE.ConeGeometry(0.12, 0.5, 4); geo.rotateX(Math.PI / 2)
      for (let i = 0; i < T.enemies.crowFlock.count; i++) {
        const c = new THREE.Mesh(geo, cloth)
        const wl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.15), cloth); wl.position.x = -0.25; c.add(wl)
        const wr = wl.clone(); wr.position.x = 0.25; c.add(wr)
        g.add(c); crows.push(c); this.crowPhase.push(Math.random() * Math.PI * 2)
      }
      this.parts.crows = crows
      return
    }
    if (k === 'possessed') {
      const yellow = new THREE.MeshLambertMaterial({ color: 0x8a6a1a })
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.2), yellow); body.position.y = 1.4; g.add(body)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.8), new THREE.MeshLambertMaterial({ color: 0x3a3a3a })); cab.position.set(-0.4, 2.9, 0); g.add(cab)
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 3.4), new THREE.MeshLambertMaterial({ color: 0x555a60 })); blade.position.set(2.2, 0.9, 0); g.add(blade)
      const trackL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.6), cloth); trackL.position.set(0, 0.45, 1.3); g.add(trackL)
      const trackR = trackL.clone(); trackR.position.z = -1.3; g.add(trackR)
      const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3020 })); lampL.position.set(0.5, 3.2, 0.6); g.add(lampL)
      const lampR = lampL.clone(); lampR.position.z = -0.6; g.add(lampR)
      this.parts.body = body
      return
    }
    const s = k === 'brute' ? 1.35 : k === 'shadowKing' ? 1.9 : k === 'thrower' ? 1.08 : 1
    const legGeo = new THREE.CylinderGeometry(0.1 * s, 0.09 * s, 0.85 * s, 6); legGeo.translate(0, -0.42 * s, 0)
    const legL = new THREE.Mesh(legGeo, cloth); legL.position.set(-0.14 * s, 0.85 * s, 0); g.add(legL)
    const legR = new THREE.Mesh(legGeo, cloth); legR.position.set(0.14 * s, 0.85 * s, 0); g.add(legR)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27 * s * (k === 'brute' ? 1.25 : 1), 0.5 * s, 4, 10), skin); body.position.y = 1.2 * s; g.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 10), skin); head.position.y = 1.68 * s; g.add(head)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025 * s, 6, 6), eyeMat); eyeL.position.set(-0.06 * s, 1.7 * s, 0.14 * s); g.add(eyeL)
    const eyeR = eyeL.clone(); eyeR.position.x = 0.06 * s; g.add(eyeR)
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07 * s, 0.5 * s, 3, 6), skin); armL.position.set(-0.38 * s, 1.15 * s, 0); g.add(armL)
    const armR = new THREE.Group(); armR.position.set(0.38 * s, 1.4 * s, 0); g.add(armR)
    const armRm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07 * s, 0.5 * s, 3, 6), skin); armRm.position.y = -0.25 * s; armR.add(armRm)
    if (k === 'lumberjack') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), new THREE.MeshLambertMaterial({ color: 0x4a3524 })); handle.position.set(0.05, -0.4, 0.2); handle.rotation.x = 1.2; armR.add(handle)
      const axe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.2), new THREE.MeshLambertMaterial({ color: 0x8a8f96 })); axe.position.set(0.05, -0.5, 0.62); armR.add(axe)
    } else if (k === 'thrower') {
      const saw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 12), new THREE.MeshLambertMaterial({ color: 0x8a8f96 })); saw.position.set(0.05, -0.55, 0.15); armR.add(saw)
    } else if (k === 'brute') {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 8), new THREE.MeshLambertMaterial({ color: 0x4a3524 })); log.position.set(0.1, -0.5, 0.3); log.rotation.x = 1.3; armR.add(log)
    } else if (k === 'shadowKing') {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.5 * s, 5, 1, true), cloth); crown.position.y = 1.95 * s; g.add(crown)
      const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 1.6 * s, 8, 1, true), cloth); cloak.position.y = 0.9 * s; g.add(cloak)
    }
    this.parts = { legL, legR, armR, body }
  }

  get vulnerable() { return this.shield <= 0 && this.alive }
  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + (this.kind === 'crows' ? 0 : this.height * 0.5), this.pos.z) }

  setState(s: EnemyState) { this.state = s; this.stateT = 0 }

  /** Aplica queima ao escudo. Retorna true se estourou. */
  burn(amount: number, source: 'flashlight' | 'flare' | 'flood' | 'lighthouse'): boolean {
    if (!this.alive || this.state === 'spawning' || this.state === 'dying') return false
    if (this.shield <= 0) return false
    if (this.kind === 'shadowKing' && source === 'flashlight') amount *= T.enemies.shadowKingFlashlightMul
    this.shield -= amount; this.burnT = 0
    this.burning = Math.max(this.burning, clamp(amount / 3, 0.2, 1))
    if (this.shield <= 0) { this.shield = 0; this.onShieldBroken(); return true }
    return false
  }

  private onShieldBroken() {
    const g = this.game
    g.audio.play('burst'); g.postfx.flash = Math.max(g.postfx.flash, 0.9); g.cam.shake(0.3)
    g.particles.burst(this.center, 90, 6, 0.9, 0.9, WHITE, 2)
    g.particles.burst(this.center, 40, 2.5, 1.6, 1.2, EMBER, 1)
    if (this.kind === 'crows' || this.kind === 'possessed' || this.kind === 'shadowKing') { this.kill(); return }
    this.setState('stagger')
    g.stats.shieldsBroken++
  }

  /** Dano de bala. Só conta se estiver vulnerável. */
  shoot(point: THREE.Vector3, dir: THREE.Vector3): boolean {
    const g = this.game
    if (!this.vulnerable) {
      // Faísca + ricochete: nada de dano. Precisa ser óbvio.
      g.audio.play('ricochet'); g.particles.burst(point, 24, 7, 0.35, 0.45, SPARK, 8)
      g.particles.burst(point, 8, 1.5, 0.5, 0.9, new THREE.Color(0.2, 0.25, 0.45))
      g.revolver.shieldHitFlash = 1.2; g.hud.immuneFlash = 1.6; g.revolver.shotsWasted++
      this.flinch = 0.4
      return false
    }
    this.hp -= T.revolver.damage
    g.audio.play('hitFlesh'); g.particles.burst(point, 30, 4, 0.6, 0.7, DARK.clone().lerp(new THREE.Color(0.35, 0.05, 0.1), 0.6), 5)
    this.flinch = 1
    // knockback leve
    this.pos.addScaledVector(dir.clone().setY(0).normalize(), 0.35)
    if (this.hp <= 0) this.kill()
    return true
  }

  kill() {
    if (!this.alive) return
    this.alive = false; this.setState('dying')
    this.game.audio.play('enemyDie'); this.game.stats.kills++
    this.game.particles.burst(this.center, 70, 3, 1.4, 1.3, EMBER, 1.5)
    this.game.particles.burst(this.center, 50, 2, 1.8, 1.0, DARK)
    this.onDeath?.()
  }

  update(dt: number) {
    const g = this.game, p = g.player, E = T.enemies
    this.stateT += dt; this.burnT += dt; this.attackCd -= dt; this.flinch = Math.max(0, this.flinch - dt * 2)
    const toP = new THREE.Vector3().subVectors(p.pos, this.pos); toP.y = 0
    const dist = toP.length(); const dirP = toP.clone().normalize()

    // Regeneração de escudo se ficar sem ser queimado (obriga a manter o foco)
    if (this.alive && this.shield > 0 && this.shield < this.maxShield && this.burnT > E.shieldRegenDelay && this.state !== 'stagger' && this.kind !== 'shadowKing' && this.kind !== 'possessed' && this.kind !== 'crows') {
      const rate = this.kind === 'brute' ? E.bruteShieldRegenPerSecond : E.shieldRegenPerSecond
      this.shield = Math.min(this.maxShield, this.shield + rate * dt)
    }

    // Fumaça da aura
    const shieldFrac = this.maxShield > 0 ? this.shield / this.maxShield : 0
    if (this.alive && this.state !== 'spawning' && Math.random() < (0.25 + this.burning * 1.5) * (this.kind === 'possessed' ? 3 : 1)) {
      g.particles.smoke(this.center, this.burning > 0.05 ? 3 : 1, this.burning > 0.05 ? EMBER.clone().lerp(DARK, 0.4) : DARK, this.radius)
    }
    const auraMat = this.aura.material as THREE.MeshBasicMaterial
    auraMat.opacity = damp(auraMat.opacity, this.alive ? 0.15 + 0.7 * shieldFrac : 0, 6, dt)
    auraMat.color.setRGB(0, 0, 0).lerp(new THREE.Color(0.35, 0.18, 0.05), this.burning * 0.8)
    const pulse = 1 + Math.sin(g.time * 6 + this.pos.x) * 0.06 + this.burning * 0.25 * Math.random()
    this.aura.scale.multiplyScalar(1 / (this.aura.userData.lastPulse ?? 1)).multiplyScalar(pulse); this.aura.userData.lastPulse = pulse

    switch (this.state) {
      case 'spawning': {
        const k = clamp(this.stateT / E.spawnRiseSeconds, 0, 1)
        this.spawnY = -this.height * (1 - k)
        if (Math.random() < 0.7) g.particles.smoke(new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z), 2, DARK, this.radius * 1.5)
        if (k >= 1) { this.setState(this.kind === 'thrower' ? 'chase' : this.kind === 'possessed' ? 'circle' : 'chase'); if (this.kind !== 'crows') g.audio.play('growl', { pan: g.panFor(this.pos) }) }
        break
      }
      case 'idle': if (dist < E.sightRange) this.setState('chase'); break
      case 'dying': {
        const k = 1 - clamp(this.stateT / 1.0, 0, 1)
        this.group.scale.setScalar(Math.max(0.01, k))
        if (this.stateT > 1.0) { this.state = 'dead'; g.scene.remove(this.group) }
        break
      }
      case 'stagger': {
        this.parts.body && (this.parts.body.rotation.x = -0.5 + Math.sin(this.stateT * 40) * 0.08)
        if (this.stateT > E.staggerSeconds) {
          this.parts.body && (this.parts.body.rotation.x = 0)
          this.shield = this.maxShield * E.shieldAfterStagger; this.burnT = 0
          this.setState('chase')
        }
        break
      }
      case 'flee': {
        const away = new THREE.Vector3().subVectors(this.pos, this.fleeFrom).setY(0).normalize()
        this.move(away, this.speed * 1.2, dt)
        if (this.stateT > 2.5 || this.pos.distanceTo(this.fleeFrom) > T.flare.radius + 6) this.setState('chase')
        break
      }
      default: this.updateBehavior(dt, dist, dirP); break
    }

    // Animação básica
    this.animate(dt)
    this.burning = Math.max(0, this.burning - dt * 3)
    this.group.position.set(this.pos.x, this.pos.y + this.spawnY, this.pos.z)
    if (this.kind !== 'crows') this.group.rotation.y = damp(this.group.rotation.y, this.yaw, 10, dt)
  }

  private updateBehavior(dt: number, dist: number, dirP: THREE.Vector3) {
    const g = this.game, p = g.player, E = T.enemies
    const kind = this.kind
    // ---- Corvos ----
    if (kind === 'crows') {
      const orbitR = 7
      if (this.state === 'chase' || this.state === 'circle') {
        const a = g.time * 0.9 + this.circleDir
        const target = new THREE.Vector3(p.pos.x + Math.cos(a) * orbitR, 0, p.pos.z + Math.sin(a) * orbitR)
        const d = target.sub(this.pos).setY(0)
        this.pos.addScaledVector(d.normalize(), Math.min(d.length(), this.speed * dt))
        this.pos.y = damp(this.pos.y, g.world.h(this.pos.x, this.pos.z) + 3.5, 3, dt)
        if (this.stateT > 3.5 && this.attackCd <= 0) { this.setState('attack'); this.chargeDir.subVectors(p.pos, this.pos).setY(0).normalize(); g.audio.play('crow') }
      } else if (this.state === 'attack') {
        this.pos.addScaledVector(this.chargeDir, this.speed * 1.4 * dt)
        const th = g.world.h(this.pos.x, this.pos.z)
        this.pos.y = damp(this.pos.y, th + (this.stateT < 0.8 ? 1.2 : 4), 4, dt)
        if (this.stateT > 0.2 && this.stateT < 1.2 && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.6 && this.attackCd <= 0) {
          this.attackCd = 2.5; p.takeDamage(E.crowFlock.damage, this.pos.x, this.pos.z); g.audio.play('crow')
        }
        if (this.stateT > 2.2) { this.setState('chase'); this.attackCd = 1.0 }
      }
      return
    }
    // ---- Escavadeira possuída (set piece) ----
    if (kind === 'possessed') {
      if (this.state === 'circle') {
        // Espera rugindo, mira no jogador
        this.yaw = damp(this.yaw, Math.atan2(dirP.x, dirP.z) - Math.PI / 2, 2, dt)
        if (this.stateT > 1.6) {
          this.setState('attack'); this.chargeDir.copy(dirP); g.audio.play('rumble'); g.cam.shake(0.5)
          this.yaw = Math.atan2(this.chargeDir.x, this.chargeDir.z) - Math.PI / 2
        }
      } else if (this.state === 'attack') {
        const next = this.pos.clone().addScaledVector(this.chargeDir, this.speed * dt)
        const b = this.boundsRect
        if (b) { next.x = clamp(next.x, b.x0, b.x1); next.z = clamp(next.z, b.z0, b.z1) }
        // Não entra em luz segura
        if (!g.world.havenAt(next.x, next.z, 1.5)) this.pos.copy(next)
        else { this.setState('circle'); this.stateT = -0.5 }
        this.pos.y = g.world.h(this.pos.x, this.pos.z)
        if (Math.random() < 0.5) g.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.3, this.pos.z), 2, 1.5, 0.6, 0.5, new THREE.Color(0.3, 0.25, 0.2), 3)
        if (dist < this.radius + 0.6 && this.attackCd <= 0) { this.attackCd = 1.5; p.takeDamage(T.enemies.possessed.damage, this.pos.x, this.pos.z); g.cam.shake(0.8) }
        if (this.stateT > 2.4) this.setState('circle')
      }
      if (this.state !== 'attack') this.pos.y = g.world.h(this.pos.x, this.pos.z)
      return
    }
    // ---- Humanoides ----
    const inHaven = p.inHaven
    const def: any = (E as any)[kind]
    if (kind === 'shadowKing') {
      this.summonT += dt
      if (this.summonT > E.shadowKingSummonInterval && g.enemies.aliveCount('lumberjack') < 3) { this.summonT = 0; g.enemies.summonNearPlayer('lumberjack', { behind: true }); g.audio.play('growl', { pan: g.panFor(this.pos) }) }
    }
    const lightMul = this.burning > 0.05 ? T.flashlight.focusSlowMul : g.flashlight.inNormalBeam(this.center) ? T.flashlight.normalBeamSlowMul : 1
    const spd = this.speed * lightMul * (this.flinch > 0 ? 0.3 : 1)
    this.yaw = damp(this.yaw, Math.atan2(dirP.x, dirP.z), 8, dt)

    if (kind === 'thrower') {
      // Mantém distância e arremessa
      const td = def as typeof T.enemies.thrower
      if (this.state === 'windup') {
        if (this.stateT > 0.75) { this.throwProjectile(); this.setState('chase'); this.throwT = 0 }
        return
      }
      this.throwT += dt
      let mv = new THREE.Vector3()
      if (dist < td.keepDistMin) mv.copy(dirP).negate()
      else if (dist > td.keepDistMax) mv.copy(dirP)
      else mv.set(-dirP.z, 0, dirP.x).multiplyScalar(this.circleDir)
      if (inHaven) { mv.copy(dirP).negate().multiplyScalar(dist < T.haven.approachRetreatDistance + 2 ? 1 : 0) }
      this.move(mv, spd, dt)
      if (this.throwT > td.throwInterval && dist < td.keepDistMax + 6 && dist > 3 && !inHaven && !g.world.grid.blocked(this.pos.x, this.pos.z, p.pos.x, p.pos.z, 'fence')) { this.setState('windup'); g.audio.play('growl', { pan: g.panFor(this.pos) }) }
      if (Math.random() < dt * 0.3) this.circleDir *= -1
      return
    }

    // Lenhador / Bruto / Rei Sombrio: Chase → Circle → Attack → Retreat
    const range = def.attackRange as number
    if (inHaven) {
      // Recuam da luz e rondam à distância
      if (this.state !== 'lurk') this.setState('lurk')
      const hv = g.world.havenAt(p.pos.x, p.pos.z, 0)!
      const away = new THREE.Vector3(this.pos.x - hv.pos.x, 0, this.pos.z - hv.pos.z)
      const d = away.length() || 1; away.divideScalar(d)
      const want = T.haven.approachRetreatDistance + (hv.radius - T.haven.lampRadius)
      const mv = new THREE.Vector3()
      if (d < want - 0.5) mv.copy(away).multiplyScalar(E.lightRetreatSpeedMul)
      else if (d > want + 2) mv.copy(away).negate().multiplyScalar(0.6)
      else mv.set(-away.z, 0, away.x).multiplyScalar(0.5 * this.circleDir)
      this.move(mv, spd, dt)
      if (Math.random() < dt * 0.4) this.circleDir *= -1
      return
    }
    if (this.state === 'lurk') this.setState('chase')
    switch (this.state) {
      case 'chase': {
        this.move(dirP, spd, dt)
        if (dist < E.circleDistance + 0.5) { this.setState('circle'); this.circleDir = Math.random() < 0.5 ? -1 : 1; this.stateT = -(E.circleSeconds[0] + Math.random() * (E.circleSeconds[1] - E.circleSeconds[0])) }
        break
      }
      case 'circle': {
        const tang = new THREE.Vector3(-dirP.z, 0, dirP.x).multiplyScalar(this.circleDir)
        const mv = tang.clone().addScaledVector(dirP, dist > E.circleDistance ? 0.7 : -0.3)
        this.move(mv.normalize(), spd * 0.7, dt)
        if (this.stateT >= 0 && this.attackCd <= 0 && dist < range + 1.2) { this.setState('windup'); g.audio.play('growl', { pan: g.panFor(this.pos), vol: 0.7 }) }
        else if (dist > E.circleDistance + 3) this.setState('chase')
        break
      }
      case 'windup': {
        // Telegrafa o golpe: braço sobe
        if (this.parts.armR) this.parts.armR.rotation.x = -2.2
        this.move(dirP, spd * 0.5, dt)
        if (this.stateT > def.windup) {
          this.setState('attack'); this.attackCd = def.attackCooldown
          if (this.parts.armR) this.parts.armR.rotation.x = 0.9
          const d2 = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z)
          if (d2 < range + 0.4) { const r = p.takeDamage(def.damage, this.pos.x, this.pos.z); if (r === 'hit') g.postfx.hurt = 1 }
          else g.audio.play('dodge', { vol: 0.4 })
        }
        break
      }
      case 'attack': {
        if (this.stateT > 0.5) { if (this.parts.armR) this.parts.armR.rotation.x = 0; this.setState(dist < E.circleDistance + 1 ? 'circle' : 'chase'); this.stateT = -0.3 }
        break
      }
      case 'retreat': {
        this.move(dirP.clone().negate(), spd * E.lightRetreatSpeedMul, dt)
        if (this.stateT > 0.9) this.setState('chase')
        break
      }
      default: this.setState('chase')
    }
  }

  private throwProjectile() {
    const g = this.game, p = g.player
    const from = new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z)
    // Prevê onde o jogador estará
    const lead = p.moveDir.clone().multiplyScalar(p.speedNow * 0.35)
    const target = new THREE.Vector3(p.pos.x + lead.x, p.pos.y + 1.0, p.pos.z + lead.z)
    const dir = target.sub(from).normalize()
    g.enemies.spawnProjectile(from, dir.multiplyScalar(T.enemies.thrower.projectileSpeed), T.enemies.thrower.damage)
    g.audio.play('axeThrow', { pan: g.panFor(this.pos) })
    if (this.parts.armR) this.parts.armR.rotation.x = 0.5
  }

  /** Move respeitando colisão, inclinação, luz segura e separação entre inimigos. */
  move(dir: THREE.Vector3, speed: number, dt: number) {
    if (dir.lengthSq() < 1e-6) return
    const g = this.game, w = g.world
    const d = dir.clone().setY(0).normalize()
    // Separação
    for (const o of g.enemies.list) {
      if (o === this || !o.alive || o.kind === 'crows') continue
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, dd = Math.hypot(dx, dz)
      const min = this.radius + o.radius + 0.2
      if (dd < min && dd > 1e-3) d.x += (dx / dd) * (min - dd) * 2; d.z += (dz / dd) * (min - dd) * 2
    }
    d.normalize()
    let nx = this.pos.x + d.x * speed * dt, nz = this.pos.z + d.z * speed * dt
    // Não entra na luz: se a próxima posição está num haven, desvia tangencialmente / recua
    const hv = w.havenAt(nx, nz, T.haven.enemyKeepOut)
    if (hv) {
      const ax = this.pos.x - hv.pos.x, az = this.pos.z - hv.pos.z, L = Math.hypot(ax, az) || 1
      const tx = -az / L * this.circleDir, tz = ax / L * this.circleDir
      nx = this.pos.x + (tx * 0.8 + ax / L * 0.4) * speed * dt; nz = this.pos.z + (tz * 0.8 + az / L * 0.4) * speed * dt
      if (this.state === 'chase' && this.stateT > 1.5) { this.setState('retreat') }
    }
    ;[nx, nz] = w.grid.resolve(nx, nz, this.radius)
    const h0 = w.h(this.pos.x, this.pos.z), h1 = w.h(nx, nz), dd = Math.hypot(nx - this.pos.x, nz - this.pos.z)
    if (dd > 1e-5 && Math.abs(h1 - h0) / dd > T.player.maxSlope) {
      // tenta cada eixo
      const [sx] = w.grid.resolve(this.pos.x + d.x * speed * dt, this.pos.z, this.radius)
      if (Math.abs(w.h(sx, this.pos.z) - h0) / Math.max(1e-5, Math.abs(sx - this.pos.x)) <= T.player.maxSlope) { this.pos.x = sx }
      else { const [, sz] = w.grid.resolve(this.pos.x, this.pos.z + d.z * speed * dt, this.radius); if (Math.abs(w.h(this.pos.x, sz) - h0) / Math.max(1e-5, Math.abs(sz - this.pos.z)) <= T.player.maxSlope) this.pos.z = sz }
      this.pos.y = w.h(this.pos.x, this.pos.z); return
    }
    this.pos.set(nx, h1, nz)
    this.walk += speed * dt * 2.2
  }

  private animate(dt: number) {
    const P = this.parts
    if (this.kind === 'crows' && P.crows) {
      P.crows.forEach((c, i) => {
        const ph = this.crowPhase[i], t = this.game.time * 2 + ph
        const r = 1.4 + Math.sin(ph * 3) * 0.6
        c.position.set(Math.cos(t + ph) * r, Math.sin(t * 1.7 + ph) * 0.8, Math.sin(t + ph) * r)
        c.rotation.y = -(t + ph) + Math.PI / 2
        c.children.forEach((w, j) => (w.rotation.z = Math.sin(this.game.time * 22 + ph) * 0.7 * (j === 0 ? 1 : -1)))
      })
      return
    }
    if (this.kind === 'possessed') { if (P.body) P.body.rotation.z = Math.sin(this.game.time * 30) * 0.02 * (this.state === 'attack' ? 3 : 1); return }
    if (this.state === 'dying' || this.state === 'spawning') return
    const sw = Math.sin(this.walk) * 0.55
    if (P.legL) P.legL.rotation.x = sw; if (P.legR) P.legR.rotation.x = -sw
    if (P.body) {
      if (this.state !== 'stagger') P.body.rotation.x = this.burning > 0.05 ? 0.25 : 0.05
      P.body.rotation.z = this.flinch * Math.sin(this.game.time * 50) * 0.15
    }
    if (P.armR && this.state !== 'windup' && this.state !== 'attack') P.armR.rotation.x = this.burning > 0.05 ? -2.6 : damp(P.armR.rotation.x, 0.2, 8, dt)
  }
}

// ---------------- Projéteis (machados / serras) ----------------
interface Projectile { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; damage: number; dodged: boolean }

interface Pending { kind: EnemyKind; x: number; z: number; t: number; opts: SpawnOpts }
export interface SpawnOpts { onDeath?: () => void; bounds?: { x0: number; x1: number; z0: number; z1: number }; behind?: boolean; noWhisper?: boolean }

export class EnemyManager {
  list: Enemy[] = []
  projectiles: Projectile[] = []
  pending: Pending[] = []
  private projGeo = new THREE.BoxGeometry(0.12, 0.5, 0.5)
  private projMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 })
  constructor(private game: Game) {}

  aliveCount(kind?: EnemyKind) { return this.list.filter((e) => e.alive && (!kind || e.kind === kind)).length }
  get threats() { return this.list.filter((e) => e.alive && e.state !== 'spawning') }

  /** Agenda materialização com sussurro direcional antes. */
  summonAt(kind: EnemyKind, x: number, z: number, opts: SpawnOpts = {}) {
    const g = this.game
    const lead = opts.noWhisper ? 0.05 : T.enemies.whisperLeadSeconds
    if (!opts.noWhisper) g.audio.whisper(g.panFor(new THREE.Vector3(x, 0, z)), g.isBehind(new THREE.Vector3(x, 0, z)))
    this.pending.push({ kind, x, z, t: lead, opts })
  }

  /** Materializa atrás ou nas laterais do jogador, nunca só de frente. */
  summonNearPlayer(kind: EnemyKind, opts: SpawnOpts = {}) {
    const g = this.game, p = g.player, w = g.world
    const [dmin, dmax] = T.enemies.spawnDistance
    for (let i = 0; i < 24; i++) {
      // ângulo relativo à direção da câmera: atrás (±70° em torno de 180°) ou laterais (±25° em torno de ±90°)
      const behind = opts.behind ?? Math.random() < 0.55
      const rel = behind ? Math.PI + (Math.random() - 0.5) * 2.4 : (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.9)
      const a = p.yaw + Math.PI + rel  // yaw da câmera aponta para -z; frente = yaw+PI em coordenadas atan2(x,z)
      const d = dmin + Math.random() * (dmax - dmin)
      const x = p.pos.x + Math.sin(a) * d, z = p.pos.z + Math.cos(a) * d
      if (w.havenAt(x, z, 3)) continue
      if (w.h(x, z) < -1) continue
      if (Math.abs(w.h(x, z) - p.pos.y) > 6) continue
      const [rx, rz] = w.grid.resolve(x, z, 0.6)
      if (Math.hypot(rx - x, rz - z) > 2) continue
      this.summonAt(kind, rx, rz, opts); return true
    }
    // fallback: qualquer direção
    const a = Math.random() * Math.PI * 2, d = dmin
    this.summonAt(kind, p.pos.x + Math.sin(a) * d, p.pos.z + Math.cos(a) * d, opts); return true
  }

  spawnNow(kind: EnemyKind, x: number, z: number, opts: SpawnOpts = {}) {
    const e = new Enemy(kind, x, z, this.game)
    e.onDeath = opts.onDeath; e.boundsRect = opts.bounds
    if (kind === 'crows') { e.pos.y += 4; e.setState('chase'); e.spawnY = 0 }
    this.list.push(e); return e
  }

  spawnProjectile(from: THREE.Vector3, vel: THREE.Vector3, damage: number) {
    const m = new THREE.Mesh(this.projGeo, this.projMat); m.position.copy(from); this.game.scene.add(m)
    this.projectiles.push({ mesh: m, vel, life: 3.5, damage, dodged: false })
  }

  raycast(origin: THREE.Vector3, dir: THREE.Vector3, range: number): { enemy: Enemy; point: THREE.Vector3 } | null {
    let best: { enemy: Enemy; point: THREE.Vector3; t: number } | null = null
    for (const e of this.list) {
      if (!e.alive || e.state === 'spawning') continue
      const c = e.center, r = e.radius + T.revolver.hitRadius * (e.kind === 'possessed' ? 0.5 : 1) + (e.height > 2 ? 0.2 : 0)
      const oc = origin.clone().sub(c)
      const b = oc.dot(dir), cc = oc.dot(oc) - r * r
      const disc = b * b - cc
      if (disc < 0) continue
      const t = -b - Math.sqrt(disc)
      if (t < 0.3 || t > range) continue
      if (!best || t < best.t) best = { enemy: e, point: origin.clone().addScaledVector(dir, t), t }
    }
    return best ? { enemy: best.enemy, point: best.point } : null
  }

  onShot(e: Enemy, point: THREE.Vector3, dir: THREE.Vector3) { e.shoot(point, dir) }

  /** Faz todos os inimigos num raio fugirem (sinalizador). */
  repel(center: THREE.Vector3, radius: number) {
    for (const e of this.list) {
      if (!e.alive || e.kind === 'possessed') continue
      if (Math.hypot(e.pos.x - center.x, e.pos.z - center.z) < radius + e.radius) { e.fleeFrom.copy(center); e.setState('flee') }
    }
  }
  /** Luz de setor ligada: limpa quem estiver dentro. */
  purge(x: number, z: number, radius: number) {
    for (const e of this.list) if (e.alive && Math.hypot(e.pos.x - x, e.pos.z - z) < radius) { e.shield = 0; e.kill() }
  }

  clearAll() {
    for (const e of this.list) this.game.scene.remove(e.group)
    for (const p of this.projectiles) this.game.scene.remove(p.mesh)
    this.list = []; this.projectiles = []; this.pending = []
  }

  update(dt: number) {
    const g = this.game, p = g.player, fl = g.flashlight
    // Materializações pendentes
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const pd = this.pending[i]; pd.t -= dt
      if (pd.t <= 0) { this.pending.splice(i, 1); this.spawnNow(pd.kind, pd.x, pd.z, pd.opts) }
    }
    // Queima pelo foco / farol
    let burnFeedback = 0
    const lh = g.world.lighthouse
    for (const e of this.list) {
      if (!e.alive) continue
      const k = fl.burnFactor(e.center)
      if (k > 0) {
        const amt = T.flashlight.burnPerSecond * k * dt
        e.burn(amt, 'flashlight')
        burnFeedback = Math.max(burnFeedback, k * (e.kind === 'shadowKing' ? 0.3 : 1))
        if (Math.random() < k) g.particles.smoke(e.center, 2, EMBER, e.radius)
      }
      if (lh.on && e.kind !== 'crows') {
        // O feixe do farol varre e queima
        const dx = e.pos.x - lh.lampPos.x, dz = e.pos.z - lh.lampPos.z, d = Math.hypot(dx, dz)
        if (d < 90) {
          const a = Math.atan2(dx, dz)
          let diff = Math.abs(((a - lh.angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI)
          diff = Math.min(diff, Math.PI - diff) // feixe duplo
          if (diff < 0.16) { e.burn(T.enemies.lighthouseBurnPerSecond * dt, 'lighthouse'); g.particles.smoke(e.center, 3, WHITE, e.radius) }
        }
      }
    }
    fl.notifyBurn(burnFeedback)
    g.postfx.distort = Math.max(g.postfx.distort * 0.9, burnFeedback)
    // Atualiza inimigos
    for (const e of this.list) if (e.state !== 'dead') e.update(dt)
    this.list = this.list.filter((e) => e.state !== 'dead')
    // Projéteis
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i]
      pr.life -= dt; pr.vel.y -= 4 * dt
      pr.mesh.position.addScaledVector(pr.vel, dt); pr.mesh.rotation.x += dt * 20
      const m = pr.mesh.position
      const dx = m.x - p.pos.x, dz = m.z - p.pos.z, dy = m.y - (p.pos.y + 0.9)
      const near = Math.hypot(dx, dz, dy)
      let remove = false
      if (near < 0.75) {
        const r = p.takeDamage(pr.damage, m.x - pr.vel.x, m.z - pr.vel.z)
        if (r === 'hit') g.postfx.hurt = 1
        if (r !== 'dodged') remove = true
        else pr.dodged = true
      }
      if (m.y < g.world.h(m.x, m.z) || pr.life <= 0) { g.particles.burst(m, 6, 2, 0.4, 0.3, SPARK, 6); remove = true }
      if (remove) { g.scene.remove(pr.mesh); this.projectiles.splice(i, 1) }
    }
  }
}
