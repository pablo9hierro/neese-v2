import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

/**
 * Serviço para interagir com Supabase
 * Responsável por persistir timestamps e rastrear eventos processados
 */
class SupabaseService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );
  }

  /**
   * Obtém a última execução do cron do banco
   * Se não existir, retorna início do dia de hoje (00:00)
   */
  async obterUltimaExecucao() {
    try {
      const { data, error } = await this.supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'ultima_execucao_cron')
        .single();

      if (error) {
        console.error('❌ Erro ao buscar última execução:', error.message);
        // Se erro, retorna início do dia de hoje
        return this.getInicioDoDia();
      }

      const timestamp = data?.valor?.timestamp;
      
      if (!timestamp) {
        console.log('⚠️  Primeira execução - buscando desde hoje 00:00');
        return this.getInicioDoDia();
      }

      const dataUltimaExecucao = new Date(timestamp);
      console.log(`✅ Última execução recuperada: ${dataUltimaExecucao.toISOString()}`);
      
      return dataUltimaExecucao;
    } catch (error) {
      console.error('❌ Erro ao obter última execução:', error.message);
      return this.getInicioDoDia();
    }
  }

  /**
   * Salva o timestamp da execução atual
   */
  async salvarUltimaExecucao(timestamp) {
    try {
      const { error } = await this.supabase
        .from('configuracoes')
        .update({
          valor: { 
            timestamp: timestamp.toISOString(),
            status: 'sucesso'
          },
          updated_at: new Date().toISOString()
        })
        .eq('chave', 'ultima_execucao_cron');

      if (error) {
        console.error('❌ Erro ao salvar última execução:', error.message);
        return false;
      }

      console.log(`💾 Timestamp salvo: ${timestamp.toISOString()}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar última execução:', error.message);
      return false;
    }
  }

  /**
   * Retorna início do dia de hoje (00:00:00)
   */
  getInicioDoDia() {
    const hoje = new Date();
    hoje.setHours(hoje.getHours() - (7 * 24), 0, 0, 0); // 7 dias atrás
    console.error(`⏰ Primeira execução - buscando desde: ${hoje.toISOString()}`);
    return hoje;
  }

  /**
   * Registra evento processado no banco (evitar duplicatas)
   */
  async registrarEvento(identificador, tipoEvento, dados) {
    try {
      const { error } = await this.supabase
        .from('eventos_processados')
        .insert({
          identificador,
          tipo_evento: tipoEvento,
          carrinho_id: dados.carrinho_id || null,
          pedido_id: dados.pedido_id || null,
          cliente_id: dados.cliente_id || null,
          dados_evento: dados,
          enviado_ghl: false
        });

      if (error) {
        // Se for erro de duplicata, apenas ignora
        if (error.code === '23505') {
          return false; // Já existe
        }
        console.error('❌ Erro ao registrar evento:', error.message);
        return false;
      }

      return true; // Evento novo registrado
    } catch (error) {
      console.error('❌ Erro ao registrar evento:', error.message);
      return false;
    }
  }

  /**
   * Marca evento como enviado para GHL
   */
  async marcarEventoEnviado(identificador, ghlResponse) {
    try {
      const { error } = await this.supabase
        .from('eventos_processados')
        .update({
          enviado_ghl: true,
          ghl_response: ghlResponse
        })
        .eq('identificador', identificador);

      if (error) {
        console.error('❌ Erro ao marcar evento como enviado:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao marcar evento como enviado:', error.message);
      return false;
    }
  }

  /**
   * Registra log de sincronização
   */
  async registrarLog(tipo, eventosEncontrados, eventosProcessados, eventosEnviados, duracao, erro = null) {
    try {
      const { error } = await this.supabase
        .from('sync_logs')
        .insert({
          tipo_sync: tipo,
          inicio: new Date(Date.now() - duracao).toISOString(),
          fim: new Date().toISOString(),
          duracao_ms: duracao,
          eventos_encontrados: eventosEncontrados,
          eventos_processados: eventosProcessados,
          eventos_enviados: eventosEnviados,
          status: erro ? 'erro' : 'sucesso',
          erro: erro
        });

      if (error) {
        console.error('❌ Erro ao registrar log:', error.message);
      }
    } catch (error) {
      console.error('❌ Erro ao registrar log:', error.message);
    }
  }

  /**
   * Limpa eventos antigos (mais de 30 dias)
   */
  async limparEventosAntigos() {
    try {
      const { data, error } = await this.supabase.rpc('limpar_eventos_antigos');
      
      if (error) {
        console.error('❌ Erro ao limpar eventos antigos:', error.message);
        return 0;
      }

      if (data > 0) {
        console.log(`🧹 ${data} eventos antigos removidos`);
      }

      return data;
    } catch (error) {
      console.error('❌ Erro ao limpar eventos antigos:', error.message);
      return 0;
    }
  }
}

export default new SupabaseService();
