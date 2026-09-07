import * as THREE from 'three'
import { T } from './tuning'
import { MAP, rampPoint } from './world/terrain'
import type { Game } from './game'
import type { Enemy } from './enemies'

interface Trigger { id: string; x: number; z: number; r: number; fire: () => void }
export interface Checkpoint { id: string; label: string; x: number; z: number; yaw: number; act: number }
export interface Interactable { id: string; pos: THREE.Vector3; radius: number; prompt: string; hold: number; enabled: boolean; progress: number; onDone: () => void; onStart?: () => void }

export interface SaveState {
  checkpoint: string
  fired: string[]
  generators: boolean[]
  lighthouseOn: boolean
  taken: string[]
  ammo: number; reserve: number; battery: number; spares: number; flares: number
  pages: string[]; thermos: number
  act: number
  pursuit: boolean
  arenaDone: boolean
}

const M = MAP.sawmill
const rp = (t: number) => rampPoint(t)

export class Director {
  triggers: Trigger[] = []
  fired = new Set<string>()
  checkpoints: Checkpoint[] = []
  interactables: Interactable[] = []
  current: Checkpoint
  act = 1
  pursuit = false          // Ato 3: perseguição contínua
  pursuitT = 0
  arenaActive = false      // Ato 2: ondas enquanto geradores desligados
  arenaT = 0
  arenaDone = false
  bossAlive = false
  boss?: Enemy
  finaleT = -1
  private tmp = new THREE.Vector3()

