/**
 * Serviço para transformar dados do Magazord para o formato GHL
 */
class TransformerService {
  
  /**
   * Transforma carrinho aberto para formato GHL
   */
  transformarCarrinhoAberto(carrinho, cliente) {
    return {
      tipo_evento: 'carrinho_aberto',
      carrinho_id: carrinho.id,
      status: {
        codigo: 1,
        descricao: 'Aberto',
        data_atualizacao: carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa: {
        nome: cliente?.nome || 'Cliente não identificado',
        email: cliente?.email || '',
        telefone: cliente?.telefone || ''
      },
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'aberto',
        status_codigo: 1,
        origem: carrinho.origem || 1,
        utm_source: carrinho.utm_source || '',
        utm_params: carrinho.utm_params || {},
        ip: carrinho.ip || '',
        user_agent: carrinho.user_agent || '',
        valor_total: carrinho.valor_total || '0.00',
        itens: this.transformarItens(carrinho.itens || [])
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `CART-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma carrinho em checkout (aguardando pagamento)
   */
  transformarCarrinhoCheckout(carrinho, cliente) {
    return {
      tipo_evento: 'carrinho_checkout',
      carrinho_id: carrinho.id,
      status: {
        codigo: 2,
        descricao: 'Aguardando Pagamento',
        data_atualizacao: carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa: {
        nome: cliente?.nome || 'Cliente não identificado',
        email: cliente?.email || '',
        telefone: cliente?.telefone || ''
      },
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'checkout',
        status_codigo: 2,
        origem: carrinho.origem || 1,
        utm_source: carrinho.utm_source || '',
        utm_params: carrinho.utm_params || {},
        ip: carrinho.ip || '',
        user_agent: carrinho.user_agent || '',
        valor_total: carrinho.valor_total || '0.00',
        forma_pagamento: carrinho.forma_pagamento || 'Não informado',
        link_pagamento: carrinho.link_pagamento || null,
        itens: this.transformarItens(carrinho.itens || [])
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `CHECKOUT-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma carrinho abandonado para formato GHL
   */
  transformarCarrinhoAbandonado(carrinho, cliente) {
    return {
      tipo_evento: 'carrinho_abandonado',
      carrinho_id: carrinho.id,
      status: {
        codigo: 4,
        descricao: 'Abandonado',
        data_atualizacao: carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa: {
        nome: cliente?.nome || 'Cliente não identificado',
        email: cliente?.email || '',
        telefone: cliente?.telefone || ''
      },
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'abandonado',
        status_codigo: 4,
        origem: carrinho.origem || 1,
        utm_source: carrinho.utm_source || '',
        utm_params: carrinho.utm_params || {},
        ip: carrinho.ip || '',
        user_agent: carrinho.user_agent || '',
        valor_total: carrinho.valor_total || '0.00',
        forma_pagamento: carrinho.forma_pagamento || 'Não informado',
        link_checkout: this.gerarLinkCheckout(carrinho),
        itens: this.transformarItens(carrinho.itens || [])
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `ABANDONED-${carrinho.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma pedido criado/aprovado para formato GHL
   */
  transformarPedidoCriado(pedido, cliente, rastreamento = null) {
    return {
      tipo_evento: 'pedido_criado',
      pedido_id: pedido.id,
      pedido_codigo: pedido.codigo || `PEDIDO-${pedido.id}`,
      status: {
        codigo: pedido.status || 4,
        descricao: this.getStatusDescricao(pedido.status),
        data_atualizacao: pedido.data_atualizacao || new Date().toISOString()
      },
      pessoa: {
        nome: cliente?.nome || pedido.cliente_nome || 'Cliente não identificado',
        email: cliente?.email || pedido.cliente_email || '',
        telefone: cliente?.telefone || pedido.cliente_telefone || ''
      },
      pedido: {
        data_pedido: pedido.data_pedido || new Date().toISOString(),
        valor_total: pedido.valor_total || '0.00',
        forma_pagamento: pedido.forma_pagamento || 'Não informado',
        link_pagamento: pedido.link_pagamento || null,
        status: this.getStatusDescricao(pedido.status),
        status_codigo: pedido.status || 4,
        itens: this.transformarItens(pedido.itens || [])
      },
      carrinho: {
        carrinho_id: pedido.carrinho_id || null,
        status: 'convertido',
        status_codigo: 3,
        origem: pedido.origem || 1,
        utm_source: pedido.utm_source || '',
        utm_params: pedido.utm_params || {},
        ip: pedido.ip || '',
        user_agent: pedido.user_agent || ''
      },
      entrega: this.transformarEntrega(pedido, rastreamento),
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `ORDER-${pedido.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma atualização de status de pedido
   */
  transformarStatusPedido(pedido, cliente, rastreamento = null) {
    return {
      tipo_evento: 'pedido_status_atualizado',
      pedido_id: pedido.id,
      pedido_codigo: pedido.codigo || `PEDIDO-${pedido.id}`,
      status: {
        codigo: pedido.status,
        descricao: this.getStatusDescricao(pedido.status),
        data_atualizacao: pedido.data_atualizacao || new Date().toISOString()
      },
      pessoa: {
        nome: cliente?.nome || pedido.cliente_nome || 'Cliente não identificado',
        email: cliente?.email || pedido.cliente_email || '',
        telefone: cliente?.telefone || pedido.cliente_telefone || ''
      },
      pedido: {
        data_pedido: pedido.data_pedido || new Date().toISOString(),
        valor_total: pedido.valor_total || '0.00',
        forma_pagamento: pedido.forma_pagamento || 'Não informado',
        status: this.getStatusDescricao(pedido.status),
        status_codigo: pedido.status,
        itens: this.transformarItens(pedido.itens || [])
      },
      entrega: this.transformarEntrega(pedido, rastreamento),
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `STATUS-${pedido.id}-${Date.now()}`
      }
    };
  }

  /**
   * Transforma itens do carrinho/pedido
   */
  transformarItens(itens) {
    return itens.map(item => ({
      produto_id: item.produto_id || item.id,
      descricao: item.nome || item.descricao || 'Produto sem descrição',
      quantidade: item.quantidade || 1,
      valor_unitario: item.valor_unitario || item.preco || '0.00',
      valor_total: item.valor_total || (parseFloat(item.preco || 0) * (item.quantidade || 1)).toFixed(2)
    }));
  }

  /**
   * Transforma informações de entrega
   */
  transformarEntrega(pedido, rastreamento) {
    const entregaBase = {
      status: rastreamento ? 'rastreavel' : 'pendente',
      codigo_rastreio: rastreamento?.codigo_rastreio || '',
      transportadora: rastreamento?.transportadora || pedido.transportadora || '',
      link_rastreio: rastreamento?.link_rastreio || '',
      previsao_entrega: rastreamento?.previsao_entrega || pedido.previsao_entrega || '',
      data_postagem: rastreamento?.data_postagem || '',
      endereco_entrega: {
        destinatario: pedido.endereco_entrega?.nome || pedido.cliente_nome || '',
        logradouro: pedido.endereco_entrega?.logradouro || '',
        numero: pedido.endereco_entrega?.numero || '',
        complemento: pedido.endereco_entrega?.complemento || '',
        bairro: pedido.endereco_entrega?.bairro || '',
        cidade: pedido.endereco_entrega?.cidade || '',
        estado: pedido.endereco_entrega?.estado || '',
        cep: pedido.endereco_entrega?.cep || ''
      },
      eventos: rastreamento?.eventos || []
    };

    return entregaBase;
  }

  /**
   * Gera link de checkout para recuperação de carrinho
   */
  gerarLinkCheckout(carrinho) {
    // O Magazord geralmente fornece um link, caso contrário usa base + carrinho_id
    return carrinho.link_checkout || carrinho.link_recuperacao || `https://danajalecos.painel.magazord.com.br/carrinho/${carrinho.id}`;
  }

  /**
   * Retorna descrição do status do pedido
   */
  getStatusDescricao(statusCodigo) {
    const status = {
      1: 'Pendente',
      2: 'Em Processamento',
      3: 'Enviado',
      4: 'Aprovado',
      5: 'Cancelado',
      6: 'Aguardando Pagamento',
      7: 'Devolvido',
      8: 'Reembolsado'
    };
    return status[statusCodigo] || 'Status Desconhecido';
  }
}

export default new TransformerService();
