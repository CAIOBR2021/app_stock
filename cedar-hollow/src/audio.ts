import { T } from './tuning'
import { clamp, damp } from './util'

export type MusicState = 'silence' | 'tense' | 'combat' | 'haven' | 'none'

/** Todo o áudio é sintetizado com WebAudio: nada de assets externos. */
export class AudioSys {
  ctx: AudioContext | null = null
  master!: GainNode
  sfx!: GainNode
  music!: GainNode
  private noiseBuf!: AudioBuffer
  private started = false
  // contínuos
  private focusOsc?: OscillatorNode; private focusGain?: GainNode; private focusFilter?: BiquadFilterNode
  private heartT = 0
  private layers: Record<string, GainNode> = {}
  private musicState: MusicState = 'none'
  private combatSeq = 0
  private havenSeq = 0
  private nextBeat = 0
  windGain?: GainNode
  private ambientOsc: OscillatorNode[] = []

  init() {
    if (this.started) return
    this.started = true
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.ctx = ctx
    this.master = ctx.createGain(); this.master.gain.value = T.audio.master; this.master.connect(ctx.destination)
    this.sfx = ctx.createGain(); this.sfx.gain.value = T.audio.sfx; this.sfx.connect(this.master)
    this.music = ctx.createGain(); this.music.gain.value = T.audio.music; this.music.connect(this.master)
    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.startWind()
    this.startMusicLayers()
  }
  resume() { this.ctx?.resume() }

