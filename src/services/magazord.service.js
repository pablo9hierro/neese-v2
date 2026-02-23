import axios from 'axios';
import config from '../config/index.js';

/**
 * Serviço para integração com API Magazord
 */
class MagazordService {
  constructor() {
    this.apiUrl = config.magazord.apiUrl;
    this.auth = {
      username: config.magazord.user,
      password: config.magazord.password
    };
  }

  /**
   * Busca carrinhos - API v2 Magazord
   * Endpoint: GET /v2/site/carrinho
   * Requer parâmetros dataAtualizacaoInicio e dataAtualizacaoFim
   * 
   * @param {Date} dataInicio - Data inicial para busca (padrão: 1 hora atrás)
   * @param {Date} dataFim - Data final para busca (padrão: agora)
   */
  async buscarCarrinhos(dataInicio = null, dataFim = null, status = null) {
    try {
      // Se não informado, busca desde 1 hora atrás até agora
      if (!dataInicio) {
        dataInicio = new Date(Date.now() - 60 * 60 * 1000); // 1 hora atrás
      }
      if (!dataFim) {
        dataFim = new Date();
      }
      
      // Converter para horário de Brasília (UTC-3)
      const offsetBrasilia = -3 * 60; // -3 horas em minutos
      const dataInicioBrasilia = new Date(dataInicio.getTime() + (offsetBrasilia * 60 * 1000));
      const dataFimBrasilia = new Date(dataFim.getTime() + (offsetBrasilia * 60 * 1000));
      
      // Formatar datas no padrão ISO sem milissegundos e sem Z (horário local)
      const dataInicioFormatada = dataInicioBrasilia.toISOString().split('.')[0];
      const dataFimFormatada = dataFimBrasilia.toISOString().split('.')[0];
      
      const params = {
        dataAtualizacaoInicio: dataInicioFormatada,
        dataAtualizacaoFim: dataFimFormatada,
        limit: 100
      };
      
      if (status) {
        params.status = status;
      }
      
      console.log(`[Magazord] Buscando carrinhos CRIADOS de ${dataInicioFormatada} até ${dataFimFormatada}`);
      
      const response = await axios.get(`${this.apiUrl}/v2/site/carrinho`, {
        auth: this.auth,
        params
      });
      
      // A resposta vem em data.items
      const carrinhos = response.data?.data?.items || response.data?.items || [];
      console.log(`🛒 Encontrados ${carrinhos.length} carrinhos`);
      
      return carrinhos;
    } catch (error) {
      console.error('Erro ao buscar carrinhos:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca carrinho específico por ID
   * Endpoint: GET /v2/site/carrinho/{carrinho}
   */
  async buscarCarrinhoPorId(carrinhoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/carrinho/${carrinhoId}`, {
        auth: this.auth
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Erro ao buscar carrinho ${carrinhoId}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Busca itens de um carrinho específico
   * Endpoint: GET /v2/site/carrinho/{carrinho}/itens
   */
  async buscarItensCarrinho(carrinhoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/carrinho/${carrinhoId}/itens`, {
        auth: this.auth
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error(`Erro ao buscar itens do carrinho ${carrinhoId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca pedidos - API v2 Magazord
   * Endpoint: GET /v2/site/pedido
   * 
   * @param {Date} dataInicio - Data inicial para filtro incremental (padrão: 1 hora atrás)
   * @param {Date} dataFim - Data final para filtro incremental (padrão: agora)
   */
  async buscarPedidos(dataInicio = null, dataFim = null) {
    try {
      // Define datas padrão se não fornecidas
      if (!dataInicio) {
        dataInicio = new Date(Date.now() - 60 * 60 * 1000); // 1 hora atrás
      }
      if (!dataFim) {
        dataFim = new Date();
      }

      // Converter para horário de Brasília (UTC-3)
      const offsetBrasilia = -3 * 60; // -3 horas em minutos
      const dataInicioBrasilia = new Date(dataInicio.getTime() + (offsetBrasilia * 60 * 1000));
      const dataFimBrasilia = new Date(dataFim.getTime() + (offsetBrasilia * 60 * 1000));
      
      // Formatar datas no padrão ISO com timezone -03:00 (Y-m-d\\TH:i:sP)
      const dataInicioStr = dataInicioBrasilia.toISOString().split('.')[0] + '-03:00';
      const dataFimStr = dataFimBrasilia.toISOString().split('.')[0] + '-03:00';

      console.error(`[Magazord] 🔍 Buscando pedidos CRIADOS:`);
      console.error(`   De: ${dataInicioStr}`);
      console.error(`   Até: ${dataFimStr}`);

      const response = await axios.get(`${this.apiUrl}/v2/site/pedido`, {
        auth: this.auth,
        params: {
          'dataHora[gte]': dataInicioStr,
          'dataHora[lte]': dataFimStr,
          limit: 100
        }
      });

      console.error(`[Magazord] 📡 Response status: ${response.status}`);
      console.error(`[Magazord] 📦 Response data keys:`, Object.keys(response.data || {}));
      
      const pedidos = response.data?.data?.items || [];
      console.error(`[Magazord] ✅ Encontrados ${pedidos.length} pedidos`);
      
      if (pedidos.length > 0) {
        console.error(`[Magazord] 📋 Primeiro pedido:`, JSON.stringify(pedidos[0], null, 2));
      }
      
      return pedidos;
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca pedido específico por código
   * Endpoint: GET /v2/site/pedido/{codigoPedido}
   */
  async buscarPedidoPorId(pedidoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/pedido/${pedidoId}`, {
        auth: this.auth
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Erro ao buscar pedido ${pedidoId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca informações de rastreamento do pedido
   * Endpoint: GET /v2/site/pedido/{codigoPedido}/rastreio
   */
  async buscarRastreamento(pedidoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/pedido/${pedidoId}/rastreio`, {
        auth: this.auth
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Erro ao buscar rastreamento do pedido ${pedidoId}:`, error.response?.data || error.message);
      // Retorna objeto vazio se não houver rastreamento
      return null;
    }
  }

  /**
   * Busca pessoa (cliente) por ID
   * Endpoint: GET /v2/site/pessoa/{pessoaId}
   */
  async buscarPessoa(pessoaId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/pessoa/${pessoaId}`, {
        auth: this.auth
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Erro ao buscar pessoa ${pessoaId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Busca cliente - alias para buscarPessoa
   */
  async buscarCliente(clienteId) {
    return this.buscarPessoa(clienteId);
  }

  /**
   * Busca informações de pagamento do pedido
   * Endpoint: GET /v2/site/pedido/{codigoPedido}/payments
   */
  async buscarPagamentoPedido(pedidoCodigo) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v2/site/pedido/${pedidoCodigo}/payments`,
        { auth: this.auth }
      );
      
      const payments = response.data?.data?.items || [];
      return payments.length > 0 ? payments[0] : null;
    } catch (error) {
      console.error(`Erro ao buscar pagamento do pedido ${pedidoCodigo}:`, error.response?.data || error.message);
      return null;
    }
  }
}

export default new MagazordService();
