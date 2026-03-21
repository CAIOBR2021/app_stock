/**
 * Remove caracteres de controle e espaços extras de strings
 * antes de inseri-las em documentos PDF.
 * Evita quebras de layout causadas por \n, \t etc.
 */
export function sanitizePdfString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\x00-\x1F\x7F]/g, ' ') // remove caracteres de controle
    .replace(/\s+/g, ' ')              // colapsa espaços múltiplos
    .trim();
}