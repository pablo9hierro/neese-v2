import supabaseService from '../services/supabase.service.js';

/**
 * Rota para limpeza automática do banco
 * Deve ser chamada a cada 2 dias pelo Vercel Cron
 */

const DIAS_PARA_MANTER = 30; // Mantém últimos 30 dias
const DIAS_PARA_MANTER_LOGS = 15; // Logs dos últimos 15 dias

/**
 * Limpa eventos antigos do banco
 */
async function limparEventosAntigos() {
  try {
    const supabase = supabaseService.supabase;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - DIAS_PARA_MANTER);
    
    const { count, error } = await supabase
      .from('eventos_processados')
      .delete()
      .lt('created_at', dataLimite.toISOString());
    
    if (error) throw error;
    
    console.log(`✅ ${count || 0} eventos antigos deletados`);
    return count || 0;
  } catch (error) {
    console.error('❌ Erro ao limpar eventos:', error.message);
    return 0;
  }
}

/**
 * Limpa logs antigos do banco
 */
async function limparLogsAntigos() {
  try {
    const supabase = supabaseService.supabase;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - DIAS_PARA_MANTER_LOGS);
    
    const { count, error } = await supabase
      .from('sync_logs')
      .delete()
      .lt('created_at', dataLimite.toISOString());
    
    if (error) throw error;
    
    console.log(`✅ ${count || 0} logs antigos deletados`);
    return count || 0;
  } catch (error) {
    console.error('❌ Erro ao limpar logs:', error.message);
    return 0;
  }
}

/**
 * Handler da rota de limpeza
 */
export async function executarLimpeza(req, res) {
  console.log('\n🧹 LIMPEZA AUTOMÁTICA INICIADA');
  console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  
  try {
    const eventosRemovidos = await limparEventosAntigos();
    const logsRemovidos = await limparLogsAntigos();
    
    const resultado = {
      success: true,
      executado_em: new Date().toISOString(),
      eventos_removidos: eventosRemovidos,
      logs_removidos: logsRemovidos,
      configuracao: {
        dias_eventos: DIAS_PARA_MANTER,
        dias_logs: DIAS_PARA_MANTER_LOGS
      }
    };
    
    console.log('✅ LIMPEZA CONCLUÍDA');
    console.log(JSON.stringify(resultado, null, 2));
    
    res.status(200).json(resultado);
  } catch (error) {
    console.error('❌ ERRO NA LIMPEZA:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default executarLimpeza;
