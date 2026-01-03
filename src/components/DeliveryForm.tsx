import React, { useState, useEffect } from 'react';

// Interfaces baseadas no retorno do seu server.js
interface Produto {
  id: string;
  sku: string; // O código do produto
  nome: string;
  unidade: string;
  localArmazenamento: string; // Útil para enviar na entrega
}

interface EntregaHistorico {
  localObra: string;
  responsavelNome: string;
  responsavelTelefone: string;
}

interface ResponsavelInfo {
  nome: string;
  telefone: string;
}

const DeliveryForm: React.FC = () => {
  // --- ESTADOS DO FORMULÁRIO ---
  const [nomeProduto, setNomeProduto] = useState('');
  const [codigo, setCodigo] = useState(''); // SKU
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  
  const [destino, setDestino] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState(''); // Nota: O backend atual não tem campo observação na tabela entregas, mas mantive no form.

  // --- ESTADOS DE DADOS (Vindos da API) ---
  const [listaProdutos, setListaProdutos] = useState<Produto[]>([]);
  const [listaDestinos, setListaDestinos] = useState<string[]>([]);
  const [listaResponsaveis, setListaResponsaveis] = useState<ResponsavelInfo[]>([]);
  const [carregando, setCarregando] = useState(true);

  // --- 1. BUSCAR DADOS AO INICIAR ---
  useEffect(() => {
    const fetchDados = async () => {
      try {
        // A. Busca Produtos
        const resProd = await fetch('http://localhost:10000/api/produtos');
        const produtos: Produto[] = await resProd.json();
        setListaProdutos(produtos);

        // B. Busca Histórico de Entregas para montar sugestões
        const resEntregas = await fetch('http://localhost:10000/api/entregas');
        const entregas: EntregaHistorico[] = await resEntregas.json();

        // Extrai Destinos Únicos
        const destinosUnicos = Array.from(new Set(entregas.map(e => e.localObra).filter(Boolean)));
        setListaDestinos(destinosUnicos);

        // Extrai Responsáveis Únicos (Map para evitar duplicatas de nome)
        const mapResponsaveis = new Map<string, string>();
        entregas.forEach(e => {
          if (e.responsavelNome && e.responsavelTelefone) {
            mapResponsaveis.set(e.responsavelNome, e.responsavelTelefone);
          }
        });
        
        const responsaveisUnicos: ResponsavelInfo[] = Array.from(mapResponsaveis).map(([nome, telefone]) => ({
          nome,
          telefone
        }));
        setListaResponsaveis(responsaveisUnicos);

      } catch (error) {
        console.error("Erro ao carregar dados do banco:", error);
      } finally {
        setCarregando(false);
      }
    };

    fetchDados();
  }, []);

  // --- 2. LÓGICA DE SELEÇÃO DE PRODUTO ---
  const handleProdutoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoNome = e.target.value;
    setNomeProduto(novoNome);

    // Busca exata ou parcial no array carregado
    const produto = listaProdutos.find(p => p.nome.toLowerCase() === novoNome.toLowerCase());
    
    if (produto) {
      setCodigo(produto.sku);
      setProdutoSelecionado(produto);
    } else {
      setCodigo('');
      setProdutoSelecionado(null);
    }
  };

  // --- 3. LÓGICA DE SELEÇÃO DE RESPONSÁVEL ---
  const handleResponsavelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoResponsavel = e.target.value;
    setResponsavel(novoResponsavel);

    const info = listaResponsaveis.find(r => r.nome.toLowerCase() === novoResponsavel.toLowerCase());
    if (info) {
      setTelefone(info.telefone);
    }
  };

  // --- 4. ENVIAR PEDIDO PARA API ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produtoSelecionado) {
      alert("Por favor, selecione um produto válido da lista.");
      return;
    }

    const payload = {
      produtoId: produtoSelecionado.id,
      itemQuantidade: Number(quantidade),
      localObra: destino, // Mapeando para o campo do backend
      responsavelNome: responsavel,
      responsavelTelefone: telefone,
      dataHoraSolicitacao: new Date().toISOString(),
      // O backend exige localArmazenamento, usamos o padrão do produto ou um genérico
      localArmazenamento: produtoSelecionado.localArmazenamento || 'Estoque Central', 
    };

    try {
      const response = await fetch('http://localhost:10000/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Pedido registrado com sucesso!");
        // Limpar form
        setNomeProduto('');
        setCodigo('');
        setDestino('');
        setResponsavel('');
        setTelefone('');
        setQuantidade('');
        setObservacao('');
        // Recarregar histórico para atualizar datalists (opcional)
      } else {
        const erro = await response.json();
        alert(`Erro ao registrar: ${erro.error}`);
      }
    } catch (error) {
      console.error("Erro de conexão:", error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Solicitação de Material</h2>
      
      {carregando && <p className="text-blue-600 mb-4">Carregando dados do estoque...</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* GRUPO: PRODUTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nome do Produto</label>
            <input
              list="lista-produtos"
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={nomeProduto}
              onChange={handleProdutoChange}
              placeholder="Digite o nome..."
              autoComplete="off"
            />
            <datalist id="lista-produtos">
              {listaProdutos.map((prod) => (
                <option key={prod.id} value={prod.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Código</label>
            <input
              type="text"
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm border p-2 cursor-not-allowed text-gray-600"
              value={codigo}
              placeholder="Automático"
            />
          </div>
        </div>

        {/* GRUPO: DESTINO */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Destino (Obra)</label>
          <input
            list="lista-destinos"
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Para onde vai?"
            autoComplete="off"
          />
          <datalist id="lista-destinos">
            {listaDestinos.map((local, index) => (
              <option key={index} value={local} />
            ))}
          </datalist>
        </div>

        {/* GRUPO: RESPONSÁVEL E TELEFONE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Responsável</label>
            <input
              list="lista-responsaveis"
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={responsavel}
              onChange={handleResponsavelChange}
              placeholder="Nome do recebedor"
              autoComplete="off"
            />
            <datalist id="lista-responsaveis">
              {listaResponsaveis.map((resp, index) => (
                <option key={index} value={resp.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="tel"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
        </div>

        {/* OUTROS CAMPOS */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Quantidade</label>
          <input
            type="number"
            required
            min="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Observação</label>
            <textarea
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Detalhes adicionais (opcional)"
            />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-300"
        >
          {carregando ? 'Carregando...' : 'Registrar Entrega'}
        </button>

      </form>
    </div>
  );
};

export default DeliveryForm;