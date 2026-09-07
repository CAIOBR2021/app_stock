import * as THREE from 'three'
import { T } from './tuning'
import { clamp, damp } from './util'
import type { Game } from './game'

export class Player {
  pos = new THREE.Vector3()
  vel = new THREE.Vector3()
  yaw = 0          // direção da câmera (rad)
  pitch = 0.08
  health = T.player.maxHealth
  stamina = 1      // 0..1
  exhausted = false
  running = false
  moving = false
  moveDir = new THREE.Vector3()
  invuln = 0
  dodgeT = 0       // tempo restante da esquiva
  dodgeCd = 0
  dodgeDir = new THREE.Vector3()
  hurtFlash = 0
  dead = false
  inHaven = false
  bob = 0
  speedNow = 0
  group = new THREE.Group()
  handAnchor = new THREE.Object3D()
  bodyMesh: THREE.Mesh
  private tmp = new THREE.Vector3()

  constructor(private game: Game) {
    const g = this.group
    const jacket = new THREE.MeshLambertMaterial({ color: 0x5a4a32 })
    const pants = new THREE.MeshLambertMaterial({ color: 0x1f2630 })
    const skin = new THREE.MeshLambertMaterial({ color: 0xd8b294 })
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.85, 8), pants); legs.position.y = 0.42; g.add(legs)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 10), jacket); body.position.y = 1.15; g.add(body)
    this.bodyMesh = body
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skin); head.position.y = 1.62; g.add(head)
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 10, 0, Math.PI * 2, 0, 1.4), new THREE.MeshLambertMaterial({ color: 0x2b1d14 })); hair.position.y = 1.64; g.add(hair)
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6), jacket); armL.position.set(-0.36, 1.15, 0); g.add(armL)
    const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.5, 3, 6), jacket); armR.position.set(0.36, 1.25, 0.25); armR.rotation.x = -1.2; g.add(armR)
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.28, 8), new THREE.MeshLambertMaterial({ color: 0x9a9a9a })); torch.rotation.x = Math.PI / 2; torch.position.set(0.36, 1.35, 0.55); g.add(torch)
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.28), new THREE.MeshLambertMaterial({ color: 0x222222 })); gun.position.set(-0.3, 1.32, 0.5); g.add(gun)
    this.handAnchor.position.set(0.36, 1.36, 0.62); g.add(this.handAnchor)
    game.scene.add(g)
  }

  reset(pos: THREE.Vector3, yaw: number) {
    this.pos.copy(pos); this.pos.y = this.game.world.h(pos.x, pos.z)
    this.yaw = yaw; this.pitch = 0.08; this.health = T.player.maxHealth; this.stamina = 1; this.exhausted = false
    this.invuln = 0; this.dodgeT = 0; this.dodgeCd = 0; this.dead = false; this.hurtFlash = 0
    this.group.position.copy(this.pos); this.group.rotation.y = this.yaw
  }

  get headPos() { return this.tmp.set(this.pos.x, this.pos.y + 1.55, this.pos.z) }
  get dodgingIFrames() { return this.dodgeT > 0 && T.dodge.duration - this.dodgeT < T.dodge.iFrames }
  get invulnerable() { return this.invuln > 0 || this.dodgingIFrames || this.inHaven || T.debug.godMode }

  update(dt: number) {
    const g = this.game, inp = g.input, P = T.player
    if (this.dead) return
    // Olhar
    this.yaw -= inp.mouseDX * T.mouseSensitivity + inp.gpLook.x * T.gamepadSensitivity * dt
    this.pitch = clamp(this.pitch + inp.mouseDY * T.mouseSensitivity + inp.gpLook.y * T.gamepadSensitivity * dt, -0.55, 0.75)

    // Direção de movimento relativa à câmera
    let mx = (inp.isDown('right') ? 1 : 0) - (inp.isDown('left') ? 1 : 0) + inp.gpMove.x
    let mz = (inp.isDown('back') ? 1 : 0) - (inp.isDown('forward') ? 1 : 0) + inp.gpMove.y
    const len = Math.hypot(mx, mz)
    if (len > 1) { mx /= len; mz /= len }
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    this.moveDir.set(0, 0, 0).addScaledVector(fwd, -mz).addScaledVector(right, mx)
    this.moving = len > 0.05

    // Stamina / corrida
    const wantRun = inp.isDown('run') && this.moving && mz <= 0.2 && !g.flashlight.focusing
    if (this.exhausted && this.stamina > P.staminaMinToRun) this.exhausted = false
    this.running = wantRun && !this.exhausted && this.stamina > 0
    if (this.running) { this.stamina -= dt / P.staminaSeconds; if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true } }
    else this.stamina = Math.min(1, this.stamina + dt / P.staminaRecoverSeconds)

    // Esquiva
    this.dodgeCd = Math.max(0, this.dodgeCd - dt)
    if (inp.wasPressed('dodge') && this.dodgeCd <= 0 && this.dodgeT <= 0) {
      this.dodgeT = T.dodge.duration; this.dodgeCd = T.dodge.cooldown
      this.dodgeDir.copy(this.moving ? this.moveDir : fwd.clone().negate()).normalize()
      g.audio.play('dodge'); g.revolver.cancelReload()
    }

    let speed = 0
    const step = new THREE.Vector3()
    if (this.dodgeT > 0) {
      this.dodgeT -= dt
      const k = T.dodge.distance / T.dodge.duration
      step.copy(this.dodgeDir).multiplyScalar(k * dt)
      speed = k
    } else if (this.moving) {
      speed = this.running ? P.runSpeed : P.walkSpeed
      if (mz > 0.2) speed *= P.backpedalMul
      if (g.flashlight.focusing) speed *= 0.6
      if (g.revolver.reloading) speed *= 0.85
      step.copy(this.moveDir).multiplyScalar(speed * dt)
    }
    this.speedNow = damp(this.speedNow, speed, 8, dt)
    this.bob += this.speedNow * dt * 1.6

    // Aplicar movimento com bloqueio por inclinação e colisão
    this.tryMove(step.x, step.z)
    this.invuln = Math.max(0, this.invuln - dt)
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5)

    // Regeneração em safe haven
    if (this.inHaven && this.health < P.maxHealth) this.health = Math.min(P.maxHealth, this.health + T.haven.healPerSecond * dt)

    // Malha
    this.group.position.copy(this.pos)
    let faceYaw = this.yaw
    if (this.dodgeT > 0) faceYaw = Math.atan2(-this.dodgeDir.x, -this.dodgeDir.z)
    this.group.rotation.y = faceYaw
    this.group.position.y += Math.abs(Math.sin(this.bob)) * 0.04 * (this.speedNow / P.runSpeed)
    this.group.rotation.x = this.dodgeT > 0 ? -0.5 : 0
    this.group.rotation.z = Math.sin(this.bob) * 0.02 * (this.speedNow / P.runSpeed)
  }

  tryMove(dx: number, dz: number) {
    const w = this.game.world
    if (dx === 0 && dz === 0) { this.pos.y = w.h(this.pos.x, this.pos.z); return }
    let nx = this.pos.x + dx, nz = this.pos.z + dz
    ;[nx, nz] = w.grid.resolve(nx, nz, T.player.radius)
    const h0 = w.h(this.pos.x, this.pos.z), h1 = w.h(nx, nz)
    const d = Math.hypot(nx - this.pos.x, nz - this.pos.z)
    if (d > 1e-5 && Math.abs(h1 - h0) / d > T.player.maxSlope) {
      // tenta deslizar em cada eixo
      const tryAxis = (ax: number, az: number) => {
        let [sx, sz] = w.grid.resolve(this.pos.x + ax, this.pos.z + az, T.player.radius)
        const hh = w.h(sx, sz), dd = Math.hypot(sx - this.pos.x, sz - this.pos.z)
        if (dd > 1e-5 && Math.abs(hh - h0) / dd <= T.player.maxSlope) { this.pos.set(sx, hh, sz); return true }
        return false
      }
      if (!tryAxis(dx, 0)) tryAxis(0, dz)
      return
    }
    this.pos.set(nx, h1, nz)
  }

  takeDamage(amount: number, fromX?: number, fromZ?: number): 'hit' | 'dodged' | 'immune' {
    if (this.dead) return 'immune'
    if (this.inHaven) return 'immune'
    if (this.dodgingIFrames) { this.game.onNearMiss(); return 'dodged' }
    if (this.invuln > 0 || T.debug.godMode) return 'immune'
    this.health -= amount
    this.invuln = T.player.hurtInvulnSeconds
    this.hurtFlash = 1
    this.game.audio.play('hurt')
    this.game.cam.shake(0.35)
    if (fromX !== undefined && fromZ !== undefined) {
      const kx = this.pos.x - fromX, kz = this.pos.z - fromZ, L = Math.hypot(kx, kz) || 1
      this.tryMove((kx / L) * 0.6, (kz / L) * 0.6)
    }
    if (this.health <= 0) { this.health = 0; this.dead = true; this.game.onPlayerDeath() }
    return 'hit'
  }
}

