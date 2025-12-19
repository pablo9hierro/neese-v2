import axios from 'axios';
import config from '../config/index.js';

/**
 * Serviço para enviar dados ao GoHighLevel
 */
class GHLService {
  constructor() {
    this.webhookUrl = config.ghl.webhookUrl;
  }

  /**
   * Envia dados para o webhook do GHL
   */
  async enviarDados(dados) {
    try {
      console.log('📤 Enviando dados para GHL:', JSON.stringify(dados, null, 2));
      
      const response = await axios.post(this.webhookUrl, dados, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Neese-Integration/1.0'
        },
        timeout: 30000 // 30 segundos timeout
      });

      console.log('✅ Dados enviados com sucesso para GHL');
      return {
        success: true,
        response: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('❌ Erro ao enviar dados para GHL:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Envia múltiplos eventos em lote
   */
  async enviarLote(eventos) {
    const resultados = [];
    
    for (const evento of eventos) {
      const resultado = await this.enviarDados(evento);
      resultados.push({
        tipo_evento: evento.tipo_evento,
        identificador: evento.origem?.identificador_unico,
        success: resultado.success
      });
      
      // Pequeno delay entre envios para evitar sobrecarga
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return resultados;
  }
}

export default new GHLService();
