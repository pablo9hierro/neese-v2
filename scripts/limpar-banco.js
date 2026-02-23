import { createClient } from '@supabase/supabase-js';
import config from '../src/config/index.js';

/**
 * Script para limpar dados antigos do Supabase
 * Mantém apenas dados recentes suficientes para o sistema continuar funcionando
 */

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

// Configurações de limpeza
const DIAS_PARA_MANTER = 30; // Mantém apenas últimos 30 dias
const DIAS_PARA_MANTER_LOGS = 15; // Logs podem ser mais curtos

async function limparEventosAntigos() {
  try {
    console.log('\n🧹 LIMPANDO EVENTOS ANTIGOS...\n');
    
    // Calcula data limite (DIAS_PARA_MANTER dias atrás)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - DIAS_PARA_MANTER);
    
    console.log(`📅 Removendo eventos criados antes de: ${dataLimite.toISOString()}`);
    console.log(`   (Mantendo apenas últimos ${DIAS_PARA_MANTER} dias)\n`);
    
    // 1. Contar eventos antes de deletar
    const { count: totalAntes, error: countError } = await supabase
      .from('eventos_processados')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', dataLimite.toISOString());
    
    if (countError) {
      console.error('❌ Erro ao contar eventos:', countError.message);
      return;
    }
    
    console.log(`📊 Encontrados ${totalAntes} eventos para deletar`);
    
    if (totalAntes === 0) {
      console.log('✅ Nenhum evento antigo para deletar!\n');
      return;
    }
    
    // 2. Deletar eventos antigos
    const { error: deleteError } = await supabase
      .from('eventos_processados')
      .delete()
      .lt('created_at', dataLimite.toISOString());
    
    if (deleteError) {
      console.error('❌ Erro ao deletar eventos:', deleteError.message);
      return;
    }
    
    console.log(`✅ ${totalAntes} eventos deletados com sucesso!\n`);
    
    // 3. Contar eventos restantes
    const { count: totalRestante, error: countRestanteError } = await supabase
      .from('eventos_processados')
      .select('*', { count: 'exact', head: true });
    
    if (!countRestanteError) {
      console.log(`📊 Eventos restantes no banco: ${totalRestante}\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza de eventos:', error.message);
  }
}

async function limparLogsAntigos() {
  try {
    console.log('🧹 LIMPANDO LOGS ANTIGOS...\n');
    
    // Calcula data limite para logs
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - DIAS_PARA_MANTER_LOGS);
    
    console.log(`📅 Removendo logs criados antes de: ${dataLimite.toISOString()}`);
    console.log(`   (Mantendo apenas últimos ${DIAS_PARA_MANTER_LOGS} dias)\n`);
    
    // 1. Contar logs antes de deletar
    const { count: totalAntes, error: countError } = await supabase
      .from('sync_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', dataLimite.toISOString());
    
    if (countError) {
      console.error('❌ Erro ao contar logs:', countError.message);
      return;
    }
    
    console.log(`📊 Encontrados ${totalAntes} logs para deletar`);
    
    if (totalAntes === 0) {
      console.log('✅ Nenhum log antigo para deletar!\n');
      return;
    }
    
    // 2. Deletar logs antigos
    const { error: deleteError } = await supabase
      .from('sync_logs')
      .delete()
      .lt('created_at', dataLimite.toISOString());
    
    if (deleteError) {
      console.error('❌ Erro ao deletar logs:', deleteError.message);
      return;
    }
    
    console.log(`✅ ${totalAntes} logs deletados com sucesso!\n`);
    
    // 3. Contar logs restantes
    const { count: totalRestante, error: countRestanteError } = await supabase
      .from('sync_logs')
      .select('*', { count: 'exact', head: true });
    
    if (!countRestanteError) {
      console.log(`📊 Logs restantes no banco: ${totalRestante}\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza de logs:', error.message);
  }
}

async function exibirEstatisticas() {
  try {
    console.log('\n📊 ESTATÍSTICAS FINAIS DO BANCO:\n');
    
    // Total de eventos
    const { count: totalEventos } = await supabase
      .from('eventos_processados')
      .select('*', { count: 'exact', head: true });
    
    // Eventos enviados ao GHL
    const { count: eventosEnviados } = await supabase
      .from('eventos_processados')
      .select('*', { count: 'exact', head: true })
      .eq('enviado_ghl', true);
    
    // Total de logs
    const { count: totalLogs } = await supabase
      .from('sync_logs')
      .select('*', { count: 'exact', head: true });
    
    // Última execução
    const { data: ultimaExecucao } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'ultima_execucao_cron')
      .single();
    
    console.log(`✅ Total de eventos: ${totalEventos}`);
    console.log(`✅ Eventos enviados ao GHL: ${eventosEnviados}`);
    console.log(`✅ Total de logs: ${totalLogs}`);
    
    if (ultimaExecucao?.valor?.timestamp) {
      const dataUltimaExec = new Date(ultimaExecucao.valor.timestamp);
      console.log(`✅ Última execução do cron: ${dataUltimaExec.toLocaleString('pt-BR')}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Erro ao exibir estatísticas:', error.message);
  }
}

// Executa o script
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 SCRIPT DE LIMPEZA DO BANCO DE DADOS SUPABASE');
  console.log('='.repeat(80));
  console.log(`\n⚙️  Configurações:`);
  console.log(`   - Manter eventos dos últimos ${DIAS_PARA_MANTER} dias`);
  console.log(`   - Manter logs dos últimos ${DIAS_PARA_MANTER_LOGS} dias`);
  console.log(`   - URL Supabase: ${config.supabase.url}\n`);
  
  // Aguarda 3 segundos para o usuário cancelar se necessário
  console.log('⏳ Iniciando em 3 segundos... (Ctrl+C para cancelar)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Executa limpezas
  await limparEventosAntigos();
  await limparLogsAntigos();
  await exibirEstatisticas();
  
  process.exit(0);
}

main();
