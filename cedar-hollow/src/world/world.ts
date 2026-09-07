import * as THREE from 'three'
import { T } from '../tuning'
import { heightAt, buildTerrain, buildForest, CollisionGrid, MAP, rampPoint } from './terrain'
import { LightPool } from './lights'
import { Haven, buildLampPost, buildGenerator, buildFloodTower, buildCabin, buildLogPile, buildConveyor, buildShed, buildFence, buildRocks, buildLighthouse, buildRadioSpot, Lighthouse, applyHavenVisual } from './props'

export interface Generator { haven: Haven; floods: Haven[]; id: number; on: boolean; body: THREE.Group }
export interface RestSpot { pos: THREE.Vector3; kind: 'radio' | 'tv'; lines: string[]; radius: number; played: boolean }

export class World {
  grid = new CollisionGrid()
  pool: LightPool
  havens: Haven[] = []
  generators: Generator[] = []
  lighthouse: Lighthouse
  restSpots: RestSpot[] = []
  terrain: THREE.Mesh
  sky: THREE.Mesh
  moon: THREE.DirectionalLight
  ambient: THREE.AmbientLight
  hemi: THREE.HemisphereLight
  fog: THREE.FogExp2

  constructor(public scene: THREE.Scene) {
    this.fog = new THREE.FogExp2(T.world.fogColor, T.world.fogDensity)
    scene.fog = this.fog
    scene.background = new THREE.Color(T.world.fogColor)
    this.ambient = new THREE.AmbientLight(T.world.ambient, T.world.ambientIntensity); scene.add(this.ambient)
    this.hemi = new THREE.HemisphereLight(T.world.hemiSky, T.world.hemiGround, T.world.hemiIntensity); scene.add(this.hemi)
    this.moon = new THREE.DirectionalLight(T.world.moonColor, T.world.moonIntensity); this.moon.position.set(-80, 120, -60); scene.add(this.moon)
    this.pool = new LightPool(scene)

    // Céu: esfera enorme escura com gradiente por vértice
    const skyGeo = new THREE.SphereGeometry(1200, 24, 12)
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x030a12) }, bottom: { value: new THREE.Color(T.world.fogColor) }, dawn: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float dawn; varying vec3 vP;
        void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); vec3 c = mix(bottom, top, pow(h, 0.6));
        vec3 dawnC = mix(vec3(0.95,0.55,0.25), vec3(0.35,0.55,0.8), pow(h,0.5)); c = mix(c, dawnC, dawn); gl_FragColor = vec4(c,1.0); }`,
    })
    this.sky = new THREE.Mesh(skyGeo, skyMat); scene.add(this.sky)

    this.terrain = buildTerrain(); scene.add(this.terrain)
    scene.add(buildForest(this.grid))

    // Mar
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshLambertMaterial({ color: 0x03111c }))
    sea.rotation.x = -Math.PI / 2; sea.position.set(300, -22, -700); scene.add(sea)

    this.buildAct1()
    this.buildRoad()
    this.buildSawmill()
    this.lighthouse = this.buildAct3()
    this.buildBoundary()
  }

  h(x: number, z: number) { return heightAt(x, z) }

  // ---------- Ato 1: floresta ----------
  private buildAct1() {
    const s = this.scene, p = this.pool, g = this.grid
    this.havens.push(buildCabin(s, p, g, -10, 4))
    this.restSpots.push({ pos: new THREE.Vector3(-8, 0, 7.2), kind: 'radio', radius: 4, played: false, lines: [
      'Rádio KCDR: "...e a serraria fecha de vez esta semana. A prefeitura pede que ninguém circule pela mata depois do escurecer."',
      'Rádio KCDR: "O farol de Cedar Hollow segue apagado há três noites. A Guarda Costeira não comenta."',
    ] })
    // Poste isolado no meio da floresta (ilha de luz)
    this.havens.push(buildLampPost(s, p, g, -12, -88, { rotY: 0.6 }))
    this.havens.push(buildLampPost(s, p, g, 26, -172, { rotY: -1.2, flicker: 0.5 }))
    this.restSpots.push({ pos: new THREE.Vector3(4, 0, -132), kind: 'tv', radius: 4, played: false, lines: [
      'TV (estática): "...moradores relatam vultos entre os pinheiros. Um lenhador desaparecido foi visto voltando para casa. Ele não falava."',
    ] })
    buildRadioSpot(s, g, 4, -132, 'tv')
    buildRocks(s, g, [[-6, -60, 1.6], [14, -110, 2.0], [-20, -150, 1.8], [40, -200, 2.2], [6, -240, 1.5], [45, -240, 1.7]])
  }

  // ---------- Estrada ----------
  private buildRoad() {
    const s = this.scene, p = this.pool, g = this.grid
    const road = new THREE.Mesh(new THREE.PlaneGeometry(MAP.roadX[1] - MAP.roadX[0], 9), new THREE.MeshLambertMaterial({ color: 0x2e2a25 }))
    road.rotation.x = -Math.PI / 2; road.position.set((MAP.roadX[0] + MAP.roadX[1]) / 2, 0.04, MAP.roadZ); s.add(road)
    // Postes espaçados: alguns queimados, um piscando
    const lamps: [number, boolean, number][] = [[-40, true, 0], [-4, true, 0], [36, false, 0], [74, true, 0.6], [112, false, 0], [150, true, 0], [188, false, 0], [226, true, 0.3]]
    for (const [x, on, fl] of lamps) this.havens.push(buildLampPost(s, p, g, x, MAP.roadZ - 5.5, { on, flicker: fl, rotY: Math.PI / 2 }))
    // Carro abandonado
    const car = new THREE.Group(); car.position.set(96, heightAt(96, MAP.roadZ + 1), MAP.roadZ + 1); car.rotation.y = 0.3
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 2), new THREE.MeshLambertMaterial({ color: 0x3d4a52 })); body.position.y = 0.9; car.add(body)
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), new THREE.MeshLambertMaterial({ color: 0x2a343a })); cab.position.set(-0.2, 1.95, 0); car.add(cab)
    s.add(car); g.add({ x: 96, z: MAP.roadZ + 1, r: 2.2, tag: 'prop' })
    this.restSpots.push({ pos: new THREE.Vector3(98, 0, MAP.roadZ + 3), kind: 'radio', radius: 4, played: false, lines: [
      'Rádio do carro: "...se você está ouvindo, fique perto da luz. Não confie em ninguém que ande sem sombra."',
    ] })
  }

  // ---------- Ato 2: serraria ----------
  private buildSawmill() {
    const s = this.scene, p = this.pool, g = this.grid
    const m = MAP.sawmill
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(m.x1 - m.x0, m.z1 - m.z0), new THREE.MeshLambertMaterial({ color: 0x2a2e30 }))
    yard.rotation.x = -Math.PI / 2; yard.position.set(m.cx, 0.03, m.cz); s.add(yard)
    // Cerca com portão norte (entrada pela estrada) e sul (saída para a trilha)
    buildFence(s, g, [[m.x0, m.z1], [m.x1, m.z1], [m.x1, m.z0], [m.x0, m.z0], [m.x0, m.z1]], [[m.cx, m.z1], [m.cx, m.z0]])
    // Placa/portão
    const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 0.2), new THREE.MeshLambertMaterial({ color: 0x4a3524 })); sign.position.set(m.cx, 3.5, m.z1); s.add(sign)
    const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), new THREE.MeshLambertMaterial({ color: 0x3a2a1c })); post1.position.set(m.cx - 3, 2, m.z1); s.add(post1)
    const post2 = post1.clone(); post2.position.x = m.cx + 3; s.add(post2)
    // Pilhas de toras, esteiras, galpões
    buildLogPile(s, g, m.x0 + 18, m.z1 - 22, 0.2); buildLogPile(s, g, m.x0 + 26, m.z1 - 36, 1.4); buildLogPile(s, g, m.x0 + 16, m.z1 - 52, 0.1, 8)
    buildLogPile(s, g, m.x1 - 20, m.z1 - 20, 1.2); buildLogPile(s, g, m.x1 - 30, m.z1 - 42, 0.4, 7); buildLogPile(s, g, m.x1 - 18, m.z1 - 60, 1.5)
    buildLogPile(s, g, m.cx + 4, m.z0 + 22, 0.9, 7); buildLogPile(s, g, m.cx - 22, m.z0 + 14, 0.0)
    buildConveyor(s, g, m.cx - 8, m.z1 - 30, 0.35, 20); buildConveyor(s, g, m.cx + 20, m.z0 + 40, 1.2, 16)
    buildShed(s, g, m.x0 + 22, m.z0 + 26, 14, 10, 4.5, 'e'); buildShed(s, g, m.x1 - 22, m.z1 - 40, 12, 9, 4.2, 'w')
    buildShed(s, g, m.cx + 30, m.z1 - 14, 9, 7, 4, 'w')
    // Escavadeira abandonada (set piece: vai ser possuída)
    // (a malha é criada pelo sistema de inimigos quando o evento dispara)
    // Geradores: 3 setores (oeste, leste, sul)
    const genDefs: [number, number, number, [number, number][]][] = [
      [m.x0 + 12, m.z1 - 12, 0.4, [[m.x0 + 8, m.z1 - 30], [m.x0 + 30, m.z1 - 8]]],
      [m.x1 - 12, m.z1 - 30, -0.6, [[m.x1 - 8, m.z1 - 10], [m.x1 - 8, m.z1 - 55]]],
      [m.cx, m.z0 + 12, 2.1, [[m.cx - 28, m.z0 + 8], [m.cx + 28, m.z0 + 8]]],
    ]
    genDefs.forEach(([x, z, rot, floods], i) => {
      const gen = buildGenerator(s, p, g, x, z, rot)
      const fl = floods.map(([fx, fz]) => buildFloodTower(s, p, g, fx, fz, x, z))
      this.havens.push(gen, ...fl)
      this.generators.push({ haven: gen, floods: fl, id: i, on: false, body: gen.body })
    })
    // Sala de descanso com TV no galpão sul
    this.restSpots.push({ pos: new THREE.Vector3(m.x0 + 22, 0, m.z0 + 26), kind: 'tv', radius: 4, played: false, lines: [
      'TV (estática): "...a serraria Hollow & Filhos encerrou o turno da noite depois que o gerador principal falhou. Os funcionários não voltaram."',
    ] })
    buildRadioSpot(s, g, m.x0 + 22, m.z0 + 26, 'tv')
    // Um poste na estrada em frente ao portão
    this.havens.push(buildLampPost(s, p, g, m.cx + 6, m.z1 + 8, { rotY: Math.PI / 2 }))
  }

  // ---------- Ato 3: morro e farol ----------
  private buildAct3(): Lighthouse {
    const s = this.scene, p = this.pool, g = this.grid
    // Postes na rampa: só alguns acesos, criando corridas de pânico
    const rampLamps: [number, boolean, number][] = [[0.12, true, 0], [0.32, false, 0], [0.48, true, 0.7], [0.66, false, 0], [0.84, true, 0]]
    for (const [t, on, fl] of rampLamps) {
      const [x, z] = rampPoint(t)
      // poste no lado interno da rampa
      const dx = MAP.hill.cx - x, dz = MAP.hill.cz - z, L = Math.hypot(dx, dz)
      const px = x + (dx / L) * 3.2, pz = z + (dz / L) * 3.2
      this.havens.push(buildLampPost(s, p, g, px, pz, { on, flicker: fl, rotY: Math.atan2(-dx, -dz) + Math.PI / 2 }))
    }
    // Poste no pé do morro e no início da trilha
    this.havens.push(buildLampPost(s, p, g, 262, -384, { rotY: 0.3 }))
    this.havens.push(buildLampPost(s, p, g, 296, -440, { rotY: -0.5, flicker: 0.4 }))
    // Pedras cercando a rampa
    const rocks: [number, number, number][] = []
    for (let t = 0.02; t < 1; t += 0.045) {
      const [x, z] = rampPoint(t)
      const dx = x - MAP.hill.cx, dz = z - MAP.hill.cz, L = Math.hypot(dx, dz)
      rocks.push([x + (dx / L) * 5.5, z + (dz / L) * 5.5, 1.4 + (t * 7 % 1)])
      if (t > 0.1) rocks.push([x - (dx / L) * 5.2, z - (dz / L) * 5.2, 1.2 + (t * 5 % 1)])
    }
    buildRocks(s, g, rocks)
    // Rádio na cabana do faroleiro
    const lx = MAP.lighthouse.x, lz = MAP.lighthouse.z
    buildRadioSpot(s, g, lx - 9, lz + 6, 'radio')
    this.restSpots.push({ pos: new THREE.Vector3(lx - 9, 0, lz + 6), kind: 'radio', radius: 4, played: false, lines: [
      'Rádio do faroleiro: "...o painel está atrás da porta. Se a luz voltar, eles não têm onde se esconder. Não deixe a escuridão te alcançar antes."',
    ] })
    const lh = buildLighthouse(s, g, lx, lz)
    return lh
  }

  private buildBoundary() {
    // Pedras invisíveis nas bordas do mapa
    const b = { x0: -170, x1: 470, z0: -660, z1: 100 }
    for (let x = b.x0; x <= b.x1; x += 4) { this.grid.add({ x, z: b.z0, r: 3, tag: 'bound' }); this.grid.add({ x, z: b.z1, r: 3, tag: 'bound' }) }
    for (let z = b.z0; z <= b.z1; z += 4) { this.grid.add({ x: b.x0, z, r: 3, tag: 'bound' }); this.grid.add({ x: b.x1, z, r: 3, tag: 'bound' }) }
  }

  setGenerator(id: number, on: boolean) {
    const gen = this.generators[id]; if (!gen) return
    gen.on = on; gen.haven.on = on; applyHavenVisual(gen.haven)
    for (const f of gen.floods) { f.on = on; applyHavenVisual(f) }
  }

  /** Retorna o haven (luz segura) que contém o ponto, ou null. */
  havenAt(x: number, z: number, margin = 0): Haven | null {
    let best: Haven | null = null, bd = Infinity
    for (const h of this.havens) {
      if (!h.on) continue
      const d = Math.hypot(x - h.pos.x, z - h.pos.z)
      if (d < h.radius + margin && d < bd) { best = h; bd = d }
    }
    return best
  }

  update(dt: number, time: number, playerPos: THREE.Vector3) {
    this.pool.update(playerPos, time)
    this.sky.position.copy(playerPos)
    // Farol gira
    const lh = this.lighthouse
    if (lh.on) {
      lh.angle += dt * 0.55
      lh.beam.rotation.y = lh.angle
      lh.lampLight.target.position.set(Math.sin(lh.angle) * 60, -20, Math.cos(lh.angle) * 60)
    }
  }

  setDawn(v: number) {
    const sm = this.sky.material as THREE.ShaderMaterial
    sm.uniforms.dawn.value = v
    this.fog.color.setHex(T.world.fogColor).lerp(new THREE.Color(0x8fa8c0), v)
    ;(this.scene.background as THREE.Color).copy(this.fog.color)
    this.ambient.intensity = T.world.ambientIntensity + v * 2.5
    this.hemi.intensity = T.world.hemiIntensity + v * 2.0
    this.moon.intensity = T.world.moonIntensity + v * 2.5
    this.moon.color.setHex(T.world.moonColor).lerp(new THREE.Color(0xffd8a8), v)
    this.fog.density = T.world.fogDensity * (1 - v * 0.6)
  }
}
