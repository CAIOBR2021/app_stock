# Cedar Hollow

Survival-horror em terceira pessoa inspirado no primeiro *Alan Wake*: uma cidade madeireira decadente, noite fechada, neblina, e o loop **"luz antes da bala"** — os Sombrios só sofrem dano depois que o foco da lanterna queima o escudo de escuridão deles.

Tudo é procedural: primitivas do Three.js, materiais simples e áudio 100% sintetizado com WebAudio. Nenhum asset externo, nenhum asset pago.

## Rodar

```bash
cd cedar-hollow
npm install
npm run dev        # abre http://localhost:5174 no browser
```

Da raiz do repositório também funciona `npm run game` (depois de `npm --prefix cedar-hollow install`).

Build de produção: `npm run build` (saída em `dist/`, estática, serve de qualquer lugar). Verificação de tipos: `npm run typecheck`.

Parâmetro de qualidade na URL para hardware modesto: `http://localhost:5174/?quality=low` (desliga bloom e motion blur, reduz a resolução interna). `?quality=high` sobe a resolução.

## Controles

| Ação | Teclado / mouse | Gamepad |
|---|---|---|
| Mover | WASD | analógico esquerdo |
| Olhar | mouse | analógico direito |
| Atirar (revólver) | botão esquerdo | RT / RB |
| **Foco da lanterna** (queima escudo, drena bateria) | **segurar botão direito** | LT / LB |
| Esquiva (0,4 s de invencibilidade) | Shift | A |
| Correr (5 s de stamina) | segurar Espaço | L3 |
| Recarregar (2,2 s por bala, cancelável) | R | X |
| Sinalizador | F ou Q | Y |
| Interagir / segurar (geradores, painel do farol) | E | B |
| Trocar pilha manualmente | B | — |
| Ligar/desligar lanterna | T | — |
| Pausa | Esc | Start |

Cliques no canvas prendem o mouse (pointer lock). Esc solta e pausa.

## O loop central

1. **Sombrios** surgem envoltos numa aura escura: são **imunes** enquanto o escudo (40 / 80 / 140) existir. Tiro em alvo com escudo mostra faísca, ricochete, aviso "IMUNE" na HUD e gasta a bala.
2. **Lanterna**: feixe normal não gasta bateria e não remove escudo. **Foco** (botão direito) drena ~18 %/s e corrói ~55 pontos/s enquanto o alvo estiver no centro do cone — fumaça, aura clareando, distorção de tela e som crescente até o estouro.
3. Escudo zerado: flash branco, inimigo **atordoado** 2,5 s e vulnerável. Se sobreviver ao atordoamento, parte do escudo volta.
4. **Revólver**: 6 balas, recarga manual bala a bala. Dano só em alvo vulnerável.
5. Bateria (100) só recarrega trocando por pilhas coletadas. Munição e pilhas são escassas de propósito. Sem os dois, corra de **safe haven** em safe haven (postes, geradores, holofotes): dentro do halo você é intocável, a vida regenera e eles recuam.

## Estrutura (20–30 min)

- **Ato I — A Floresta**: tutorial diegético da lanterna, primeiros Lenhadores, corvos possuídos, chegada à estrada.
- **Ato II — A Serraria**: estrada com Arremessadores; arena com três geradores (segurar E) que iluminam o pátio por setor e limpam os Sombrios do setor; Bruto; escavadeira possuída como set piece.
- **Ato III — O Farol**: subida em espiral sob perseguição contínua, sem munição no caminho, postes apagados; religar o holofote (6 s sem lanterna) e um confronto final resolvido pelo feixe rotativo do farol, não pelo revólver. Epílogo com amanhecer.

Cada ato e cada gerador salva checkpoint. Morrer volta ao último checkpoint com **recursos parciais** (mínimo de 3 balas, 55 de bateria, no máximo 1 pilha, sem sinalizadores, 70 % de vida).

13 páginas de manuscrito (em segunda pessoa, cada uma antecipa o que acontece no minuto seguinte), rádios/TVs como pontos de descanso narrativo, 10 garrafas térmicas de café como colecionável secundário.

## Tuning

**Todas** as constantes de gameplay ficam em [`src/tuning.ts`](src/tuning.ts): velocidades, stamina, esquiva, drenagem/queima da lanterna, revólver, sinalizador, raios dos safe havens, escudos/HP/dano dos inimigos, regen de escudo, recursos ao renascer, neblina/iluminação, pós-processamento, áudio e flags de debug (`godMode`, `infiniteBattery`).

Layout do mapa (posições da trilha, estrada, serraria, morro e farol) em `src/world/terrain.ts` (`MAP`). Páginas, termos e pontos de recurso em `src/narrative.ts` e `src/pickups.ts`. Gatilhos dos atos, checkpoints e ondas em `src/director.ts`.

## Arquitetura

```
src/
  main.ts          entrada (+ ?quality=)
  game.ts          loop, estados (menu/jogo/leitura/morte/fim), sinalizadores, música reativa, API window.__game
  tuning.ts        constantes
  player.ts        movimento, stamina, esquiva, dano; câmera em terceira pessoa
  flashlight.ts    dois modos, bateria, fator de queima por ângulo/distância
  revolver.ts      6 balas, recarga bala a bala cancelável, raycast
  enemies.ts       Lenhador / Arremessador / Bruto / corvos / escavadeira / chefe; FSM; escudo; projéteis
  director.ts      três atos, gatilhos, checkpoints, geradores, painel do farol, ondas, final
  pickups.ts       pilhas, munição, sinalizadores, páginas, termos
  narrative.ts     textos das páginas
  hud.ts           HUD diegética (anel de bateria na mira, cilindro, inventário, prompts)
  postfx.ts        bloom, afterimage (motion blur), grão, vinheta, distorção, dessaturação por vida
  audio.ts         SFX, sussurros direcionais, batimento, trilha reativa — tudo sintetizado
  particles.ts     sistema de partículas único
  world/           terreno + rampa espiral, floresta instanciada, colisão em grade, props, pool de luzes
```

Depuração no console do browser: `__game.debug.state()`, `__game.debug.teleport(x, z)`, `__game.debug.spawn('brute')`, `__game.debug.checkpoint('gate')`, `__game.debug.info()` (draw calls / triângulos / fps).
