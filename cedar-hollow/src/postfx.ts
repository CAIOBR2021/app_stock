import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { T } from './tuning'
import { damp } from './util'

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: T.postfx.grain },
    vignette: { value: T.postfx.vignette },
    desat: { value: 0 },      // vida baixa
    hurt: { value: 0 },       // vermelho nas bordas
    flash: { value: 0 },      // flash branco do estouro
    distort: { value: 0 },    // distorção radial ao queimar
    darkness: { value: 0 },   // fade para preto (morte)
    pulse: { value: 0 },      // batimento
    lowBatt: { value: 0 },
    slowmo: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, grain, vignette, desat, hurt, flash, distort, darkness, pulse, lowBatt, slowmo;
    varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5; float r = length(c);
      // distorção radial + aberração cromática (queimando)
      float d = distort * 0.06 * (0.3 + sin(time*40.0)*0.1);
      vec2 uvd = uv + c * d * (r*r) * 4.0;
      float ca = distort * 0.006 + slowmo * 0.004;
      vec3 col;
      col.r = texture2D(tDiffuse, uvd + c * ca).r;
      col.g = texture2D(tDiffuse, uvd).g;
      col.b = texture2D(tDiffuse, uvd - c * ca).b;
      // dessaturação por vida baixa (+ pulso)
      float lum = dot(col, vec3(0.299,0.587,0.114));
      float ds = clamp(desat + pulse * 0.25, 0.0, 1.0);
      col = mix(col, vec3(lum) * vec3(0.9, 0.95, 1.05), ds);
      // vermelho de dano nas bordas
      col = mix(col, vec3(0.55, 0.02, 0.0), hurt * smoothstep(0.2, 0.75, r));
      // vinheta
      float v = smoothstep(0.85, 0.25, r * (1.0 + vignette * 0.8));
      col *= mix(1.0, v, vignette);
      // bateria baixa: piscada ambarada fraca
      col += vec3(0.25, 0.12, 0.0) * lowBatt * (0.5 + 0.5 * sin(time * 9.0)) * smoothstep(0.3, 0.7, r);
      // grão de filme
      float g = (rnd(uv * vec2(1920.0, 1080.0) + fract(time * 13.0)) - 0.5) * grain * (1.0 + ds);
      col += g;
      // flash branco e escuridão
      col = mix(col, vec3(1.0, 0.97, 0.9), clamp(flash, 0.0, 1.0));
      col *= (1.0 - darkness);
      gl_FragColor = vec4(col, 1.0);
    }`,
}

export class PostFX {
  composer: EffectComposer
  final: ShaderPass
  after: AfterimagePass
  bloom?: UnrealBloomPass
  // valores alvo controlados pelo jogo
  flash = 0; hurt = 0; distort = 0; darkness = 0; desat = 0; slowmo = 0; lowBatt = 0; pulse = 0
  motion = 0
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))
    if (T.postfx.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), T.postfx.bloomStrength, 0.6, 0.85)
      this.composer.addPass(this.bloom)
    }
    this.after = new AfterimagePass(0)
    this.composer.addPass(this.after)
    this.final = new ShaderPass(FinalShader)
    this.composer.addPass(this.final)
    this.composer.addPass(new OutputPass())
    this.resize()
  }
  resize() {
    const w = innerWidth, h = innerHeight
    this.composer.setSize(w, h)
    this.bloom?.setSize(w / 2, h / 2)
  }
  update(dt: number, time: number) {
    const u = this.final.uniforms
    u.time.value = time
    u.flash.value = damp(u.flash.value, this.flash, 12, dt)
    u.hurt.value = damp(u.hurt.value, this.hurt, 5, dt)
    u.distort.value = damp(u.distort.value, this.distort, 8, dt)
    u.darkness.value = damp(u.darkness.value, this.darkness, 3, dt)
    u.desat.value = damp(u.desat.value, this.desat, 3, dt)
    u.slowmo.value = damp(u.slowmo.value, this.slowmo, 8, dt)
    u.lowBatt.value = damp(u.lowBatt.value, this.lowBatt, 4, dt)
    u.pulse.value = this.pulse
    ;(this.after.uniforms as any).damp.value = T.postfx.motionBlur > 0 ? Math.min(0.85, this.motion * T.postfx.motionBlur * 3 + this.slowmo * 0.5) : 0
    this.flash *= Math.max(0, 1 - dt * 6)
  }
  render() { this.composer.render() }
}
