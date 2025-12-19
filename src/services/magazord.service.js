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
   * Busca carrinhos com diferentes status
   * Status: 1=Aberto, 2=Checkout/Aguardando, 3=Convertido, 4=Abandonado
   */
  async buscarCarrinhos(status = null) {
    try {
      const params = status ? { status } : {};
      const response = await axios.get(`${this.apiUrl}/carrinhos`, {
        auth: this.auth,
        params
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar carrinhos:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca carrinho específico por ID
   */
  async buscarCarrinhoPorId(carrinhoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/carrinhos/${carrinhoId}`, {
        auth: this.auth
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar carrinho ${carrinhoId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca pedidos
   * Status: 1=Pendente, 2=Em processamento, 3=Enviado, 4=Aprovado, 5=Cancelado, 6=Aguardando Pagamento
   */
  async buscarPedidos(params = {}) {
    try {
      const response = await axios.get(`${this.apiUrl}/pedidos`, {
        auth: this.auth,
        params: {
          ...params,
          // Buscar apenas últimos 24 horas para otimizar
          data_inicio: params.data_inicio || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca pedido específico por ID
   */
  async buscarPedidoPorId(pedidoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/pedidos/${pedidoId}`, {
        auth: this.auth
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar pedido ${pedidoId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca informações de rastreamento do pedido
   */
  async buscarRastreamento(pedidoId) {
    try {
      const response = await axios.get(`${this.apiUrl}/pedidos/${pedidoId}/rastreamento`, {
        auth: this.auth
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar rastreamento do pedido ${pedidoId}:`, error.response?.data || error.message);
      // Retorna objeto vazio se não houver rastreamento
      return null;
    }
  }

  /**
   * Busca cliente por ID
   */
  async buscarCliente(clienteId) {
    try {
      const response = await axios.get(`${this.apiUrl}/clientes/${clienteId}`, {
        auth: this.auth
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar cliente ${clienteId}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

export default new MagazordService();