  constructor(private game: Game) {
    const g = game
    const cp = (id: string, label: string, x: number, z: number, yaw: number, act: number) => { const c = { id, label, x, z, yaw, act }; this.checkpoints.push(c); return c }
    // ---------------- CHECKPOINTS ----------------
    this.current = cp('start', 'Cabana', MAP.start.x, MAP.start.z, 0.35, 1)
    cp('forestLamp', 'Poste da floresta', -10, -86, 0.4, 1)
    cp('road', 'Estrada', 34, MAP.roadZ, -Math.PI / 2, 2)
    cp('gate', 'Portão da serraria', M.cx, M.z1 + 4, 0, 2)
    cp('gen0', 'Gerador oeste', M.x0 + 15, M.z1 - 12, 0, 2)
    cp('gen1', 'Gerador leste', M.x1 - 15, M.z1 - 30, 0, 2)
    cp('gen2', 'Gerador sul', M.cx, M.z0 + 15, 0, 2)
    cp('exit', 'Saída da serraria', M.cx, M.z0 - 4, Math.PI, 3)
    cp('rampMid', 'Meio da rampa', rp(0.48)[0], rp(0.48)[1], 0, 3)
    cp('top', 'Farol', MAP.lighthouse.x - 4, MAP.lighthouse.z + 12, 0, 3)

    const tr = (id: string, x: number, z: number, r: number, fire: () => void) => this.triggers.push({ id, x, z, r, fire })
    const hud = () => g.hud

    // ---------------- ATO 1: FLORESTA ----------------
    tr('a1_intro', -6, 8, 12, () => { hud().setObjective('Siga a trilha pela floresta. A estrada fica ao norte; o farol, ao sul.'); hud().showHint('move', 'WASD para mover • mouse para olhar • Espaço (segurar) para correr', 7) })
    tr('a1_first', 8, -40, 7, () => {
      g.audio.setMusic('tense')
      hud().showHint('focus', 'Sussurros vêm de trás. Segure o BOTÃO DIREITO para FOCAR a lanterna e queimar a sombra antes de atirar.', 9)
      g.enemies.summonNearPlayer('lumberjack', { behind: true })
    })
    tr('a1_lamp', -12, -88, 8, () => { this.reach('forestLamp'); hud().showHint('haven', 'Postes de luz são seguros: a vida se recupera no halo e eles não entram. Mas o poste não anda com você.', 8) })
    tr('a1_two', -4, -112, 8, () => { g.enemies.summonNearPlayer('lumberjack', { behind: true }); setTimeout(() => g.enemies.summonNearPlayer('lumberjack'), 1500); hud().showHint('reload', 'R recarrega bala a bala (2,2 s cada). Atirar cancela a recarga.', 7) })
    tr('a1_crows', 26, -166, 9, () => { g.enemies.summonAt('crows', 26 + 14, -166 - 6, { noWhisper: true }); g.audio.play('crow'); hud().showHint('crows', 'Corvos possuídos: mantenha o FOCO no centro do bando. Balas não os alcançam.', 8) })
    tr('a1_road_fight', 20, -222, 9, () => { g.enemies.summonNearPlayer('lumberjack'); g.enemies.summonNearPlayer('lumberjack'); setTimeout(() => g.enemies.summonNearPlayer('lumberjack', { behind: true }), 8000); hud().showHint('dodge', 'SHIFT: esquiva com invencibilidade curta. Esquive no último instante.', 7) })
    tr('a1_end', 34, MAP.roadZ, 8, () => { this.reach('road'); this.setAct(2); hud().setObjective('Siga a estrada para leste até a serraria.'); g.audio.setMusic('silence') })

    // ---------------- ATO 2: ESTRADA + SERRARIA ----------------
    tr('r1', 8, MAP.roadZ, 8, () => { g.audio.setMusic('tense'); g.enemies.summonNearPlayer('thrower'); hud().showHint('thrower', 'Arremessadores mantêm distância e atiram machados. Esquive (SHIFT) ou avance queimando.', 8) })
    tr('r2', 70, MAP.roadZ, 9, () => { g.enemies.summonNearPlayer('lumberjack', { behind: true }); g.enemies.summonNearPlayer('lumberjack', { behind: true }); setTimeout(() => g.enemies.summonNearPlayer('thrower'), 3000) })
    tr('r3', 150, MAP.roadZ, 9, () => { for (let i = 0; i < 3; i++) setTimeout(() => g.enemies.summonNearPlayer('lumberjack', { behind: i < 2 }), i * 1200) })
    tr('r_gate', M.cx, M.z1 + 4, 7, () => { this.reach('gate'); hud().setObjective('Ligue os TRÊS geradores (segurar E) para iluminar o pátio da serraria.'); g.audio.setMusic('silence') })
    tr('arena', M.cx, M.z1 - 6, 9, () => { this.arenaActive = true; g.audio.setMusic('tense'); g.enemies.summonNearPlayer('lumberjack', { behind: true }); g.enemies.summonNearPlayer('thrower') })
    tr('a2_exit', M.cx, M.z0 - 2, 7, () => { if (!this.arenaDone) return; this.reach('exit'); this.setAct(3); hud().setObjective('Suba o morro até o farol. Não há munição no caminho: corra entre os postes.'); g.audio.setMusic('silence') })

    // Geradores (interação com espera; ondas durante)
    const genPos = [[M.x0 + 12, M.z1 - 12], [M.x1 - 12, M.z1 - 30], [M.cx, M.z0 + 12]]
    genPos.forEach(([x, z], i) => this.interactables.push({
      id: `gen${i}`, pos: new THREE.Vector3(x, 0, z), radius: 2.6, prompt: 'Segure E — puxar a corda do gerador', hold: 3.5, enabled: true, progress: 0,
      onStart: () => { g.audio.play('generator'); if (i === 0) g.enemies.summonNearPlayer('lumberjack', { behind: true }) },
      onDone: () => this.onGenerator(i),
    }))
    // Painel do farol
    this.interactables.push({
      id: 'panel', pos: g.world.lighthouse.panelPos.clone(), radius: 2.4, prompt: 'Segure E — religar o holofote do farol', hold: 6, enabled: true, progress: 0,
      onStart: () => { g.audio.play('generator'); g.enemies.summonNearPlayer('lumberjack', { behind: true }); g.enemies.summonNearPlayer('lumberjack') },
      onDone: () => this.onLighthouse(),
    })

    // ---------------- ATO 3: MORRO + FAROL ----------------
    tr('h1', 275, -405, 9, () => { this.pursuit = true; g.audio.setMusic('tense'); hud().showHint('pursuit', 'Eles não vão parar de vir. Sinalizador (F) afasta todos por 8 segundos.', 8) })
    tr('h_mid', rp(0.48)[0], rp(0.48)[1], 7, () => this.reach('rampMid'))
    tr('h_top', rp(0.99)[0], rp(0.99)[1], 10, () => { this.reach('top'); hud().setObjective('Religue o holofote do farol no painel ao lado da porta (segurar E por 6 s).') })
  }

  setAct(n: number) {
    if (n === this.act) return
    this.act = n
    this.game.showActCard(n)
  }

  reach(id: string) {
    const c = this.checkpoints.find((k) => k.id === id)!
    if (this.current === c) return
    this.current = c
    this.game.onCheckpoint(c)
  }