// ---------------- Câmera ----------------
export class ThirdPersonCamera {
  cam: THREE.PerspectiveCamera
  shakeAmt = 0
  fovTarget = 58
  private pos = new THREE.Vector3()
  private look = new THREE.Vector3()
  private curDist = 3.2
  private curSide = 0.55
  recoil = 0
  constructor(private game: Game) {
    this.cam = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 900)
  }
  shake(a: number) { this.shakeAmt = Math.max(this.shakeAmt, a) }
  update(dt: number, timeScale: number) {
    const p = this.game.player, w = this.game.world
    const focusing = this.game.flashlight.focusing
    const distT = focusing ? 2.1 : p.running ? 3.6 : 3.1
    const sideT = focusing ? 0.7 : 0.55
    this.curDist = damp(this.curDist, distT, 6, dt)
    this.curSide = damp(this.curSide, sideT, 6, dt)
    this.recoil = damp(this.recoil, 0, 9, dt)
    const yaw = p.yaw, pitch = p.pitch - this.recoil
    const fwd = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    const pivot = new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z).addScaledVector(right, this.curSide)
    // Recuo da câmera com colisão de terreno
    let dist = this.curDist
    for (let d = 0.4; d <= this.curDist; d += 0.3) {
      const cx = pivot.x - fwd.x * d, cz = pivot.z - fwd.z * d, cy = pivot.y - fwd.y * d
      if (w.h(cx, cz) + 0.35 > cy) { dist = Math.max(0.4, d - 0.3); break }
    }
    const target = pivot.clone().addScaledVector(fwd, -dist)
    this.pos.copy(target)
    this.look.copy(pivot).addScaledVector(fwd, 12)
    if (this.shakeAmt > 0.001) {
      const s = this.shakeAmt
      this.pos.x += (Math.random() - 0.5) * s * 0.3; this.pos.y += (Math.random() - 0.5) * s * 0.3
      this.shakeAmt = damp(this.shakeAmt, 0, 7, dt)
    }
    this.cam.position.copy(this.pos)
    this.cam.lookAt(this.look)
    let fov = focusing ? 44 : p.running ? 66 : 58
    if (timeScale < 0.9) fov += 10
    this.cam.fov = damp(this.cam.fov, fov, 6, dt); this.cam.updateProjectionMatrix()
  }
  resize() { this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix() }
  forward(out = new THREE.Vector3()) { return this.cam.getWorldDirection(out) }
}
