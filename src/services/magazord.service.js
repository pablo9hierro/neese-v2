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
   */
  async buscarCarrinhos(status = null) {
    try {
      const params = {};
      if (status) {
        params.status = status;
      }
      
      const response = await axios.get(`${this.apiUrl}/v2/site/carrinho`, {
        auth: this.auth,
        params
      });
      
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Erro ao buscar carrinhos:', error.response?.data || error.message);
      throw error;
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
   */
  async buscarPedidos(params = {}) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/pedido`, {
        auth: this.auth,
        params
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error.response?.data || error.message);
      throw error;
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
  async buscarCliente(clienteId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/site/pessoa/${clienteId}`, {
        auth: this.auth
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Erro ao buscar cliente ${clienteId}:`, error.response?.data || error.message);
      return null;
    }
  }
}

export default new MagazordService();