  private onGenerator(i: number) {
    const g = this.game, w = g.world
    w.setGenerator(i, true); g.audio.play('floodOn'); g.postfx.flash = Math.max(g.postfx.flash, 0.5)
    const gen = w.generators[i]
    for (const f of gen.floods) g.enemies.purge(f.pos.x, f.pos.z, f.radius + 4)
    g.enemies.purge(gen.haven.pos.x, gen.haven.pos.z, gen.haven.radius + 3)
    this.interactables.find((it) => it.id === `gen${i}`)!.enabled = false
    this.reach(`gen${i}`)
    const on = w.generators.filter((x) => x.on).length
    g.hud.setObjective(`Geradores ligados: ${on}/3`)
    g.stats.generators = on
    if (i === 0) {
      setTimeout(() => { g.enemies.summonNearPlayer('brute', { behind: true }); g.hud.showHint('brute', 'BRUTO: escudo pesado (140). Queime, recue para a luz, troque a pilha, queime de novo.', 9); g.audio.play('rumble') }, 4000)
    }
    if (i === 1) setTimeout(() => { g.enemies.summonNearPlayer('thrower'); g.enemies.summonNearPlayer('thrower', { behind: true }); g.enemies.summonNearPlayer('lumberjack', { behind: true }) }, 3000)
    if (on >= 3) {
      this.arenaActive = false
      setTimeout(() => this.startPossessed(), 3500)
    }
  }

  private startPossessed() {
    const g = this.game
    g.audio.play('rumble'); g.cam.shake(0.9)
    g.hud.showHint('possessed', 'A ESCAVADEIRA está possuída. Balas não fazem nada: queime-a com o foco e use os geradores como abrigo.', 9)
    g.audio.setMusic('combat')
    const e = g.enemies.spawnNow('possessed', M.cx + 14, M.z0 + 24, {
      bounds: { x0: M.x0 + 6, x1: M.x1 - 6, z0: M.z0 + 4, z1: M.z1 - 6 },
      onDeath: () => { this.arenaDone = true; g.hud.setObjective('O portão sul está livre. Siga a trilha até o farol.'); g.audio.setMusic('silence'); g.audio.play('checkpoint') },
    })
    e.yaw = Math.PI / 2
  }

  private onLighthouse() {
    const g = this.game
    g.world.lighthouse.setOn(true); g.audio.play('flash'); g.postfx.flash = 1.2
    this.interactables.find((it) => it.id === 'panel')!.enabled = false
    g.stats.lighthouse = true
    this.pursuit = false
    g.hud.setObjective('O holofote gira. Sobreviva.')
    setTimeout(() => {
      const lx = MAP.lighthouse.x, lz = MAP.lighthouse.z
      g.audio.play('rumble'); g.cam.shake(1)
      g.audio.setMusic('combat')
      const b = g.enemies.spawnNow('shadowKing', lx - 22, lz + 14, { onDeath: () => this.onVictory() })
      this.boss = b; this.bossAlive = true
      g.hud.showHint('boss', 'Sua lanterna mal arranha essa coisa. Atraia-a para onde o FEIXE DO FAROL passa.', 10)
    }, 4000)
  }

  private onVictory() {
    const g = this.game
    this.bossAlive = false; this.finaleT = 0
    g.audio.setMusic('haven'); g.postfx.flash = 1.5
    g.hud.setObjective('')
    g.hud.say('O feixe passa uma última vez. O que restou da escuridão escorre pelo penhasco e o céu, atrás do mar, começa a clarear.', 12)
  }

  /** Estado a ser salvo no checkpoint. */
  snapshot(): SaveState {
    const g = this.game
    return {
      checkpoint: this.current.id, fired: [...this.fired], generators: g.world.generators.map((x) => x.on), lighthouseOn: g.world.lighthouse.on,
      taken: g.pickups.list.filter((p) => p.taken).map((p) => p.id),
      ammo: g.revolver.ammo, reserve: g.revolver.reserve, battery: g.flashlight.battery, spares: g.flashlight.spares, flares: g.inventory.flares,
      pages: [...g.inventory.pages], thermos: g.inventory.thermos, act: this.act, pursuit: this.pursuit, arenaDone: this.arenaDone,
    }
  }

