/**
 * Lê um valor do localStorage de forma segura.
 * Retorna o fallback se:
 *  - o localStorage não estiver disponível (modo privado, SSR)
 *  - o valor salvo estiver corrompido (JSON inválido)
 *  - a chave não existir
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Salva um valor no localStorage de forma segura.
 * Não lança exceção em caso de falha (ex: storage cheio).
 */
export function safeLocalStorageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silencia erros de quota ou acesso negado
  }
}