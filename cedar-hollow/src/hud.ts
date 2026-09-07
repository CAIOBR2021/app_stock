import { T } from './tuning'
import { clamp } from './util'
import type { Game } from './game'

export interface Prompt { text: string; progress?: number }

export class HUD {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  prompt: Prompt | null = null
  subtitle = ''
  subtitleT = 0
  hint = ''
  hintT = 0
  objective = ''
  objectiveT = 0
  immuneFlash = 0
  private lastHintKey = ''
  constructor(private game: Game) {
    this.canvas = document.getElementById('hud') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.resize()
  }
  resize() { this.canvas.width = innerWidth; this.canvas.height = innerHeight }
  showHint(key: string, text: string, secs = 5) { if (this.lastHintKey === key) return; this.lastHintKey = key; this.hint = text; this.hintT = secs }
  say(text: string, secs = 6) { this.subtitle = text; this.subtitleT = secs }
  setObjective(text: string) { this.objective = text; this.objectiveT = 6 }

  draw(dt: number, time: number) {
    const c = this.ctx, W = this.canvas.width, H = this.canvas.height, g = this.game
    c.clearRect(0, 0, W, H)
    if (g.state !== 'playing' && g.state !== 'reading') return
    const p = g.player, fl = g.flashlight, rv = g.revolver
    const amber = '#f2c56b', dim = 'rgba(242,197,107,0.35)'
    const cx = W / 2, cy = H / 2
    this.subtitleT -= dt; this.hintT -= dt; this.objectiveT -= dt; this.immuneFlash = Math.max(0, this.immuneFlash - dt)

    // ---- Mira + anel de bateria ----
    const focusing = fl.focusing
    const R = focusing ? 22 : 17
    c.lineWidth = 2.2
    c.strokeStyle = dim
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke()
    const frac = fl.battery / T.flashlight.battery
    const low = fl.battery < T.flashlight.lowBatteryWarn
    c.strokeStyle = low ? `rgba(255,${90 + 80 * Math.abs(Math.sin(time * 8))},60,0.95)` : amber
    c.lineWidth = focusing ? 3.4 : 2.4
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke()
    if (fl.burnIntensity > 0.05) {
      c.strokeStyle = `rgba(255,240,200,${fl.burnIntensity * 0.9})`; c.lineWidth = 1.5
      c.beginPath(); c.arc(cx, cy, R + 6 + Math.sin(time * 30) * 2, 0, Math.PI * 2); c.stroke()
    }
    c.fillStyle = fl.on ? '#fff3d6' : '#666'
    c.beginPath(); c.arc(cx, cy, focusing ? 1.6 : 2.2, 0, Math.PI * 2); c.fill()
    if (!fl.on) { c.fillStyle = '#888'; c.font = '11px Georgia'; c.textAlign = 'center'; c.fillText('lanterna desligada (T)', cx, cy + R + 16) }
    // Stamina: arco fino sob a mira
    if (p.stamina < 0.999) {
      c.strokeStyle = p.exhausted ? 'rgba(255,90,60,0.8)' : 'rgba(180,200,220,0.6)'; c.lineWidth = 2
      c.beginPath(); c.arc(cx, cy, R + 10, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 0.5 * p.stamina); c.stroke()
    }
    // Alvo imune: aviso claro
    if (this.immuneFlash > 0) {
      const a = Math.min(1, this.immuneFlash * 2)
      c.fillStyle = `rgba(150,190,255,${a})`; c.font = 'bold 15px Georgia'; c.textAlign = 'center'
      c.fillText('IMUNE — queime a sombra com o FOCO (botão direito)', cx, cy - R - 22)
    }

    // ---- Cilindro do revólver (canto inferior direito) ----
    const bx = W - 92, by = H - 92, rr = 30
    const rot = rv.reloading ? rv.reloadProgress * (Math.PI / 3) : 0
    c.strokeStyle = 'rgba(200,190,170,0.35)'; c.lineWidth = 1.5
    c.beginPath(); c.arc(bx, by, rr + 12, 0, Math.PI * 2); c.stroke()
    for (let i = 0; i < T.revolver.cylinder; i++) {
      const a = -Math.PI / 2 + (i / T.revolver.cylinder) * Math.PI * 2 + rot
      const x = bx + Math.cos(a) * rr, y = by + Math.sin(a) * rr
      const loaded = i < rv.ammo
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2)
      if (loaded) { c.fillStyle = amber; c.fill() } else { c.strokeStyle = 'rgba(200,190,170,0.4)'; c.lineWidth = 1.5; c.stroke() }
      if (rv.reloading && i === rv.ammo) {
        c.strokeStyle = '#fff'; c.lineWidth = 2
        c.beginPath(); c.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rv.reloadProgress); c.stroke()
      }
    }
    c.fillStyle = rv.reserve > 0 ? 'rgba(232,217,184,0.9)' : 'rgba(255,110,80,0.9)'; c.font = '16px Georgia'; c.textAlign = 'center'
    c.fillText(`${rv.reserve}`, bx, by + rr + 32)
    if (rv.reloading) { c.fillStyle = 'rgba(232,217,184,0.7)'; c.font = '12px Georgia'; c.fillText('recarregando…', bx, by - rr - 20) }
    else if (rv.ammo === 0 && rv.reserve > 0) { c.fillStyle = amber; c.font = '12px Georgia'; c.fillText('R — recarregar', bx, by - rr - 20) }
    else if (rv.ammo === 0 && rv.reserve === 0) { c.fillStyle = 'rgba(255,110,80,0.9)'; c.font = '12px Georgia'; c.fillText('sem munição — corra para a luz', bx, by - rr - 20) }

    // ---- Inventário (canto inferior esquerdo) ----
    const ix = 34, iy = H - 40
    c.textAlign = 'left'; c.font = '15px Georgia'
    const item = (x: number, label: string, n: number, warn = false) => {
      c.fillStyle = warn && n === 0 ? 'rgba(255,110,80,0.9)' : 'rgba(232,217,184,0.9)'
      c.fillText(`${label} ${n}`, x, iy)
    }
    // pilha
    c.fillStyle = fl.spares > 0 ? amber : 'rgba(255,110,80,0.8)'; c.fillRect(ix, iy - 13, 8, 14); c.fillRect(ix + 2, iy - 16, 4, 3)
    item(ix + 16, 'pilhas', fl.spares, true)
    // sinalizador
    c.fillStyle = g.inventory.flares > 0 ? '#ff6a3a' : 'rgba(255,110,80,0.5)'; c.fillRect(ix + 100, iy - 14, 5, 15)
    item(ix + 112, 'sinaliz.', g.inventory.flares)
    // páginas / termos
    c.fillStyle = '#e8dcc0'; c.fillRect(ix + 200, iy - 14, 10, 13)
    item(ix + 216, 'páginas', g.inventory.pages.length)
    c.fillStyle = '#c98a3a'; c.fillRect(ix + 300, iy - 14, 7, 14)
    item(ix + 313, 'café', g.inventory.thermos)

    // ---- Objetivo (topo) ----
    if (this.objectiveT > 0 && this.objective) {
      c.globalAlpha = clamp(this.objectiveT, 0, 1)
      c.fillStyle = amber; c.font = '15px Georgia'; c.textAlign = 'left'; c.fillText(this.objective, 34, 44)
      c.globalAlpha = 1
    }
    // ---- Dica ----
    if (this.hintT > 0) {
      c.globalAlpha = clamp(this.hintT, 0, 1)
      c.fillStyle = '#e8d9b8'; c.font = '17px Georgia'; c.textAlign = 'center'; c.fillText(this.hint, cx, H * 0.2)
      c.globalAlpha = 1
    }
    // ---- Prompt de interação ----
    if (this.prompt) {
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(cx - 160, H - 130, 320, 40)
      c.fillStyle = '#f2e4c4'; c.font = '16px Georgia'; c.textAlign = 'center'; c.fillText(this.prompt.text, cx, H - 104)
      if (this.prompt.progress !== undefined) { c.fillStyle = amber; c.fillRect(cx - 150, H - 96, 300 * clamp(this.prompt.progress, 0, 1), 3) }
    }
    // ---- Legenda ----
    if (this.subtitleT > 0 && this.subtitle) {
      c.globalAlpha = clamp(this.subtitleT, 0, 1)
      c.font = 'italic 17px Georgia'; c.textAlign = 'center'
      const lines = wrap(c, this.subtitle, W * 0.6)
      lines.forEach((l, i) => { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(l, cx + 1, H - 160 + i * 24 + 1); c.fillStyle = '#dfe8ee'; c.fillText(l, cx, H - 160 + i * 24) })
      c.globalAlpha = 1
    }
    // ---- Sinal de haven ----
    if (p.inHaven) { c.fillStyle = 'rgba(242,197,107,0.55)'; c.font = '12px Georgia'; c.textAlign = 'center'; c.fillText('LUZ SEGURA', cx, H - 44) }
  }
}

function wrap(c: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' '), lines: string[] = []; let cur = ''
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur); return lines
}
