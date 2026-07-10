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