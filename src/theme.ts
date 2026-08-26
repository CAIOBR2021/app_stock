import { useCallback, useEffect, useState } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from './utils/storage';

/**
 * Preferência de tema do operador.
 *
 * 'sistema' não é um terceiro visual: é a ausência de escolha, seguindo o
 * que o Windows/Android já está usando. Guardar essa opção — em vez de
 * resolvê-la uma vez e salvar 'claro'/'escuro' — é o que faz o app
 * acompanhar o agendamento de modo noturno do sistema operacional.
 */
export type Tema = 'claro' | 'escuro' | 'sistema';

export const TEMA_STORAGE_KEY = 'tema';

const ehTema = (v: unknown): v is Tema =>
  v === 'claro' || v === 'escuro' || v === 'sistema';

/** Preferência salva; qualquer coisa fora do esperado cai em 'sistema'. */
export function lerTemaSalvo(): Tema {
  const salvo = safeLocalStorageGet<unknown>(TEMA_STORAGE_KEY, 'sistema');
  return ehTema(salvo) ? salvo : 'sistema';
}

const queryEscuro = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

/** Traduz a preferência para o tema realmente pintado na tela. */
export function resolverTema(tema: Tema): 'claro' | 'escuro' {
  if (tema !== 'sistema') return tema;
  return queryEscuro()?.matches ? 'escuro' : 'claro';
}

/**
 * Carimba o tema no <html>.
 *
 * São dois atributos porque são dois sistemas de cor convivendo: `data-theme`
 * comanda os tokens do design system (styles.css) e `data-bs-theme` comanda os
 * componentes do Bootstrap 5.3 que a gente não sobrescreveu — dropdown, modal,
 * list-group, .text-muted, .bg-light. Sem o segundo, sobram ilhas brancas.
 */
function aplicarEfetivo(efetivo: 'claro' | 'escuro'): void {
  const raiz = document.documentElement;
  const valor = efetivo === 'escuro' ? 'dark' : 'light';
  raiz.setAttribute('data-theme', valor);
  raiz.setAttribute('data-bs-theme', valor);

  // Devolve ao CSS o fundo da raiz. O script de boot do index.html grava um
  // background-color inline no <html> para não piscar branco antes do CSS
  // chegar; se ele ficasse, congelaria a cor do tema INICIAL e apareceria uma
  // faixa da cor antiga em toda área que o <body> não cobre — a calha da barra
  // de rolagem, o overscroll. Sem esse inline, o fundo do body se propaga
  // para o canvas, que é o comportamento correto.
  raiz.style.removeProperty('background-color');
}

/** Versão que aceita a preferência crua (inclusive 'sistema'). */
export function aplicarTema(tema: Tema): void {
  aplicarEfetivo(resolverTema(tema));
}

/**
 * Estado do tema + persistência + acompanhamento do sistema.
 *
 * Devolve `efetivo` além de `tema` porque a interface precisa dos dois: o
 * seletor marca a preferência ('sistema'), enquanto o ícone do botão mostra o
 * que está valendo agora (sol ou lua).
 */
export function useTema() {
  const [tema, setTemaState] = useState<Tema>(lerTemaSalvo);
  // Espelho do SO. Só entra na conta quando a preferência é 'sistema', mas o
  // listener fica sempre ligado: é uma inscrição barata e evita montar e
  // desmontar o observador a cada troca de preferência.
  const [sistemaEscuro, setSistemaEscuro] = useState(() => queryEscuro()?.matches ?? false);

  // Derivado no render, não em efeito: um setState em useEffect só para
  // recalcular isto dispararia um segundo render a cada troca de tema.
  const efetivo: 'claro' | 'escuro' =
    tema === 'sistema' ? (sistemaEscuro ? 'escuro' : 'claro') : tema;

  const setTema = useCallback((novo: Tema) => {
    setTemaState(novo);
    safeLocalStorageSet(TEMA_STORAGE_KEY, novo);
  }, []);

  /** Alterna claro ↔ escuro a partir do que está na tela, fixando a escolha. */
  const alternarTema = useCallback(() => {
    setTema(efetivo === 'escuro' ? 'claro' : 'escuro');
  }, [efetivo, setTema]);

  // Sincroniza o DOM (sistema externo) com o estado do React.
  useEffect(() => {
    aplicarEfetivo(efetivo);
  }, [efetivo]);

  // Inscrição no modo noturno do sistema operacional.
  useEffect(() => {
    const mq = queryEscuro();
    if (!mq) return;
    const aoMudar = (e: MediaQueryListEvent) => setSistemaEscuro(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  // Outra aba trocou o tema: reflete aqui em vez de sair dessincronizado.
  useEffect(() => {
    const aoStorage = (e: StorageEvent) => {
      if (e.key !== TEMA_STORAGE_KEY) return;
      setTemaState(lerTemaSalvo());
    };
    window.addEventListener('storage', aoStorage);
    return () => window.removeEventListener('storage', aoStorage);
  }, []);

  return { tema, efetivo, setTema, alternarTema };
}
