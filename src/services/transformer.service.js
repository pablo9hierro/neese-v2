/**
 * Serviço para transformar dados do Magazord para o formato GHL
 * REGRAS:
 * - Email OU Telefone são OBRIGATÓRIOS (preferencialmente os dois)
 * - Dados completos dependem do status
 * - Entrega só quando aplicável (pedidos aprovados com rastreio)
 */
class TransformerService {
  
  /**
   * Formata número de telefone para o padrão GHL
   * Formato: código país (55) + DDD + 9 + número
   * Exemplo: 5583987516699
   */
  formatarTelefone(telefone) {
    if (!telefone) return '';
    
    // Remove todos os caracteres não numéricos
    let numeroLimpo = telefone.replace(/\D/g, '');
    
    // Se já tem 55 no início, retorna como está
    if (numeroLimpo.startsWith('55') && numeroLimpo.length === 13) {
      return numeroLimpo;
    }
    
    // Se começa com 0, remove o 0 inicial
    if (numeroLimpo.startsWith('0')) {
      numeroLimpo = numeroLimpo.substring(1);
    }
    
    // Se tem 11 dígitos (DDD + 9 + número), adiciona código do país
    if (numeroLimpo.length === 11) {
      return '55' + numeroLimpo;
    }
    
    // Se tem 10 dígitos (DDD + número sem o 9), adiciona o 9
    if (numeroLimpo.length === 10) {
      const ddd = numeroLimpo.substring(0, 2);
      const numero = numeroLimpo.substring(2);
      return '55' + ddd + '9' + numero;
    }
    
    // Se já tem 13 dígitos mas não começa com 55, assume que precisa do código do país
    if (numeroLimpo.length === 11) {
      return '55' + numeroLimpo;
    }
    
    // Retorna como está se não se encaixar nos padrões acima
    return numeroLimpo;
  }
  
  /**
   * Valida se tem dados de contato mínimos
   * ⚠️ REGRA: Telefone é OBRIGATÓRIO para envio ao GHL
   */
  validarDadosContato(cliente) {
    const temTelefone = cliente?.telefone && cliente.telefone.trim() !== '';
    
    // Telefone é obrigatório
    return temTelefone;
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
    const telefoneRaw = (dados.pessoaContato || clienteAPI?.telefone || dados.telefone || '').trim();
    const telefone = this.formatarTelefone(telefoneRaw);
    const nome = (clienteAPI?.nome || dados.pessoaNome || dados.nome || 'Cliente').trim();
    
    console.log(`      📧 DEBUG pessoa extraída:`, JSON.stringify({ nome, email, telefone }));
    
    return {
      nome,
      email,
      telefone
    };
  }

  /**
   * Transforma carrinho abandonado
   * Status 2 - Carrinho Abandonado (conforme openapi.yaml)
   * Dados obrigatórios: pessoa (telefone OBRIGATÓRIO), itens, valor_total
   */
  transformarCarrinhoAbandonado(carrinho, cliente) {
    const pessoa = this.extrairDadosPessoa(carrinho, cliente);
    
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Carrinho abandonado ${carrinho.id} sem telefone - IGNORADO`);
      return null;
    }

    return {
      tipo_evento: 'carrinho_abandonado',
      carrinho_id: carrinho.id,
      status: {
        codigo: 2,
        descricao: 'Carrinho Abandonado',
        data_atualizacao: carrinho.dataAtualizacao || carrinho.data_atualizacao || new Date().toISOString()
      },
      pessoa,
      carrinho: {
        carrinho_id: carrinho.id,
        status: 'abandonado',
        status_codigo: 2,
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
   * Transforma pedido completo
   * Apenas status usados no GHL: 1 (Aguardando Pagamento), 2/14 (Cancelados)
   */
  transformarPedido(pedido, carrinho = null, rastreamento = null) {
    // Extrai pessoa do pedido ou carrinho (usando clienteAPI se disponível)
    const pessoa = this.extrairDadosPessoa(pedido, pedido.clienteAPI);
    
    if (!this.validarDadosContato({ email: pessoa.email, telefone: pessoa.telefone })) {
      console.log(`⚠️  Pedido ${pedido.id} sem dados de contato - IGNORADO`);
      return null;
    }

    const statusCodigo = pedido.pedidoSituacao || pedido.status || 0;
    const formaPagamento = (pedido.formaPagamentoNome || pedido.formaPagamento || pedido.forma_pagamento || '').toLowerCase();
    
    // 🎯 FILTRAR: Processar APENAS eventos usados no GHL
    // Status permitidos: 1 (Aguardando Pagamento), 2 e 14 (Cancelados)
    const statusPermitidos = [1, 2, 14];
    if (!statusPermitidos.includes(statusCodigo)) {
      console.log(`      ⏭️  Status ${statusCodigo} ignorado - não usado no GHL`);
      return null; // Não processa outros status
    }
    
    let tipoEvento = null;
    
    if (statusCodigo === 1) {
      tipoEvento = 'pedido_aguardando_pagamento';
    } else if (statusCodigo === 2 || statusCodigo === 14) {
      // Pagamento cancelado/recusado - identificar tipo específico
      if (formaPagamento.includes('cartão') || formaPagamento.includes('cartao') || formaPagamento.includes('crédito') || formaPagamento.includes('credito')) {
        tipoEvento = 'cartao_recusado';
      } else if (formaPagamento.includes('pix')) {
        tipoEvento = 'pix_expirado';
      } else if (formaPagamento.includes('boleto')) {
        tipoEvento = 'boleto_vencido';
      } else {
        // Cancelamento sem forma de pagamento conhecida - ignorar
        console.log(`      ⏭️  Cancelamento sem forma de pagamento específica - ignorado`);
        return null;
      }
    }
    
    const evento = {
      tipo_evento: tipoEvento,
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
   * Baseado no openapi.yaml oficial do Magazord
   */
  getStatusDescricao(status) {
    const statusMap = {
      1: 'Aguardando Pagamento',
      2: 'Cancelado Pagamento',
      3: 'Em análise Pagamento',
      4: 'Aprovado',
      5: 'Aprovado e Integrado',
      6: 'Nota Fiscal Emitida',
      7: 'Transporte',
      8: 'Entregue',
      9: 'Fraude',
      10: 'Chargeback',
      11: 'Disputa',
      12: 'Aprovado Análise de Pagamento',
      13: 'Em análise de pagamento (interna)',
      14: 'Cancelado Pagamento Análise',
      15: 'Aguardando Pagamento (Diferenciado)',
      16: 'Problema Fluxo Postal',
      17: 'Devolvido Financeiro',
      18: 'Aguardando Atualização de Dados',
      19: 'Aguardando Chegada do Produto',
      20: 'Devolvido Estoque (Dep. 1)',
      21: 'Devolvido Estoque (Outros Dep.)',
      22: 'Suspenso Temporariamente',
      23: 'Faturamento Iniciado',
      24: 'Em Cancelamento',
      25: 'Tratamento Pós-Vendas',
      26: 'Nota Fiscal Cancelada',
      27: 'Crédito por Troca',
      28: 'Nota Fiscal Denegada',
      29: 'Chargeback Pago',
      30: 'Aprovado Parcial',
      31: 'Em Logística Reversa'
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
