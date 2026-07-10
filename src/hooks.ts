import { useState, useEffect } from 'react';

/**
 * Mantém a variável CSS --app-dvh com a altura realmente visível da tela,
 * descontando o teclado virtual.
 *
 * Por que não basta 100dvh: por especificação, dvh IGNORA o teclado. No
 * Android o meta viewport com interactive-widget=resizes-content resolve o
 * layout, mas no iOS o teclado nunca redimensiona o viewport de layout — a
 * única fonte confiável é window.visualViewport.
 *
 * Uso: height: 'var(--app-dvh, 100dvh)' nos contêineres de tela cheia.
 */
export function useAppViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const aplicar = () => {
      document.documentElement.style.setProperty('--app-dvh', `${Math.round(vv.height)}px`);
    };
    aplicar();
    vv.addEventListener('resize', aplicar);
    return () => {
      vv.removeEventListener('resize', aplicar);
      document.documentElement.style.removeProperty('--app-dvh');
    };
  }, []);
}

/**
 * Trava a página enquanto um chat de tela cheia está ativo.
 *
 * Ao focar um input, o navegador rola a página para "revelar" o campo; como
 * as telas de chat têm exatamente a altura visível (--app-dvh), essa rolagem
 * só empurra o app para fora da tela e deixa um vão em branco. Este hook
 * bloqueia o scroll do body e desfaz imediatamente qualquer rolagem espúria.
 */
export function useChatViewportLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const desfazerRolagem = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    const vv = window.visualViewport;
    vv?.addEventListener('resize', desfazerRolagem);
    vv?.addEventListener('scroll', desfazerRolagem);
    window.addEventListener('scroll', desfazerRolagem);
    desfazerRolagem();

    return () => {
      document.body.style.overflow = overflowAnterior;
      vv?.removeEventListener('resize', desfazerRolagem);
      vv?.removeEventListener('scroll', desfazerRolagem);
      window.removeEventListener('scroll', desfazerRolagem);
    };
  }, [ativo]);
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}