import * as THREE from 'three'
import { T } from './tuning'
import { Input } from './input'
import { World } from './world/world'
import { Player, ThirdPersonCamera } from './player'
import { Flashlight } from './flashlight'
import { Revolver } from './revolver'
import { EnemyManager } from './enemies'
import { Particles } from './particles'
import { HUD } from './hud'
import { AudioSys } from './audio'
import { PostFX } from './postfx'
import { Pickups, Pickup } from './pickups'
import { Director, Checkpoint, SaveState } from './director'
import { PAGES } from './narrative'
import { MAP } from './world/terrain'
import { applyHavenVisual, Haven } from './world/props'
import { makeGlow } from './world/lights'
import { fmtTime, damp, clamp } from './util'

export type GameState = 'menu' | 'playing' | 'reading' | 'dead' | 'end' | 'paused'

interface ActiveFlare { haven: Haven; t: number; light: any; mesh: THREE.Group }

export class Game {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  input: Input
  world: World
  player: Player
  cam: ThirdPersonCamera
  flashlight: Flashlight
  revolver: Revolver
  enemies: EnemyManager
  particles: Particles
  hud: HUD
  audio = new AudioSys()
  postfx: PostFX
  pickups: Pickups
  director: Director
  state: GameState = 'menu'
  time = 0
  playTime = 0
  timeScale = 1
  private slowT = 0
  inventory = { flares: 0, pages: [] as string[], thermos: 0 }
  stats = { kills: 0, shieldsBroken: 0, deaths: 0, generators: 0, lighthouse: false }
  save: SaveState | null = null
  flares: ActiveFlare[] = []
  private ui: HTMLElement
  private screens: Record<string, HTMLElement> = {}
  private actCard: HTMLElement
  private clock = new THREE.Clock()
  private fpsAcc = 0; private fpsN = 0; fps = 0
  private deathT = 0
  private stepT = 0
  lastInfo = { calls: 0, tris: 0 }

