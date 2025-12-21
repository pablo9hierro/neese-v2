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
      
      // Formatar datas no padrão ISO sem milissegundos
      const dataInicioFormatada = dataInicio.toISOString().split('.')[0];
      const dataFimFormatada = dataFim.toISOString().split('.')[0];
      
      const params = {
        dataAtualizacaoInicio: dataInicioFormatada,
        dataAtualizacaoFim: dataFimFormatada,
        limit: 100
      };
      
      if (status) {
        params.status = status;
      }
      
      console.log(`📅 Buscando carrinhos de ${dataInicioFormatada} até ${dataFimFormatada}`);
      
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

      // Formata datas para API (sem milissegundos)
      const dataInicioStr = dataInicio.toISOString().split('.')[0];
      const dataFimStr = dataFim.toISOString().split('.')[0];

      console.log(`[Magazord] Buscando pedidos de ${dataInicioStr} até ${dataFimStr}`);

      const response = await axios.get(`${this.apiUrl}/v2/site/pedido`, {
        auth: this.auth,
        params: {
          dataAtualizacaoInicio: dataInicioStr,
          dataAtualizacaoFim: dataFimStr
        }
      });

      const pedidos = response.data?.data?.items || [];
      console.log(`[Magazord] Encontrados ${pedidos.length} pedidos`);
      
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
}

export default new MagazordService();
