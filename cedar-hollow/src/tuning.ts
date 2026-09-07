// =====================================================================
//  CEDAR HOLLOW — ARQUIVO DE TUNING CENTRALIZADO
//  Todas as constantes de gameplay ficam aqui. Ajuste e recarregue.
// =====================================================================

export const T = {
  // ---------- Controles ----------
  keys: {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    run: ['Space'],            // segurar
    dodge: ['ShiftLeft', 'ShiftRight'],
    reload: ['KeyR'],
    flare: ['KeyF', 'KeyQ'],
    interact: ['KeyE'],
    flashlightToggle: ['KeyT'],
    pause: ['Escape'],
  },
  mouseSensitivity: 0.0022,
  gamepadSensitivity: 2.6,

  // ---------- Jogador ----------
  player: {
    walkSpeed: 3.6,          // m/s
    runSpeed: 6.2,
    backpedalMul: 0.8,
    staminaSeconds: 5.0,     // segundos correndo
    staminaRecoverSeconds: 4.0,
    staminaMinToRun: 0.15,   // fração mínima para voltar a correr
    maxHealth: 100,
    radius: 0.45,
    height: 1.75,
    hurtInvulnSeconds: 0.35,
    maxSlope: 0.75,          // dh/dist acima disso bloqueia o passo
  },

  // ---------- Esquiva ----------
  dodge: {
    distance: 4.2,           // m
    duration: 0.36,          // s
    iFrames: 0.4,            // s de invulnerabilidade
    cooldown: 1.2,           // s
    nearMissTimeScale: 0.28, // slow-motion cinematográfico
    nearMissSeconds: 0.75,
  },

  // ---------- Lanterna ----------
  flashlight: {
    battery: 100,
    focusDrainPerSecond: 18,     // % por segundo no modo foco
    burnPerSecond: 55,           // pontos de escudo por segundo no centro do foco
    normalConeDeg: 34,           // cone amplo (ângulo total)
    focusConeDeg: 13,
    focusHitHalfAngleDeg: 7.5,   // "centro" do cone que corrói escudo (queima total até 60% disso)
    normalRange: 26,
    focusRange: 30,
    burnFullRange: 16,           // até aqui queima 100%
    burnZeroRange: 26,           // aqui queima 0%
    normalIntensity: 55,
    focusIntensity: 150,
    color: 0xffc16b,
    focusColor: 0xffe1a8,
    lowBatteryWarn: 20,
    normalBeamSlowMul: 0.85,     // inimigo dentro do feixe normal anda mais devagar (sem remover escudo)
    focusSlowMul: 0.35,          // inimigo sendo queimado
  },

  // ---------- Revólver ----------
  revolver: {
    cylinder: 6,
    reloadPerBullet: 2.2,        // s por bala (cancelável)
    damage: 34,                  // só em alvo vulnerável
    range: 60,
    fireCooldown: 0.42,
    hitRadius: 0.8,              // raio da esfera de acerto
    recoil: 0.035,               // rad de coice na câmera
  },

  // ---------- Sinalizador ----------
  flare: {
    radius: 6,
    duration: 8,
    intensity: 90,
    burnPerSecond: 12,           // corrói escudo levemente de quem entra no raio
  },

  // ---------- Safe havens ----------
  haven: {
    lampRadius: 5.2,
    generatorRadius: 9,
    floodRadius: 14,
    healPerSecond: 7,
    enemyKeepOut: 2.5,           // margem extra para inimigos
    approachRetreatDistance: 11, // inimigos recuam até esta distância do centro
  },

  // ---------- Inimigos ----------
  enemies: {
    lumberjack: { shield: 40, hp: 60, speed: 3.9, damage: 18, attackRange: 1.9, windup: 0.55, attackCooldown: 1.3, radius: 0.5, height: 1.9 },
    thrower:    { shield: 80, hp: 60, speed: 3.3, damage: 14, keepDistMin: 8, keepDistMax: 14, throwInterval: 2.6, projectileSpeed: 15, radius: 0.5, height: 2.05 },
    brute:      { shield: 140, hp: 130, speed: 1.9, damage: 42, attackRange: 2.4, windup: 0.9, attackCooldown: 2.0, radius: 0.8, height: 2.5 },
    crowFlock:  { shield: 45, hp: 1, speed: 9, damage: 6, count: 14, radius: 1.5 },
    possessed:  { shield: 220, hp: 1, speed: 5.5, damage: 55, radius: 2.2 },
    shadowKing: { shield: 420, hp: 1, speed: 2.4, damage: 35, radius: 1.4, height: 3.6 },
    staggerSeconds: 2.5,
    shieldRegenDelay: 1.6,       // s sem ser queimado antes de regenerar
    shieldRegenPerSecond: 14,    // pontos por segundo (Bruto regenera mais: ver abaixo)
    bruteShieldRegenPerSecond: 26,
    shieldAfterStagger: 0.5,     // fração do escudo que volta se sobreviver ao stagger
    circleSeconds: [0.5, 1.6],
    circleDistance: 3.4,
    sightRange: 40,
    spawnDistance: [13, 20],
    spawnRiseSeconds: 1.2,
    whisperLeadSeconds: 2.2,     // sussurro antes de materializar
    lightRetreatSpeedMul: 1.15,
    shadowKingFlashlightMul: 0.25,   // lanterna quase não afeta o chefe final
    shadowKingSummonInterval: 12,
    lighthouseBurnPerSecond: 240,    // o feixe do farol resolve o confronto final
  },

  // ---------- Morte / Checkpoint (recursos parciais) ----------
  respawn: {
    minAmmo: 3,
    battery: 55,
    maxSpareBatteries: 1,
    flares: 0,
    healthFraction: 0.7,
  },

  // ---------- Mundo ----------
  world: {
    fogColor: 0x0e2436,
    fogDensity: 0.022,
    ambient: 0x2a5474,
    ambientIntensity: 2.4,
    hemiSky: 0x3a6a94,
    hemiGround: 0x0e1a20,
    hemiIntensity: 1.6,
    moonColor: 0x6a98c4,
    moonIntensity: 1.6,
    exposure: 1.25,
    lampColor: 0xffb454,
    lampIntensity: 28,
    lightPoolSize: 7,            // point lights reutilizáveis para postes/geradores
    treeCount: 2600,
    seed: 1337,
  },

  // ---------- Pós-processamento ----------
  postfx: {
    enabled: true,
    bloom: true,
    bloomStrength: 0.55,
    grain: 0.05,
    vignette: 0.55,
    motionBlur: 0.25,            // 0 = off; peso do afterimage em movimento
    pixelRatioCap: 1.0,
  },

  // ---------- Áudio ----------
  audio: {
    master: 0.8,
    music: 0.55,
    sfx: 0.9,
  },

  debug: {
    godMode: false,
    infiniteBattery: false,
    showColliders: false,
  },
}

export type Tuning = typeof T
