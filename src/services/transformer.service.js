/**
 * Serviço para transformar dados do Magazord para o formato GHL
 * REGRAS:
 * - Email OU Telefone são OBRIGATÓRIOS (preferencialmente os dois)
 * - Dados completos dependem do status
 * - Entrega só quando aplicável (pedidos aprovados com rastreio)
 */
class TransformerService {
  
  /**
   * Valida se tem dados de contato mínimos (email OU telefone)
   */
  validarDadosContato(cliente) {
    const temEmail = cliente?.email && cliente.email.trim() !== '';
    const temTelefone = cliente?.telefone && cliente.telefone.trim() !== '';
    
    return temEmail || temTelefone;
  }

  /**
   * Extrai dados de pessoa do pedido/carrinho e cliente da API
   */
  extrairDadosPessoa(dados, clienteAPI) {
    // DEBUG: Log para verificar dados recebidos
    if (clienteAPI) {
      console.log(`      🔍 DEBUG clienteAPI:`, JSON.stringify({
        nome: clienteAPI.nome,
        email: clienteAPI.email,
        telefone: clienteAPI.telefone
      }));
    }
    
    // Priorizar dados do clienteAPI (email completo da API /pessoa/{id})
    const email = (clienteAPI?.email || dados.pessoaEmail || dados.email || '').trim();
    const telefone = (dados.pessoaContato || clienteAPI?.telefone || dados.telefone || '').trim();
    const nome = (clienteAPI?.nome || dados.pessoaNome || dados.nome || 'Cliente').trim();
    
    console.log(`      📧 DEBUG pessoa extraída:`, JSON.stringify({ nome, email, telefone }));
    
    return {
      nome,
      email,
      telefone
    };
  }

