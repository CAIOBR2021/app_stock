import { T } from './tuning'

type Action = keyof typeof T.keys

export class Input {
  private down = new Set<string>()
  private pressed = new Set<string>()
  mouseDX = 0
  mouseDY = 0
  lmb = false
  rmb = false
  lmbPressed = false
  locked = false
  wheel = 0
  gamepadIndex = -1
  gpLook = { x: 0, y: 0 }
  gpMove = { x: 0, y: 0 }
  private gpPrev = new Map<number, boolean>()
  private gpPressedNow = new Set<string>()
  private gpDownNow = new Set<string>()

  constructor(private canvas: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return
      this.down.add(e.code); this.pressed.add(e.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
    })
    window.addEventListener('keyup', (e) => this.down.delete(e.code))
    window.addEventListener('blur', () => { this.down.clear(); this.lmb = false; this.rmb = false })
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return
      this.mouseDX += e.movementX; this.mouseDY += e.movementY
    })
    document.addEventListener('mousedown', (e) => {
      if (!this.locked) return
      if (e.button === 0) { this.lmb = true; this.lmbPressed = true }
      if (e.button === 2) this.rmb = true
    })
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.lmb = false
      if (e.button === 2) this.rmb = false
    })
    document.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas
      if (!this.locked) { this.lmb = false; this.rmb = false }
    })
    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index })
  }

  requestLock() {
    try { const r: any = this.canvas.requestPointerLock(); if (r && typeof r.catch === 'function') r.catch(() => {}) } catch { /* ignore */ }
  }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock() }

  isDown(a: Action) { return T.keys[a].some((c) => this.down.has(c)) || this.gpDownNow.has(a) }
  wasPressed(a: Action) { return T.keys[a].some((c) => this.pressed.has(c)) || this.gpPressedNow.has(a) }
  keyPressed(code: string) { return this.pressed.has(code) }

  pollGamepad() {
    this.gpPressedNow.clear(); this.gpDownNow.clear()
    this.gpLook.x = 0; this.gpLook.y = 0; this.gpMove.x = 0; this.gpMove.y = 0
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const gp = pads && this.gamepadIndex >= 0 ? pads[this.gamepadIndex] : null
    if (!gp) return
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : v)
    this.gpMove.x = dz(gp.axes[0] ?? 0); this.gpMove.y = dz(gp.axes[1] ?? 0)
    this.gpLook.x = dz(gp.axes[2] ?? 0); this.gpLook.y = dz(gp.axes[3] ?? 0)
    const map: Record<number, Action | 'fire' | 'focus'> = { 0: 'dodge', 2: 'reload', 3: 'flare', 1: 'interact', 10: 'run', 9: 'pause', 7: 'fire', 6: 'focus', 5: 'fire', 4: 'focus' }
    for (const [idxS, act] of Object.entries(map)) {
      const idx = Number(idxS); const b = gp.buttons[idx]; if (!b) continue
      const now = b.pressed || b.value > 0.5
      const prev = this.gpPrev.get(idx) ?? false
      if (act === 'fire') { if (now && !prev) this.lmbPressed = true; if (now) this.lmb = true }
      else if (act === 'focus') { if (now) this.rmb = true; else if (prev) this.rmb = false }
      else { if (now) this.gpDownNow.add(act); if (now && !prev) this.gpPressedNow.add(act) }
      this.gpPrev.set(idx, now)
    }
  }

  endFrame() { this.pressed.clear(); this.mouseDX = 0; this.mouseDY = 0; this.lmbPressed = false; this.wheel = 0 }
}
