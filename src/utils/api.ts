import { API_URL } from '../constants';

/**
 * Wrapper de fetch para a API do estoque.
 *
 * - Prefixa o path com API_URL.
 * - Serializa `body` como JSON e envia o Content-Type adequado.
 * - Em resposta não-ok, lança Error com a mensagem amigável do backend
 *   (`data.error`) quando o status for < 500; caso contrário, mensagem vazia
 *   para o chamador usar seu próprio fallback.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(res.status < 500 && data?.error ? data.error : '');
  }
  return res.json().catch(() => undefined as T);
}

/**
 * Extrai a mensagem amigável de um erro lançado por apiFetch,
 * usando o fallback quando o erro não trouxer mensagem.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
