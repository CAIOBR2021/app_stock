import { rampPoint, MAP } from './world/terrain'

export interface PageDef { id: string; x: number; z: number; title: string; text: string }
export interface ThermosDef { x: number; z: number }

const r = (t: number) => rampPoint(t)
const M = MAP.sawmill

/** Páginas do manuscrito: em segunda pessoa, cada uma antecipa o próximo minuto de jogo. */
export const PAGES: PageDef[] = [
  { id: 'p1', x: -1, z: -6, title: 'Página 1 — A cabana', text: 'Você vai sair da cabana com a lanterna na mão. Antes do primeiro poste, vai ouvir sussurros vindo de trás de você. Quando o lenhador sair da escuridão, você vai entender que balas não servem para nada até a luz comê-lo por inteiro.' },
  { id: 'p13', x: -14, z: 9, title: 'Página 13 — Termos', text: 'Você vai encontrar garrafas de café pelo caminho. Não perguntam nada. Só lembram que alguém esteve aqui antes de você e continuou andando. Você vai contá-las sem saber por quê.' },
  { id: 'p2', x: -9, z: -78, title: 'Página 2 — O poste', text: 'Você vai parar sob o poste e sentir a dor ir embora. Eles vão rondar no limite da luz, sem coragem de entrar. Mas o poste não caminha com você. Quando você sair do halo, dois deles já vão estar esperando.' },
  { id: 'p3', x: 12, z: -146, title: 'Página 3 — Asas', text: 'Depois da TV, você vai ouvir asas. Muitas. O bando vai descer sobre você em círculos e só o foco da lanterna, segurado no centro deles, vai dispersá-lo. Não desperdice balas com pássaros.' },
  { id: 'p4', x: 24, z: -214, title: 'Página 4 — A estrada', text: 'Você vai ver a estrada entre as árvores e vai correr. Dois deles vão sair das laterais, e um terceiro, mais tarde, das suas costas. A luz do poste na estrada vai ser o fim do primeiro capítulo.' },
  { id: 'p5', x: -6, z: MAP.roadZ + 3, title: 'Página 5 — Distância', text: 'Na estrada, um deles vai preferir a distância. Você vai ouvir o machado cortando o ar antes de vê-lo. Um passo para o lado no momento certo e ele vai passar raspando, e o mundo vai ficar lento por um instante.' },
  { id: 'p6', x: 124, z: MAP.roadZ - 3, title: 'Página 6 — Três geradores', text: 'No portão da serraria, você vai ler a placa e saber que a luz do pátio está morta. Três geradores. Cada um vai gritar quando você puxar a corda, e eles vão vir correndo enquanto suas mãos estiverem ocupadas.' },
  { id: 'p7', x: M.x0 + 20, z: M.z1 - 16, title: 'Página 7 — O Bruto', text: 'Quando o primeiro gerador pegar, você vai achar que acabou. Então o chão vai tremer, e algo grande vai sair de trás das toras. O escudo dele não cai com uma pilha só. Você vai recuar para a luz para não morrer.' },
  { id: 'p8', x: M.x1 - 16, z: M.z1 - 24, title: 'Página 8 — A escavadeira', text: 'O terceiro gerador vai acender o sul. E a escavadeira parada junto ao portão vai ligar os faróis sem ninguém no volante. Ela não sente balas. Só a luz, e muita.' },
  { id: 'p9', x: 268, z: -394, title: 'Página 9 — A subida', text: 'Você vai subir o morro sem munição. Não procure balas: não há. Procure os postes. Correr entre eles é a única coisa que vai te manter vivo. Eles vão vir das suas costas o tempo todo.' },
  { id: 'p10', x: r(0.26)[0], z: r(0.26)[1], title: 'Página 10 — O trecho escuro', text: 'No meio da subida, o poste vai estar apagado. Você vai ter de atravessar aquele trecho escuro com eles nos calcanhares, e o sinalizador vai comprar oito segundos. Use-os.' },
  { id: 'p11', x: r(0.72)[0], z: r(0.72)[1], title: 'Página 11 — Seis segundos', text: 'No alto, o painel do farol vai pedir seis segundos das suas mãos. Seis segundos sem lanterna. Você vai ouvir todos eles chegando e vai precisar terminar mesmo assim.' },
  { id: 'p12', x: MAP.lighthouse.x + 7, z: MAP.lighthouse.z + 10, title: 'Página 12 — O que sobe', text: 'Quando a luz do farol girar, algo vai subir da escuridão que nenhuma lanterna alcança. Você não vai vencê-lo com o revólver. Você vai fazê-lo ficar parado onde o feixe passa, uma volta atrás da outra.' },
]

export const THERMOS: ThermosDef[] = [
  { x: -12, z: 1 }, { x: -18, z: -60 }, { x: 10, z: -112 }, { x: 40, z: -196 },
  { x: 100, z: MAP.roadZ + 4 }, { x: 200, z: MAP.roadZ - 3 },
  { x: M.x0 + 24, z: M.z0 + 28 }, { x: M.cx + 24, z: M.z0 + 44 },
  { x: r(0.55)[0], z: r(0.55)[1] }, { x: MAP.lighthouse.x - 9, z: MAP.lighthouse.z + 8 },
]
