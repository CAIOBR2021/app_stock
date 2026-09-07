import * as THREE from 'three'
import { getGlowTexture } from './world/lights'

const MAX = 5000
export class Particles {
  geo = new THREE.BufferGeometry()
  pos = new Float32Array(MAX * 3)
  col = new Float32Array(MAX * 3)
  size = new Float32Array(MAX)
  vel = new Float32Array(MAX * 3)
  life = new Float32Array(MAX)
  maxLife = new Float32Array(MAX)
  grav = new Float32Array(MAX)
  baseSize = new Float32Array(MAX)
  points: THREE.Points
  private next = 0
  constructor(scene: THREE.Scene) {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3))
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: getGlowTexture() } },
      vertexShader: `attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.a, t.a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    })
    this.points = new THREE.Points(this.geo, mat)
    this.points.frustumCulled = false
    scene.add(this.points)
    this.life.fill(0)
  }
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, r: number, g: number, b: number, grav = 0) {
    const i = this.next; this.next = (this.next + 1) % MAX
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz
    this.life[i] = life; this.maxLife[i] = life; this.baseSize[i] = size; this.grav[i] = grav
    this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b
  }
  burst(p: THREE.Vector3, n: number, speed: number, life: number, size: number, color: THREE.Color, grav = 0, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * Math.PI * spread
      const s = speed * (0.4 + Math.random() * 0.6)
      this.emit(p.x, p.y, p.z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + speed * 0.3, Math.sin(a) * Math.cos(e) * s, life * (0.6 + Math.random() * 0.4), size, color.r, color.g, color.b, grav)
    }
  }
  smoke(p: THREE.Vector3, n: number, color: THREE.Color, radius = 0.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius
      this.emit(p.x + Math.cos(a) * r, p.y + (Math.random() - 0.3) * 1.2, p.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 0.6, 0.8 + Math.random() * 0.8, 0.5 + Math.random() * 0.6, color.r, color.g, color.b, -0.4)
    }
  }
  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue }
      this.life[i] -= dt
      const k = this.life[i] / this.maxLife[i]
      this.vel[i * 3 + 1] -= this.grav[i] * dt
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      this.size[i] = this.baseSize[i] * (k < 0.3 ? k / 0.3 : 1)
    }
    ;(this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true
    ;(this.geo.attributes.size as THREE.BufferAttribute).needsUpdate = true
  }
}
