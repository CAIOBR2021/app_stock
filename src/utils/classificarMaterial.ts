import { API_URL } from '../constants';

export interface ClassificacaoMaterial {
  categoria?: string;
  unidade?: string;
  descricao?: string;
}

export async function classificarMaterial(nome: string): Promise<ClassificacaoMaterial | null> {
  if (!nome.trim()) return null;

  try {
    const res = await fetch(`${API_URL}/classificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() }),
    });

    if (!res.ok) return null;
    return await res.json() as ClassificacaoMaterial;
  } catch {
    return null;
  }
}