  constructor() {
    const canvas = document.getElementById('gl') as HTMLCanvasElement
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, T.postfx.pixelRatioCap))
    this.renderer.setSize(innerWidth, innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = T.world.exposure
    this.renderer.info.autoReset = false
    this.input = new Input(canvas)
    this.world = new World(this.scene)
    this.player = new Player(this)
    this.cam = new ThirdPersonCamera(this)
    this.flashlight = new Flashlight(this)
    this.revolver = new Revolver(this)
    this.enemies = new EnemyManager(this)
    this.particles = new Particles(this.scene)
    this.hud = new HUD(this)
    this.postfx = new PostFX(this.renderer, this.scene, this.cam.cam)
    this.pickups = new Pickups(this)
    this.director = new Director(this)
    this.ui = document.getElementById('ui')!
    this.buildScreens()
    this.actCard = document.getElementById('actcard')!
    window.addEventListener('resize', () => { this.renderer.setSize(innerWidth, innerHeight); this.cam.resize(); this.hud.resize(); this.postfx.resize() })
    this.player.reset(MAP.start.clone(), 0.35)
    this.showScreen('menu')
    ;(window as any).__game = this
    requestAnimationFrame(() => this.frame())
  }

  // ---------------- UI ----------------
  private buildScreens() {
    const mk = (id: string, html: string) => { const d = document.createElement('div'); d.className = 'screen hidden'; d.id = id; d.innerHTML = html; this.ui.appendChild(d); this.screens[id] = d; return d }
    const controls = `<div class="controls"><b>WASD</b> mover · <b>Mouse</b> olhar · <b>Botão esq.</b> atirar · <b>Botão dir. (segurar)</b> foco da lanterna<br><b>Shift</b> esquiva · <b>Espaço (segurar)</b> correr · <b>R</b> recarregar · <b>F</b> sinalizador · <b>E</b> interagir · <b>T</b> lanterna · <b>Esc</b> pausa</div>`
    const menu = mk('menu', `<h1>CEDAR HOLLOW</h1><h2>UM PESADELO EM TRÊS ATOS</h2><p>A luz é a única coisa que eles temem. Queime a sombra antes de puxar o gatilho.</p><button class="btn" id="btnStart">Novo jogo</button>${controls}<p style="margin-top:22px;font-size:13px;color:#5f6b74">Use fones de ouvido. Os sussurros dizem de onde eles vêm.</p>`)
    menu.querySelector('#btnStart')!.addEventListener('click', () => this.startGame())
    const dead = mk('dead', `<h1 style="color:#b8c2c9">ENGOLIDO PELA ESCURIDÃO</h1><p id="deadInfo"></p><button class="btn" id="btnRespawn">Voltar ao último checkpoint</button><p style="font-size:13px;color:#5f6b74">Você volta com recursos parciais. Bateria e munição continuam escassas.</p>`)
    dead.querySelector('#btnRespawn')!.addEventListener('click', () => this.respawn())
    const pause = mk('pause', `<h1 style="font-size:40px">PAUSA</h1><p id="pauseInfo"></p><button class="btn" id="btnResume">Continuar</button>${controls}`)
    pause.querySelector('#btnResume')!.addEventListener('click', () => this.resume())
    const page = mk('reading', `<div class="page"><h3 id="pageTitle"></h3><div id="pageText"></div><div class="hint">Clique ou pressione Enter para fechar</div></div>`)
    page.addEventListener('click', () => this.closePage())
    const end = mk('end', `<h1 style="font-size:44px">O AMANHECER</h1><h2>FIM DO EPISÓDIO</h2><p>O feixe do farol varre a baía até o céu clarear. O que vivia na floresta de Cedar Hollow recua para onde a luz não chega, e você fica ali, na plataforma, até o sol nascer.</p><div class="stats" id="endStats"></div><button class="btn" id="btnAgain">Jogar de novo</button>`)
    end.querySelector('#btnAgain')!.addEventListener('click', () => location.reload())
    const card = document.createElement('div'); card.id = 'actcard'; card.innerHTML = `<div class="act"></div><div class="title"></div>`; this.ui.appendChild(card)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && this.state === 'reading') this.closePage()
      if (e.code === 'Enter' && this.state === 'dead') this.respawn()
      if (e.code === 'Escape' && this.state === 'paused') this.resume()
      if (e.code === 'Enter' && this.state === 'menu') this.startGame()
    })
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing') this.pause()
    })
  }
  private showScreen(id: string | null) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('hidden', k !== id)
  }
  showActCard(n: number) {
    const titles = ['', 'A FLORESTA', 'A SERRARIA', 'O FAROL']
    this.actCard.querySelector('.act')!.textContent = `ATO ${['', 'I', 'II', 'III'][n]}`
    this.actCard.querySelector('.title')!.textContent = titles[n]
    this.actCard.classList.add('show')
    this.audio.play('checkpoint')
    setTimeout(() => this.actCard.classList.remove('show'), 4500)
  }

  startGame() {
    this.audio.init(); this.audio.resume()
    this.state = 'playing'; this.showScreen(null)
    this.input.requestLock()
    this.player.reset(MAP.start.clone(), 0.35)
    this.revolver.ammo = T.revolver.cylinder; this.revolver.reserve = 6
    this.flashlight.battery = T.flashlight.battery; this.flashlight.spares = 1
    this.inventory = { flares: 0, pages: [], thermos: 0 }
    this.save = this.director.snapshot()
    this.showActCard(1)
    this.hud.setObjective('Siga a trilha pela floresta.')
  }
  pause() { if (this.state !== 'playing') return; this.state = 'paused'; this.showScreen('pause'); this.screens.pause.querySelector('#pauseInfo')!.textContent = `Checkpoint: ${this.director.current.label} · Tempo: ${fmtTime(this.playTime)}` }
  resume() { if (this.state !== 'paused') return; this.state = 'playing'; this.showScreen(null); this.input.requestLock(); this.audio.resume() }

  onCheckpoint(c: Checkpoint) {
    this.save = this.director.snapshot()
    this.audio.play('checkpoint')
    this.hud.say(`Checkpoint — ${c.label}`, 3)
  }
  onPlayerDeath() {
    this.stats.deaths++
    this.audio.play('death'); this.audio.setMusic('none')
    this.postfx.darkness = 1; this.postfx.desat = 1
    this.timeScale = 0.35; this.deathT = 0
    this.state = 'dead'
    setTimeout(() => {
      this.screens.dead.querySelector('#deadInfo')!.textContent = `Último checkpoint: ${this.director.current.label}. Mortes: ${this.stats.deaths}.`
      this.showScreen('dead'); this.input.exitLock()
    }, 1800)
  }
  respawn() {
    if (!this.save) return
    this.enemies.clearAll()
    for (const f of this.flares) this.endFlare(f)
    this.director.restore(this.save)
    this.postfx.darkness = 0; this.postfx.desat = 0; this.postfx.hurt = 0; this.timeScale = 1
    this.world.setDawn(0)
    this.state = 'playing'; this.showScreen(null); this.input.requestLock(); this.audio.resume(); this.audio.setMusic('silence')
    this.hud.say(`Você volta a ${this.director.current.label}.`, 4)
  }
  onNearMiss() {
    // Ataque passou raspando durante a esquiva: slow-motion cinematográfico
    this.timeScale = T.dodge.nearMissTimeScale; this.slowT = T.dodge.nearMissSeconds
    this.postfx.slowmo = 1; this.audio.play('dodge', { vol: 0.6 }); this.stats.shieldsBroken += 0
  }
  showEnd() {
    this.state = 'end'; this.input.exitLock()
    const s = this.stats
    this.screens.end.querySelector('#endStats')!.innerHTML = `Tempo: <span>${fmtTime(this.playTime)}</span> · Sombrios destruídos: <span>${s.kills}</span> · Escudos queimados: <span>${s.shieldsBroken}</span><br>Páginas: <span>${this.inventory.pages.length}/${PAGES.length}</span> · Termos de café: <span>${this.inventory.thermos}/10</span> · Mortes: <span>${s.deaths}</span>`
    this.showScreen('end')
  }

  onPickup(p: Pickup) {
    switch (p.kind) {
      case 'battery': this.flashlight.spares++; this.audio.play('battery'); this.hud.say('Pilha (+1). A bateria troca sozinha quando acabar, ou pressione B.', 4); break
      case 'ammo': this.revolver.reserve += p.amount; this.audio.play('pickup'); this.hud.say(`Munição (+${p.amount})`, 3); break
      case 'flare': this.inventory.flares++; this.audio.play('pickup'); this.hud.say('Sinalizador (+1) — F para usar', 3); break
      case 'thermos': this.inventory.thermos++; this.audio.play('thermos'); this.hud.say(`Garrafa térmica de café (${this.inventory.thermos}/10)`, 3); break
      case 'page': {
        const def = PAGES.find((x) => x.id === p.pageId)!
        this.inventory.pages.push(def.id); this.audio.play('page')
        this.screens.reading.querySelector('#pageTitle')!.textContent = def.title
        this.screens.reading.querySelector('#pageText')!.textContent = def.text
        this.state = 'reading'; this.showScreen('reading')
        break
      }
    }
  }
  closePage() { if (this.state !== 'reading') return; this.state = 'playing'; this.showScreen(null); this.input.requestLock() }

  // ---------------- Sinalizador ----------------
  useFlare() {
    if (this.inventory.flares <= 0) { this.audio.play('empty'); return }
    this.inventory.flares--
    const p = this.player.pos.clone()
    const mesh = new THREE.Group(); mesh.position.copy(p)
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xff8060 })); stick.position.y = 0.12; mesh.add(stick)
    const glow = makeGlow(0xff6a3a, 4, 1); glow.position.y = 0.3; mesh.add(glow)
    this.scene.add(mesh)
    const light = this.world.pool.add({ pos: new THREE.Vector3(p.x, p.y + 0.5, p.z), color: new THREE.Color(0xff6a3a), intensity: T.flare.intensity, distance: 14, on: true, flicker: 0.4, priority: 4 })
    const haven: Haven = { pos: p.clone(), radius: T.flare.radius, on: true, kind: 'flare' }
    this.world.havens.push(haven)
    this.flares.push({ haven, t: T.flare.duration, light, mesh })
    this.enemies.repel(p, T.flare.radius + 2)
    this.audio.play('flare')
  }
  private endFlare(f: ActiveFlare) {
    this.world.pool.remove(f.light); this.scene.remove(f.mesh)
    const i = this.world.havens.indexOf(f.haven); if (i >= 0) this.world.havens.splice(i, 1)
    const j = this.flares.indexOf(f); if (j >= 0) this.flares.splice(j, 1)
  }

  // ---------------- Utilidades de áudio espacial ----------------
  panFor(pos: THREE.Vector3) {
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw))
    const to = new THREE.Vector3().subVectors(pos, this.player.pos).setY(0).normalize()
    return clamp(to.dot(right), -1, 1)
  }
  isBehind(pos: THREE.Vector3) {
    const fwd = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw))
    const to = new THREE.Vector3().subVectors(pos, this.player.pos).setY(0).normalize()
    return to.dot(fwd) < -0.2
  }

  // ---------------- Loop ----------------
  private frame() {
    requestAnimationFrame(() => this.frame())
    const raw = Math.min(0.05, this.clock.getDelta())
    this.fpsAcc += raw; this.fpsN++; if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0 }
    this.input.pollGamepad()
    if (this.state === 'playing' && this.input.wasPressed('pause')) { this.pause(); this.input.exitLock() }
    if (this.state === 'playing') {
      if (this.slowT > 0) { this.slowT -= raw; if (this.slowT <= 0) { this.timeScale = 1; this.postfx.slowmo = 0 } }
      const dt = raw * this.timeScale
      this.time += dt; this.playTime += raw
      this.updatePlaying(dt, raw)
    } else if (this.state === 'dead') {
      const dt = raw * this.timeScale
      this.time += dt; this.deathT += raw
      this.timeScale = damp(this.timeScale, 0.05, 1.5, raw)
      this.enemies.update(dt); this.particles.update(dt); this.cam.update(raw, this.timeScale)
      this.world.update(dt, this.time, this.player.pos); this.flashlight.update(dt)
    } else if (this.state === 'reading' || this.state === 'paused' || this.state === 'end') {
      // congela o jogo; só a câmera respira
      if (this.state === 'end') { this.time += raw; this.world.update(raw, this.time, this.player.pos); this.particles.update(raw) }
    } else {
      // menu: câmera orbitando a cabana
      this.time += raw
      this.player.yaw = this.time * 0.08; this.player.update(0)
      this.cam.update(raw, 1); this.flashlight.update(raw); this.world.update(raw, this.time, this.player.pos); this.particles.update(raw)
    }
    this.postfx.update(raw, this.time)
    this.lastInfo = { calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles }
    this.renderer.info.reset()
    if (T.postfx.enabled) this.postfx.render(); else this.renderer.render(this.scene, this.cam.cam)
    this.hud.draw(raw, this.time)
    this.input.endFrame()
  }

  private updatePlaying(dt: number, raw: number) {
    const p = this.player, w = this.world
    // Safe haven?
    const hv = w.havenAt(p.pos.x, p.pos.z)
    p.inHaven = !!hv
    if (this.input.wasPressed('flare')) this.useFlare()
    if (this.input.keyPressed('KeyB')) this.flashlight.swapBattery()
    p.update(dt)
    this.cam.update(dt, this.timeScale)
    this.flashlight.update(dt)
    this.revolver.update(dt)
    this.enemies.update(dt)
    this.pickups.update(dt)
    this.director.update(dt)
    this.particles.update(dt)
    w.update(dt, this.time, p.pos)
    // Sinalizadores ativos
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i]; f.t -= dt
      f.light.intensity = T.flare.intensity * clamp(f.t / 2, 0.1, 1)
      if (Math.random() < 0.8) this.particles.burst(new THREE.Vector3(f.haven.pos.x, f.haven.pos.y + 0.3, f.haven.pos.z), 2, 2.5, 0.5, 0.4, new THREE.Color(1, 0.45, 0.2), 5, 0.5)
      for (const e of this.enemies.list) if (e.alive && Math.hypot(e.pos.x - f.haven.pos.x, e.pos.z - f.haven.pos.z) < T.flare.radius + 1) { e.burn(T.flare.burnPerSecond * dt, 'flare'); if (e.state !== 'flee' && e.kind !== 'possessed') { e.fleeFrom.copy(f.haven.pos); e.setState('flee') } }
      if (f.t <= 0) this.endFlare(f)
    }
    // Rádios / TVs: descanso narrativo
    for (const r of w.restSpots) {
      if (r.played) continue
      if (Math.hypot(p.pos.x - r.pos.x, p.pos.z - r.pos.z) < r.radius) { r.played = true; this.audio.play('radio'); this.hud.say(r.lines[0], 9); if (r.lines[1]) setTimeout(() => this.hud.say(r.lines[1], 9), 9500) }
    }
    // Passos
    if (p.moving && p.dodgeT <= 0) { this.stepT += dt * (p.running ? 3.2 : 2.0); if (this.stepT > 1) { this.stepT = 0; this.audio.play('step', { vol: p.running ? 1 : 0.6 }) } }
    // Música reativa: silêncio → drone tenso (detectado) → percussão (combate) → canção (safe haven)
    const threats = this.enemies.threats.filter((e) => e.pos.distanceTo(p.pos) < 32)
    let music: 'silence' | 'tense' | 'combat' | 'haven' = 'silence'
    if (p.inHaven && hv && hv.kind !== 'flare') music = threats.length > 0 || this.director.pursuit ? 'haven' : 'silence'
    else if (threats.length > 0) music = 'combat'
    else if (this.enemies.pending.length > 0 || this.enemies.list.some((e) => e.alive) || this.director.pursuit || this.director.arenaActive) music = 'tense'
    if (this.director.finaleT >= 0) music = 'haven'
    this.audio.setMusic(music)
    this.audio.updateMusic(raw)
    this.audio.setFocus(this.flashlight.focusing ? 1 : 0, this.flashlight.burnIntensity, raw)
    this.audio.heartbeat(p.health / T.player.maxHealth, raw)
    // Pós-processamento ligado à vida / bateria
    const hf = p.health / T.player.maxHealth
    this.postfx.desat = (1 - hf) * 0.85
    this.postfx.pulse = hf < 0.5 ? Math.max(0, Math.sin(this.time * (4 + (1 - hf) * 6))) * (0.5 - hf) * 1.5 : 0
    this.postfx.hurt = Math.max(this.postfx.hurt * (1 - raw * 2.5), p.hurtFlash * 0.8, hf < 0.3 ? (0.3 - hf) * 1.2 : 0)
    this.postfx.lowBatt = this.flashlight.battery < T.flashlight.lowBatteryWarn && this.flashlight.spares === 0 ? 1 : 0
    this.postfx.motion = clamp(p.speedNow / T.player.runSpeed, 0, 1) * (p.running || p.dodgeT > 0 ? 1 : 0.3)
    this.postfx.slowmo = this.timeScale < 0.9 ? 1 : 0
    // Dica quando fica sem os dois recursos
    if (this.revolver.ammo === 0 && this.revolver.reserve === 0 && this.flashlight.battery <= 0 && this.flashlight.spares === 0) this.hud.showHint('noRes', 'Sem bateria e sem balas. Corra de luz em luz: dentro do halo, nada te alcança.', 8)
    // Bateria baixa: aviso
    if (this.flashlight.battery < T.flashlight.lowBatteryWarn && this.flashlight.spares > 0) this.hud.showHint('lowBatt', 'Bateria acabando. B troca a pilha agora (ou ela troca sozinha ao zerar).', 5)
  }

  // ---------- API de depuração/testes (window.__game) ----------
  debug = {
    forceFocus: false,
    fire: () => this.revolver.fire(),
    info: () => ({ ...this.lastInfo, fps: this.fps }),
    teleport: (x: number, z: number) => { this.player.pos.set(x, 0, z); this.player.pos.y = this.world.h(x, z) },
    spawn: (kind: any, dx = 6, dz = 0) => this.enemies.spawnNow(kind, this.player.pos.x + dx, this.player.pos.z + dz, { noWhisper: true }),
    checkpoint: (id: string) => this.director.reach(id),
    state: () => ({ state: this.state, hp: this.player.health, ammo: this.revolver.ammo, reserve: this.revolver.reserve, battery: this.flashlight.battery, spares: this.flashlight.spares, enemies: this.enemies.list.map((e) => ({ kind: e.kind, state: e.state, shield: e.shield, hp: e.hp, alive: e.alive })), fps: this.fps, cp: this.director.current.id, act: this.director.act, pos: this.player.pos.toArray() }),
  }
  applyHaven = applyHavenVisual
}
