import { Game } from './game'
import { T } from './tuning'

// ?quality=low|medium|high — para hardware modesto, low desliga o bloom e reduz a resolução interna
const q = new URLSearchParams(location.search).get('quality')
if (q === 'low') { T.postfx.bloom = false; T.postfx.pixelRatioCap = 0.75; T.postfx.motionBlur = 0 }
if (q === 'high') { T.postfx.pixelRatioCap = 2; T.postfx.bloomStrength = 0.7 }

const game = new Game()
console.log('Cedar Hollow pronto. window.__game disponível para depuração.', !!game)
