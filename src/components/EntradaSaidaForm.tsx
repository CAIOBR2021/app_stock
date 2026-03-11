import React, { useState, useMemo } from 'react';
import { Form, Button, Card, Row, Col, ListGroup, InputGroup } from 'react-bootstrap';
import { BoxArrowInRight, BoxArrowRight, Check2Circle } from 'react-bootstrap-icons';
import type { Produto } from '../types';

interface ProdutoSelecionado {
  produtoId: string;
  quantidade: number;
  valorUnitario?: number;
}

interface EntradaSaidaFormProps {
  produtos: Produto[];
  onSubmit: (dados: {
    ordemCompra: string;
    nomeObra: string;
    tipo: 'entrada' | 'saida';
    itens: ProdutoSelecionado[];
  }) => void;
}

export function EntradaSaidaForm({ produtos, onSubmit }: EntradaSaidaFormProps) {
  const [ordemCompra, setOrdemCompra] = useState('');
  const [nomeObra, setNomeObra] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  
  const [selecionados, setSelecionados] = useState<Record<string, { quantidade: number, valorUnitario: number }>>({});
  const [busca, setBusca] = useState('');

  const produtosDisponiveis = useMemo(() => {
    return produtos.filter(p => {
      const atendeBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.sku.toLowerCase().includes(busca.toLowerCase());
      const atendeEstoque = tipo === 'entrada' || p.quantidade > 0;
      return atendeBusca && atendeEstoque;
    });
  }, [produtos, tipo, busca]);

  const handleToggleProduto = (p: Produto) => {
    setSelecionados(prev => {
      const novo = { ...prev };
      if (novo[p.id]) {
        delete novo[p.id];
      } else {
        // Usa 0 caso o valorUnitario venha como null do banco
        novo[p.id] = { quantidade: 1, valorUnitario: p.valorUnitario || 0 };
      }
      return novo;
    });
  };

  const handleChangeQuantidade = (id: string, qtd: number) => {
    if (qtd <= 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], quantidade: qtd } }));
  };

  const handleChangeValor = (id: string, valor: number) => {
    if (valor < 0) return;
    setSelecionados(prev => ({ ...prev, [id]: { ...prev[id], valorUnitario: valor } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itens = Object.entries(selecionados).map(([produtoId, dados]) => ({
      produtoId,
      quantidade: dados.quantidade,
      // Envia o valorUnitario sempre, seja para entrada ou para saída (histórico de custos)
      valorUnitario: dados.valorUnitario
    }));
    
    onSubmit({ ordemCompra, nomeObra, tipo, itens });
    
    setOrdemCompra('');
    setNomeObra('');
    setSelecionados({});
  };

  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold text-muted small text-uppercase">Ordem de Compra</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Ex: OC-2026-001" 
                  value={ordemCompra} 
                  onChange={(e) => setOrdemCompra(e.target.value)} 
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold text-muted small text-uppercase">Nome da Obra</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Informe o local ou nome da obra..." 
                  value={nomeObra} 
                  onChange={(e) => setNomeObra(e.target.value)} 
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small text-uppercase mb-3 d-block">Tipo de Movimentação</Form.Label>
            <div className="d-flex gap-3">
              <Button 
                variant={tipo === 'entrada' ? 'success' : 'outline-success'} 
                className="d-flex align-items-center gap-2 flex-grow-1 justify-content-center py-2"
                onClick={() => { setTipo('entrada'); setSelecionados({}); }}
              >
                <BoxArrowInRight size={20} /> ENTRADA
              </Button>
              <Button 
                variant={tipo === 'saida' ? 'danger' : 'outline-danger'} 
                className="d-flex align-items-center gap-2 flex-grow-1 justify-content-center py-2"
                onClick={() => { setTipo('saida'); setSelecionados({}); }}
              >
                <BoxArrowRight size={20} /> SAÍDA
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold text-muted small text-uppercase">Selecionar Produtos</Form.Label>
            <InputGroup className="mb-3">
              <Form.Control 
                placeholder="Buscar produto por nome ou SKU..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </InputGroup>
            
            <div className="border rounded-3 overflow-auto" style={{ maxHeight: '350px' }}>
              <ListGroup variant="flush">
                {produtosDisponiveis.length === 0 ? (
                  <ListGroup.Item className="text-center text-muted py-4">Nenhum produto disponível para esta operação.</ListGroup.Item>
                ) : (
                  produtosDisponiveis.map(p => {
                    const selecionado = selecionados[p.id];
                    const isSelected = !!selecionado;
                    return (
                      <ListGroup.Item key={p.id} className={`d-flex align-items-center justify-content-between ${isSelected ? 'bg-light' : ''}`}>
                        <Form.Check 
                          type="checkbox"
                          id={`check-${p.id}`}
                          label={
                            <div>
                              <span className="fw-medium">{p.nome}</span>
                              <div className="text-muted small">
                                SKU: {p.sku} | Estoque: {p.quantidade} {p.unidade} 
                                {tipo === 'saida' && typeof p.valorUnitario === 'number' && ` | Preço Médio: R$ ${p.valorUnitario.toFixed(2)}`}
                              </div>
                            </div>
                          }
                          checked={isSelected}
                          onChange={() => handleToggleProduto(p)}
                        />
                        {isSelected && (
                          <div className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
                            {tipo === 'entrada' && (
                              <div style={{ width: '160px' }}>
                                <InputGroup size="sm">
                                  <InputGroup.Text>R$</InputGroup.Text>
                                  <Form.Control 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    value={selecionado.valorUnitario === 0 ? '' : selecionado.valorUnitario} 
                                    onChange={(e) => handleChangeValor(p.id, Number(e.target.value))}
                                    placeholder="Valor Unit."
                                  />
                                </InputGroup>
                              </div>
                            )}
                            
                            <div style={{ width: '130px' }}>
                              <InputGroup size="sm">
                                <Form.Control 
                                  type="number" 
                                  min="1" 
                                  max={tipo === 'saida' ? p.quantidade : undefined}
                                  value={selecionado.quantidade} 
                                  onChange={(e) => handleChangeQuantidade(p.id, Number(e.target.value))}
                                />
                                <InputGroup.Text>{p.unidade}</InputGroup.Text>
                              </InputGroup>
                            </div>
                          </div>
                        )}
                      </ListGroup.Item>
                    );
                  })
                )}
              </ListGroup>
            </div>
          </Form.Group>

          <div className="text-end">
            <Button 
              variant="primary" 
              type="submit" 
              size="lg" 
              disabled={Object.keys(selecionados).length === 0}
              className="px-5 rounded-pill shadow-sm d-flex align-items-center gap-2 ms-auto"
            >
              <Check2Circle size={20} />
              Confirmar {tipo === 'entrada' ? 'Entrada' : 'Saída'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}