  private noise(dur: number, gainV: number, filterType: BiquadFilterType, freq: number, q = 1, dest?: AudioNode, when = 0) {
    const ctx = this.ctx!; const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q
    const g = ctx.createGain(); g.gain.value = gainV
    src.connect(f); f.connect(g); g.connect(dest ?? this.sfx)
    const t = ctx.currentTime + when
    src.start(t); src.stop(t + dur + 0.05)
    return { src, f, g, t }
  }
  private tone(freq: number, dur: number, gainV: number, type: OscillatorType = 'sine', dest?: AudioNode, when = 0) {
    const ctx = this.ctx!; const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq
    const g = ctx.createGain(); g.gain.value = gainV
    o.connect(g); g.connect(dest ?? this.sfx)
    const t = ctx.currentTime + when
    o.start(t); o.stop(t + dur + 0.05)
    return { o, g, t }
  }
  private env(g: GainNode, t: number, a: number, d: number, peak: number, sustain = 0) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a)
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d)
  }

  play(name: string, opt: { pan?: number; vol?: number } = {}) {
    if (!this.ctx) return
    const ctx = this.ctx, v = opt.vol ?? 1
    switch (name) {
      case 'shot': {
        const n = this.noise(0.25, 0, 'lowpass', 1800); this.env(n.g, n.t, 0.003, 0.22, 0.9 * v)
        const t = this.tone(120, 0.3, 0); this.env(t.g, t.t, 0.002, 0.25, 0.8 * v); t.o.frequency.exponentialRampToValueAtTime(40, t.t + 0.3)
        const c = this.noise(0.08, 0, 'highpass', 3000); this.env(c.g, c.t, 0.001, 0.07, 0.5 * v)
        break
      }
      case 'ricochet': {
        const f = 2400 + Math.random() * 2200
        const t = this.tone(f, 0.35, 0, 'triangle'); this.env(t.g, t.t, 0.002, 0.3, 0.35 * v); t.o.frequency.exponentialRampToValueAtTime(f * 1.8, t.t + 0.25)
        const n = this.noise(0.12, 0, 'bandpass', 5000, 3); this.env(n.g, n.t, 0.001, 0.1, 0.4 * v)
        break
      }
      case 'hitFlesh': { const n = this.noise(0.2, 0, 'lowpass', 600); this.env(n.g, n.t, 0.003, 0.18, 0.7 * v); const t = this.tone(90, 0.2, 0); this.env(t.g, t.t, 0.002, 0.15, 0.5 * v); break }
      case 'reloadClick': { const n = this.noise(0.06, 0, 'bandpass', 3200, 6); this.env(n.g, n.t, 0.001, 0.05, 0.5 * v); const t = this.tone(1800, 0.05, 0, 'square'); this.env(t.g, t.t, 0.001, 0.04, 0.12 * v); break }
      case 'empty': { const t = this.tone(1200, 0.05, 0, 'square'); this.env(t.g, t.t, 0.001, 0.04, 0.15 * v); break }
      case 'click': { const n = this.noise(0.04, 0, 'highpass', 2000); this.env(n.g, n.t, 0.001, 0.03, 0.5 * v); break }
      case 'focusStart': { const t = this.tone(400, 0.15, 0, 'triangle'); this.env(t.g, t.t, 0.01, 0.12, 0.12 * v); break }
      case 'burst': {
        const n = this.noise(0.6, 0, 'lowpass', 4000); this.env(n.g, n.t, 0.005, 0.5, 1.0 * v)
        const t = this.tone(900, 0.5, 0, 'sine'); this.env(t.g, t.t, 0.005, 0.45, 0.5 * v); t.o.frequency.exponentialRampToValueAtTime(90, t.t + 0.45)
        const h = this.tone(2400, 0.3, 0, 'sine'); this.env(h.g, h.t, 0.002, 0.25, 0.25 * v)
        break
      }
      case 'dodge': { const n = this.noise(0.3, 0, 'bandpass', 900, 1.5); this.env(n.g, n.t, 0.05, 0.25, 0.4 * v); n.f.frequency.exponentialRampToValueAtTime(300, n.t + 0.3); break }
      case 'hurt': { const n = this.noise(0.35, 0, 'lowpass', 500); this.env(n.g, n.t, 0.005, 0.3, 0.9 * v); const t = this.tone(60, 0.4, 0); this.env(t.g, t.t, 0.005, 0.35, 0.7 * v); break }
      case 'enemyHit': { const n = this.noise(0.25, 0, 'bandpass', 700, 2); this.env(n.g, n.t, 0.005, 0.2, 0.6 * v); break }
      case 'enemyDie': {
        const n = this.noise(1.2, 0, 'lowpass', 900); this.env(n.g, n.t, 0.02, 1.1, 0.8 * v); n.f.frequency.exponentialRampToValueAtTime(120, n.t + 1.1)
        const t = this.tone(200, 1.0, 0, 'sawtooth'); this.env(t.g, t.t, 0.02, 0.9, 0.2 * v); t.o.frequency.exponentialRampToValueAtTime(30, t.t + 1.0)
        break
      }
      case 'growl': {
        const t = this.tone(70 + Math.random() * 30, 0.7, 0, 'sawtooth'); this.env(t.g, t.t, 0.05, 0.6, 0.25 * v)
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; t.g.disconnect(); t.g.connect(f); f.connect(this.panNode(opt.pan ?? 0))
        break
      }
      case 'axeThrow': { const n = this.noise(0.5, 0, 'bandpass', 1200, 4); this.env(n.g, n.t, 0.02, 0.45, 0.35 * v); n.f.frequency.exponentialRampToValueAtTime(300, n.t + 0.5); break }
      case 'pickup': { [660, 880, 1320].forEach((f, i) => { const t = this.tone(f, 0.25, 0, 'sine', undefined, i * 0.06); this.env(t.g, t.t, 0.005, 0.22, 0.2 * v) }); break }
      case 'battery': { [520, 780].forEach((f, i) => { const t = this.tone(f, 0.18, 0, 'triangle', undefined, i * 0.09); this.env(t.g, t.t, 0.005, 0.15, 0.25 * v) }); const n = this.noise(0.05, 0, 'highpass', 3000); this.env(n.g, n.t, 0.001, 0.04, 0.3 * v); break }
      case 'batteryDead': { const t = this.tone(300, 0.3, 0, 'square'); this.env(t.g, t.t, 0.005, 0.25, 0.1 * v); t.o.frequency.exponentialRampToValueAtTime(80, t.t + 0.3); break }
      case 'page': { [523, 659, 784, 1046].forEach((f, i) => { const t = this.tone(f, 0.9, 0, 'sine', undefined, i * 0.12); this.env(t.g, t.t, 0.01, 0.8, 0.18 * v) }); break }
      case 'thermos': { const t = this.tone(1046, 0.4, 0, 'sine'); this.env(t.g, t.t, 0.005, 0.35, 0.2 * v); break }
      case 'flare': { const n = this.noise(8, 0, 'bandpass', 2500, 0.8); this.env(n.g, n.t, 0.1, 7.5, 0.35 * v); break }
      case 'generator': {
        const t = this.tone(40, 3, 0, 'sawtooth'); this.env(t.g, t.t, 0.3, 2.5, 0.35 * v, 0.2); t.o.frequency.exponentialRampToValueAtTime(110, t.t + 2.5)
        const n = this.noise(3, 0, 'lowpass', 300); this.env(n.g, n.t, 0.3, 2.5, 0.3 * v)
        break
      }
      case 'floodOn': { const n = this.noise(0.4, 0, 'highpass', 2500); this.env(n.g, n.t, 0.005, 0.35, 0.5 * v); const t = this.tone(220, 0.5, 0, 'sine'); this.env(t.g, t.t, 0.01, 0.45, 0.3 * v); break }
      case 'flash': { const n = this.noise(1.5, 0, 'highpass', 1500); this.env(n.g, n.t, 0.01, 1.4, 0.7 * v); break }
      case 'crow': { for (let i = 0; i < 3; i++) { const t = this.tone(1400 + Math.random() * 600, 0.12, 0, 'sawtooth', undefined, i * 0.13); this.env(t.g, t.t, 0.01, 0.1, 0.08 * v); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 3; t.g.disconnect(); t.g.connect(f); f.connect(this.sfx) } break }
      case 'rumble': { const t = this.tone(35, 1.5, 0, 'sine'); this.env(t.g, t.t, 0.1, 1.3, 0.8 * v); const n = this.noise(1.5, 0, 'lowpass', 120); this.env(n.g, n.t, 0.1, 1.3, 0.8 * v); break }
      case 'checkpoint': { [392, 523, 659, 784].forEach((f, i) => { const t = this.tone(f, 1.2, 0, 'triangle', this.music, i * 0.15); this.env(t.g, t.t, 0.02, 1.1, 0.14 * v) }); break }
      case 'radio': {
        for (let i = 0; i < 12; i++) { const n = this.noise(0.2, 0, 'bandpass', 500 + Math.random() * 1500, 6, undefined, i * 0.22); this.env(n.g, n.t, 0.02, 0.15, 0.06 * v) }
        break
      }
      case 'step': { const n = this.noise(0.08, 0, 'lowpass', 500 + Math.random() * 300); this.env(n.g, n.t, 0.002, 0.07, 0.12 * v); break }
      case 'death': {
        const t = this.tone(160, 4, 0, 'sawtooth', this.music); this.env(t.g, t.t, 0.1, 3.8, 0.3 * v); t.o.frequency.exponentialRampToValueAtTime(30, t.t + 3.5)
        const n = this.noise(4, 0, 'lowpass', 400); this.env(n.g, n.t, 0.2, 3.6, 0.5 * v)
        break
      }
    }
  }

  private panNode(pan: number) {
    const p = this.ctx!.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); p.connect(this.sfx); return p
  }

  /** Sussurro direcional: pan indica de onde o inimigo vem. */
  whisper(pan: number, behind: boolean) {
    if (!this.ctx) return
    const ctx = this.ctx
    const p = this.panNode(pan)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = behind ? 900 : 2400; lp.connect(p)
    for (let i = 0; i < 6; i++) {
      const n = this.noise(0.35, 0, 'bandpass', 700 + Math.random() * 1800, 8, lp, i * 0.28 + Math.random() * 0.1)
      this.env(n.g, n.t, 0.06, 0.28, 0.5)
      n.f.frequency.exponentialRampToValueAtTime(400 + Math.random() * 800, n.t + 0.3)
    }
    const t = this.tone(55, 2.2, 0, 'sine', p); this.env(t.g, t.t, 0.5, 1.6, 0.25)
  }

  setFocus(level: number, burn: number, dt: number) {
    if (!this.ctx) return
    const ctx = this.ctx
    if (level > 0.01 && !this.focusOsc) {
      this.focusOsc = ctx.createOscillator(); this.focusOsc.type = 'sawtooth'; this.focusOsc.frequency.value = 55
      this.focusFilter = ctx.createBiquadFilter(); this.focusFilter.type = 'lowpass'; this.focusFilter.frequency.value = 200; this.focusFilter.Q.value = 6
      this.focusGain = ctx.createGain(); this.focusGain.gain.value = 0
      this.focusOsc.connect(this.focusFilter); this.focusFilter.connect(this.focusGain); this.focusGain.connect(this.sfx); this.focusOsc.start()
    }
    if (this.focusOsc && this.focusGain && this.focusFilter) {
      const g = this.focusGain.gain.value
      this.focusGain.gain.value = damp(g, level * (0.08 + burn * 0.3), 10, dt)
      this.focusFilter.frequency.value = damp(this.focusFilter.frequency.value, 200 + burn * 2600, 6, dt)
      this.focusOsc.frequency.value = damp(this.focusOsc.frequency.value, 55 + burn * 180, 6, dt)
      if (level < 0.01 && g < 0.002) { this.focusOsc.stop(); this.focusOsc.disconnect(); this.focusOsc = undefined }
    }
  }

  heartbeat(healthFrac: number, dt: number) {
    if (!this.ctx) return
    if (healthFrac > 0.6) return
    const rate = 0.9 + (1 - healthFrac) * 1.4
    this.heartT += dt * rate
    if (this.heartT >= 1) {
      this.heartT = 0
      const vol = 0.3 + (1 - healthFrac) * 0.6
      const t = this.tone(50, 0.18, 0); this.env(t.g, t.t, 0.01, 0.15, vol)
      const t2 = this.tone(45, 0.15, 0, 'sine', undefined, 0.17); this.env(t2.g, t2.t, 0.01, 0.12, vol * 0.7)
    }
  }

  private startWind() {
    const ctx = this.ctx!
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 0.7
    const g = ctx.createGain(); g.gain.value = 0.05
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 180
    lfo.connect(lg); lg.connect(f.frequency); lfo.start()
    src.connect(f); f.connect(g); g.connect(this.sfx); src.start()
    this.windGain = g
    // cricket-ish / drone leve
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 38
    const og = ctx.createGain(); og.gain.value = 0.03; o.connect(og); og.connect(this.sfx); o.start()
    this.ambientOsc.push(o)
  }

  private startMusicLayers() {
    const ctx = this.ctx!
    const mk = (name: string) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(this.music); this.layers[name] = g; return g }
    // Drone tenso: duas dentes-de-serra desafinadas em segunda menor com filtro
    const tense = mk('tense')
    const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 500; tf.connect(tense)
    for (const f of [55, 58.27, 110.5]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.12; o.connect(g); g.connect(tf); o.start() }
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.25; const lg = ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(tf.frequency); lfo.start()
    // Haven: pad em acorde maior
    const haven = mk('haven')
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 1200; hf.connect(haven)
    for (const f of [130.8, 164.8, 196, 261.6]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.07; o.connect(g); g.connect(hf); o.start() }
    mk('combat')
    mk('havenMel')
  }

  setMusic(state: MusicState) { if (state !== this.musicState) { this.musicState = state; this.combatSeq = 0; this.nextBeat = 0 } }

  updateMusic(dt: number) {
    if (!this.ctx) return
    const ctx = this.ctx, t = ctx.currentTime
    const target = { tense: this.musicState === 'tense' ? 0.7 : this.musicState === 'combat' ? 0.5 : 0, haven: this.musicState === 'haven' ? 0.8 : 0 }
    for (const [k, v] of Object.entries(target)) { const g = this.layers[k]; g.gain.value = damp(g.gain.value, v, k === 'haven' ? 1.5 : 2.5, dt) }
    // Percussão de combate: sequência agendada
    if (this.musicState === 'combat') {
      if (t >= this.nextBeat) {
        const bpm = 138, beat = 60 / bpm
        const step = this.combatSeq % 8
        if ([0, 3, 5].includes(step)) { const k = this.tone(60, 0.25, 0, 'sine', this.layers.combat); this.env(k.g, k.t, 0.005, 0.22, 0.9); k.o.frequency.exponentialRampToValueAtTime(30, k.t + 0.2) }
        if ([2, 6].includes(step)) { const s = this.noise(0.18, 0, 'bandpass', 1800, 1.5, this.layers.combat); this.env(s.g, s.t, 0.002, 0.16, 0.5) }
        if (step % 2 === 1) { const h = this.noise(0.05, 0, 'highpass', 6000, 1, this.layers.combat); this.env(h.g, h.t, 0.001, 0.04, 0.15) }
        if (step === 4) { const tm = this.tone(90, 0.3, 0, 'sine', this.layers.combat); this.env(tm.g, tm.t, 0.005, 0.28, 0.5); tm.o.frequency.exponentialRampToValueAtTime(50, tm.t + 0.25) }
        this.combatSeq++; this.nextBeat = t + beat / 2
        this.layers.combat.gain.value = 0.6
      }
    } else this.layers.combat.gain.value = damp(this.layers.combat.gain.value, 0, 3, dt)
    // Melodia de haven: arpejo em Dó maior com eco
    if (this.musicState === 'haven') {
      if (t >= this.nextBeat) {
        const notes = [261.6, 329.6, 392, 523.3, 392, 329.6, 293.7, 349.2]
        const f = notes[this.havenSeq % notes.length]
        const n = this.tone(f, 1.4, 0, 'triangle', this.layers.havenMel); this.env(n.g, n.t, 0.02, 1.3, 0.18)
        const n2 = this.tone(f * 2, 0.9, 0, 'sine', this.layers.havenMel, 0.35); this.env(n2.g, n2.t, 0.02, 0.8, 0.06)
        this.havenSeq++; this.nextBeat = t + 0.46
        this.layers.havenMel.gain.value = 1
      }
    } else this.layers.havenMel.gain.value = damp(this.layers.havenMel.gain.value, 0, 2, dt)
  }
}