  /** Restaura o checkpoint com recursos parciais. */
  restore(s: SaveState) {
    const g = this.game
    this.current = this.checkpoints.find((c) => c.id === s.checkpoint) ?? this.checkpoints[0]
    this.fired = new Set(s.fired)
    s.generators.forEach((on, i) => g.world.setGenerator(i, on))
    g.world.lighthouse.setOn(s.lighthouseOn)
    g.pickups.setTaken(new Set(s.taken))
    g.inventory.pages = [...s.pages]; g.inventory.thermos = s.thermos
    this.act = s.act; this.pursuit = s.pursuit; this.arenaDone = s.arenaDone
    this.arenaActive = false; this.arenaT = 0; this.pursuitT = 0; this.bossAlive = false; this.boss = undefined; this.finaleT = -1
    for (const it of this.interactables) { it.progress = 0; it.enabled = it.id === 'panel' ? !s.lighthouseOn : !s.generators[Number(it.id.replace('gen', ''))] }
    // Recursos parciais: nunca volta pior que o mínimo, nunca melhor do que tinha
    const R = T.respawn
    g.revolver.ammo = Math.max(Math.min(R.minAmmo, T.revolver.cylinder), Math.min(s.ammo, T.revolver.cylinder)); g.revolver.reserve = Math.min(s.reserve, 6)
    g.revolver.reloading = false; g.revolver.reloadT = 0
    g.flashlight.battery = Math.max(R.battery, Math.min(s.battery, T.flashlight.battery)); g.flashlight.spares = Math.min(s.spares, R.maxSpareBatteries)
    g.inventory.flares = Math.min(s.flares, R.flares)
    g.player.reset(new THREE.Vector3(this.current.x, 0, this.current.z), this.current.yaw)
    g.player.health = T.player.maxHealth * R.healthFraction
    // Se o checkpoint é o topo com o farol já ligado, o chefe volta
    if (s.lighthouseOn && this.current.id === 'top') { setTimeout(() => { if (g.state === 'playing') { const b = g.enemies.spawnNow('shadowKing', MAP.lighthouse.x - 22, MAP.lighthouse.z + 14, { onDeath: () => this.onVictory() }); this.boss = b; this.bossAlive = true; g.audio.setMusic('combat') } }, 3000) }
    if (this.current.id === 'exit' || this.current.id === 'top' || this.current.id === 'rampMid') this.pursuit = this.current.id !== 'exit' ? true : false
    if (this.current.id === 'gen0' || this.current.id === 'gen1' || this.current.id === 'gen2' || this.current.id === 'gate') { this.arenaActive = !s.generators.every(Boolean) && this.current.id !== 'gate' }
  }

  update(dt: number) {
    const g = this.game, p = g.player
    // Gatilhos de posição
    for (const t of this.triggers) {
      if (this.fired.has(t.id)) continue
      if (Math.hypot(p.pos.x - t.x, p.pos.z - t.z) < t.r) { this.fired.add(t.id); t.fire() }
    }
    // Arena da serraria: ondas enquanto houver gerador desligado
    if (this.arenaActive) {
      this.arenaT += dt
      const alive = g.enemies.aliveCount()
      if (this.arenaT > 16 && alive < 4) { this.arenaT = 0; g.enemies.summonNearPlayer('lumberjack', { behind: true }); g.enemies.summonNearPlayer(Math.random() < 0.5 ? 'thrower' : 'lumberjack') }
    }
    // Perseguição contínua do Ato 3
    if (this.pursuit) {
      this.pursuitT += dt
      const alive = g.enemies.aliveCount()
      const interval = p.inHaven ? 14 : 9
      if (this.pursuitT > interval && alive < 4 && !p.inHaven) {
        this.pursuitT = 0
        g.enemies.summonNearPlayer('lumberjack', { behind: true })
        if (Math.random() < 0.35) g.enemies.summonNearPlayer('thrower')
      }
    }
    // Chefe
    if (this.bossAlive && this.boss && this.boss.alive) {
      const b = this.boss
      const frac = b.shield / b.maxShield
      if (frac < 0.5 && !this.fired.has('boss_half')) { this.fired.add('boss_half'); g.hud.say('A coisa uiva quando o feixe a toca. Continue girando com ele.', 5) }
      if (b.pos.distanceTo(p.pos) > 60) { b.pos.set(p.pos.x + 20, 0, p.pos.z + 20); b.pos.y = g.world.h(b.pos.x, b.pos.z) }
    }
    // Final
    if (this.finaleT >= 0) {
      this.finaleT += dt
      g.world.setDawn(Math.min(1, this.finaleT / 10))
      g.director.pursuit = false
      if (this.finaleT > 11 && g.state === 'playing') g.showEnd()
    }
    // Interações
    let active: Interactable | null = null
    for (const it of this.interactables) {
      if (!it.enabled) continue
      it.pos.y = g.world.h(it.pos.x, it.pos.z)
      if (this.tmp.set(p.pos.x, 0, p.pos.z).distanceTo(this.tmp.clone().set(it.pos.x, 0, it.pos.z)) < it.radius) { active = it; break }
    }
    if (active) {
      const holding = g.input.isDown('interact')
      if (holding) {
        if (active.progress === 0) active.onStart?.()
        active.progress += dt
        g.flashlight.on = false
        if (active.progress >= active.hold) { active.progress = 0; active.enabled = false; active.onDone(); g.flashlight.on = true }
      } else { if (active.progress > 0) g.flashlight.on = true; active.progress = Math.max(0, active.progress - dt * 2) }
      g.hud.prompt = { text: active.prompt, progress: active.progress > 0 ? active.progress / active.hold : undefined }
    } else g.hud.prompt = null
  }
}