  /**
   * Transforma carrinho aberto para formato GHL
   * Status 1 - Carrinho Aberto
   * Dados obrigatórios: pessoa (email/telefone), itens, valor_total
   */
  transformarCarrinhoAberto(carrinho, cliente) {
    const pessoa = this.extrairDadosPessoa(carrinho, cliente);
    
    // VALIDAÇÃO OBRIGATÓRIA: Não envia se não tiver contato
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Carrinho ${carrinho.id} sem dados de contato - IGNORADO`);
      return null;
    }

    return {
      tipo_evento: 'carrinho_aberto',
      carrinho_id: carrinho.id,
      status: {
        codigo: 1,
        descricao: 'Carrinho Aberto',
        data_atualizacao: carrinho.dataAtualizacao || carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa,
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'aberto',
        status_codigo: 1,
        valor_total: carrinho.valor_total || carrinho.valorTotal || '0.00',
        itens: this.transformarItens(carrinho.itens || [])
      },
      pedido: {
        status_codigo: 0
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `CART-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma carrinho abandonado
   * Status 4 - Carrinho Abandonado
   * Dados obrigatórios: pessoa (email/telefone), itens, valor_total
   */
  transformarCarrinhoAbandonado(carrinho, cliente) {
    const pessoa = this.extrairDadosPessoa(carrinho, cliente);
    
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Carrinho abandonado ${carrinho.id} sem dados de contato - IGNORADO`);
      return null;
    }

    return {
      tipo_evento: 'carrinho_abandonado',
      carrinho_id: carrinho.id,
      status: {
        codigo: 4,
        descricao: 'Carrinho Abandonado',
        data_atualizacao: carrinho.dataAtualizacao || carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa,
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'abandonado',
        status_codigo: 4,
        valor_total: carrinho.valor_total || carrinho.valorTotal || '0.00',
        itens: this.transformarItens(carrinho.itens || [])
      },
      pedido: {
        status_codigo: 0
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `CART-ABANDONED-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma carrinho em checkout (aguardando pagamento)
   * Status 2 - Aguardando Pagamento
   * Dados obrigatórios: pessoa, itens, valor_total, forma_pagamento
   */
  transformarCarrinhoCheckout(carrinho, cliente) {
    const pessoa = this.extrairDadosPessoa(carrinho, cliente);
    
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Carrinho checkout ${carrinho.id} sem dados de contato - IGNORADO`);
      return null;
    }

    return {
      tipo_evento: 'carrinho_checkout',
      carrinho_id: carrinho.id,
      status: {
        codigo: 2,
        descricao: 'Comprou (Aguardando Pagamento)',
        data_atualizacao: carrinho.dataAtualizacao || carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa,
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'checkout',
        status_codigo: 2,
        valor_total: carrinho.valor_total || carrinho.valorTotal || '0.00',
        forma_pagamento: carrinho.forma_pagamento || carrinho.formaPagamento || 'Não informado',
        itens: this.transformarItens(carrinho.itens || [])
      },
      pedido: {
        status_codigo: 1,
        valor_total: carrinho.valor_total || carrinho.valorTotal || '0.00',
        forma_pagamento: carrinho.forma_pagamento || carrinho.formaPagamento || 'Não informado',
        itens: this.transformarItens(carrinho.itens || [])
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `CART-CHECKOUT-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma pedido completo
   * Dados obrigatórios: pessoa, pedido completo
   * Dados condicionais: entrega (só quando tem rastreio)
   */
  transformarPedido(pedido, carrinho = null, rastreamento = null) {
    // Extrai pessoa do pedido ou carrinho (usando clienteAPI se disponível)
    const pessoa = this.extrairDadosPessoa(pedido, pedido.clienteAPI);
    
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Pedido ${pedido.id} sem dados de contato - IGNORADO`);
      return null;
    }

    const statusDescricao = this.getStatusDescricao(pedido.status);
    const temRastreio = rastreamento && (rastreamento.codigo || rastreamento.codigoRastreio);

    const statusCodigo = pedido.pedidoSituacao || pedido.status || 0;
    
    const evento = {
      tipo_evento: this.getTipoEventoPedido(statusCodigo),
      pedido_id: pedido.id,
      pedido_codigo: pedido.codigo || `PEDIDO-${pedido.id}`,
      status: {
        codigo: statusCodigo,
        descricao: this.getStatusDescricao(statusCodigo),
        data_atualizacao: pedido.dataHora || pedido.dataAtualizacao || pedido.data_atualizacao || new Date().toISOString()
      },
      pessoa,
      carrinho: {
        status_codigo: carrinho ? (carrinho.status || 0) : 0
      },
      pedido: {
        status_codigo: statusCodigo,
        data_pedido: pedido.dataHora || pedido.dataPedido || pedido.data_pedido || new Date().toISOString(),
        valor_total: pedido.valorTotal || pedido.valor_total || '0.00',
        forma_pagamento: pedido.formaPagamentoNome || pedido.formaPagamento || pedido.forma_pagamento || 'Não informado',
        link_pagamento: pedido.linkPagamento || pedido.link_pagamento || null,
        itens: this.transformarItens(pedido.itens || [])
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `MGZ-PEDIDO-${pedido.id}`
      }
    };

    // Adiciona dados de entrega APENAS se tiver rastreio
    if (temRastreio) {
      evento.entrega = {
        status: 'rastreavel',
        codigo_rastreio: rastreamento.codigoRastreio || rastreamento.codigo || '',
        transportadora: rastreamento.transportadora || '',
        link_rastreio: rastreamento.linkRastreio || rastreamento.link || '',
        previsao_entrega: rastreamento.previsaoEntrega || '',
        data_postagem: rastreamento.dataPostagem || '',
        endereco_entrega: pedido.enderecoEntrega || null,
        eventos: rastreamento.eventos || []
      };
    } else {
      // Sem rastreio - apenas indica que não está disponível ainda
      evento.entrega = {
        status: 'aguardando',
        codigo_rastreio: '',
        transportadora: '',
        link_rastreio: '',
        previsao_entrega: '',
        data_postagem: '',
        endereco_entrega: null,
        eventos: []
      };
    }

    return evento;
  }

  /**
   * Transforma itens do carrinho/pedido
   */
  transformarItens(itens) {
    if (!Array.isArray(itens)) return [];
    
    return itens.map(item => ({
      produto_id: item.produto_id || item.produtoId || item.id,
      descricao: item.descricao || item.nome || 'Produto',
      quantidade: item.quantidade || item.qtd || 1,
      valor_unitario: item.valor_unitario || item.valorUnitario || item.preco || '0.00',
      valor_total: item.valor_total || item.valorTotal || '0.00'
    }));
  }

  /**
   * Retorna tipo_evento específico baseado no status do pedido
   * NUNCA MAIS GENÉRICO!
   */
  getTipoEventoPedido(status) {
    const tipoEventoMap = {
      0: 'pedido_credito_aprovado',
      1: 'pedido_aguardando_pagamento',
      2: 'pedido_pagamento_analise',
      3: 'pedido_pago',
      4: 'pedido_aprovado',
      5: 'pedido_em_separacao',
      6: 'pedido_enviado',
      7: 'pedido_entregue',
      8: 'pedido_cancelado',
      9: 'pedido_devolvido'
    };
    
    return tipoEventoMap[status] || `pedido_status_${status}`;
  }

  /**
   * Retorna descrição do status do pedido
   */
  getStatusDescricao(status) {
    const statusMap = {
      0: 'Crédito e Cadastro Aprovados',
      1: 'Aguardando Pagamento',
      2: 'Pagamento em Análise',
      3: 'Pago',
      4: 'Aprovado',
      5: 'Em Separação',
      6: 'Enviado',
      7: 'Entregue',
      8: 'Cancelado',
      9: 'Devolvido'
    };
    
    return statusMap[status] || `Status ${status}`;
  }

  /**
   * Gera link de checkout para carrinho abandonado
   */
  gerarLinkCheckout(carrinho) {
    if (carrinho.hash) {
      return `https://danajalecos.painel.magazord.com.br/carrinho/${carrinho.hash}`;
    }
    return null;
  }
}

export default new TransformerService();
