import magazordService from '../services/magazord.service.js';
import ghlService from '../services/ghl.service.js';
import transformerService from '../services/transformer.service.js';
import supabaseService from '../services/supabase.service.js';

/**
 * Controlador principal para sincronização automática (Cron Job)
 * Sistema incremental: busca apenas desde a última execução
 * Persistência via Supabase para garantir continuidade entre execuções
 */

// Cache em memória para evitar duplicatas durante a mesma execução
const eventosProcessados = new Set();

/**
 * Limpa cache de eventos em memória
 */
function limparCache() {
  if (eventosProcessados.size > 1000) {
    eventosProcessados.clear();
    console.log('🧹 Cache de eventos limpo');
  }
}

/**
 * Verifica se evento já foi processado
 */
function jaFoiProcessado(identificador) {
  return eventosProcessados.has(identificador);
}

/**
 * Marca evento como processado
 */
function marcarProcessado(identificador) {
  eventosProcessados.add(identificador);
}

/**
 * Processa carrinhos (todos os status)
 * Sistema incremental: busca apenas desde a última execução
 */
async function processarCarrinhos(dataInicio, dataFim) {
  try {
    console.log(`\n🛒 BUSCANDO CARRINHOS`);
    console.log(`   📅 Período: ${dataInicio.toISOString()} → ${dataFim.toISOString()}`);
    
    // Busca TODOS os carrinhos atualizados no período (sem filtrar por status ainda)
    const carrinhos = await magazordService.buscarCarrinhos(dataInicio, dataFim);
    
    if (!carrinhos || carrinhos.length === 0) {
      console.log('   ✓ Nenhum carrinho novo ou atualizado');
      return [];
    }

    console.log(`   📦 Encontrados: ${carrinhos.length} carrinhos`);
    
    const eventos = [];
    for (const carrinho of carrinhos) {
      const identificador = `CARRINHO-${carrinho.id}-${carrinho.status}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      // Buscar dados completos separadamente
      let carrinhoCompleto = { ...carrinho };
      let cliente = null;
      let itens = [];
      
      try {
        // 1. Buscar detalhes completos do carrinho
        console.log(`   🔍 Buscando detalhes do carrinho ${carrinho.id}...`);
        const detalhesCarrinho = await magazordService.buscarCarrinhoPorId(carrinho.id);
        
        if (detalhesCarrinho) {
          carrinhoCompleto = { ...carrinho, ...detalhesCarrinho };
          
          // 2. Se tem pessoa_id, buscar dados da pessoa
          if (detalhesCarrinho.pessoa_id || detalhesCarrinho.pessoaId) {
            const pessoaId = detalhesCarrinho.pessoa_id || detalhesCarrinho.pessoaId;
            console.log(`   👤 Buscando pessoa ${pessoaId}...`);
            cliente = await magazordService.buscarPessoa(pessoaId);
          }
        }
        
        // 3. Buscar itens do carrinho
        console.log(`   📦 Buscando itens do carrinho ${carrinho.id}...`);
        itens = await magazordService.buscarItensCarrinho(carrinho.id);
        carrinhoCompleto.itens = itens;
        
      } catch (error) {
        console.log(`   ⚠️ Erro ao buscar dados completos do carrinho ${carrinho.id}:`, error.message);
      }

      // Processar de acordo com o status
      // Status: 1=Aberto, 2=Checkout/Aguardando, 3=Convertido, 4=Abandonado
      let evento = null;
      
      if (carrinho.status === 1) {
        // Carrinho aberto
        evento = transformerService.transformarCarrinhoAberto(carrinhoCompleto, cliente);
      } else if (carrinho.status === 2) {
        // Carrinho em checkout
        evento = transformerService.transformarCarrinhoCheckout(carrinhoCompleto, cliente);
      } else if (carrinho.status === 3 && carrinho.pedido) {
        // Carrinho convertido - buscar pedido
        try {
          const pedido = await magazordService.buscarPedidoPorId(carrinho.pedido.id);
          evento = transformerService.transformarPedido(pedido, carrinhoCompleto);
        } catch (error) {
          console.error(`Erro ao buscar pedido ${carrinho.pedido.id}:`, error.message);
        }
      } else if (carrinho.status === 4) {
        // Carrinho abandonado
        evento = transformerService.transformarCarrinhoAbandonado(carrinhoCompleto, cliente);
      }
      
      if (evento) {
        // Tenta registrar no Supabase (evita duplicatas)
        const isNovo = await supabaseService.registrarEvento(
          identificador,
          `CARRINHO_STATUS_${carrinho.status}`,
          { carrinho_id: carrinho.id, ...evento }
        );
        
        if (isNovo) {
          eventos.push(evento);
          marcarProcessado(identificador);
        }
      }
    }
    
    console.log(`   ✅ Novos carrinhos processados: ${eventos.length}`);
    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar carrinhos:', error.message);
    return [];
  }
}

/**
 * Processa pedidos (incremental)
 * Busca apenas pedidos atualizados desde a última execução
 */
async function processarPedidos(dataInicio, dataFim) {
  try {
    console.log(`\n📦 BUSCANDO PEDIDOS`);
    console.log(`   📅 Período: ${dataInicio.toISOString()} → ${dataFim.toISOString()}`);
    
    const pedidos = await magazordService.buscarPedidos(dataInicio, dataFim);
    
    if (!pedidos || pedidos.length === 0) {
      console.log('   ✓ Nenhum pedido novo ou atualizado');
      return [];
    }

    console.log(`   📦 Encontrados: ${pedidos.length} pedidos`);
    
    const eventos = [];
    for (const pedido of pedidos) {
      const identificador = `PEDIDO-${pedido.id}-${pedido.status}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      let rastreamento = null;
      try {
        rastreamento = await magazordService.buscarRastreamento(pedido.id);
      } catch (error) {
        // Rastreamento é opcional
      }

      const evento = transformerService.transformarPedido(pedido, null, rastreamento);
      
      // Tenta registrar no Supabase (evita duplicatas)
      const isNovo = await supabaseService.registrarEvento(
        identificador,
        'PEDIDO',
        { pedido_id: pedido.id, ...evento }
      );
      
      if (isNovo) {
        eventos.push(evento);
        marcarProcessado(identificador);
      }
    }

    console.log(`   ✅ Novos pedidos processados: ${eventos.length}`);
    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar pedidos:', error.message);
    return [];
  }
}

/**
 * Função principal do Cron - executa todas as sincronizações
 * Sistema incremental: processa apenas dados novos desde a última execução
 */
export async function executarSincronizacao() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 CRON EXECUTADO - SINCRONIZAÇÃO INICIADA');
  console.log('⏰ Horário: ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  console.log('='.repeat(80));

  const inicio = Date.now();
  let totalEventos = 0;
  let dataInicio, dataFim;
  let resultados = [];

  try {
    // 1. Busca última execução do Supabase
    dataInicio = await supabaseService.obterUltimaExecucao();
    dataFim = new Date();
    
    console.log(`\n📊 PERÍODO DE SINCRONIZAÇÃO:`);
    console.log(`   De: ${dataInicio.toISOString()} (${dataInicio.toLocaleString('pt-BR')})`);
    console.log(`   Até: ${dataFim.toISOString()} (${dataFim.toLocaleString('pt-BR')})`);
    
    // 2. Limpa cache se necessário
    limparCache();

    // 3. Processa carrinhos e pedidos de forma incremental
    const [eventosCarrinhos, eventosPedidos] = await Promise.all([
      processarCarrinhos(dataInicio, dataFim),
      processarPedidos(dataInicio, dataFim)
    ]);

    // Junta todos os eventos
    const todosEventos = [...eventosCarrinhos, ...eventosPedidos];
    totalEventos = todosEventos.length;

    if (totalEventos === 0) {
      console.log('\n✅ NENHUM EVENTO NOVO - Sistema atualizado!');
    } else {
      console.log(`\n📊 RESUMO: ${totalEventos} eventos novos encontrados`);
      console.log(`   🛒 Carrinhos: ${eventosCarrinhos.length}`);
      console.log(`   📦 Pedidos: ${eventosPedidos.length}`);
      console.log('\n📤 ENVIANDO PARA GHL...');

      // Envia todos os eventos para o GHL
      resultados = await ghlService.enviarLote(todosEventos);

      const sucessos = resultados.filter(r => r.success).length;
      const falhas = resultados.filter(r => !r.success).length;

      console.log(`\n✅ Enviados com sucesso: ${sucessos}`);
      if (falhas > 0) {
        console.log(`❌ Falhas no envio: ${falhas}`);
      }
      
      // Marca eventos como enviados no Supabase
      for (let i = 0; i < todosEventos.length; i++) {
        if (resultados[i]?.success) {
          const identificador = todosEventos[i].identificador;
          await supabaseService.marcarEventoEnviado(identificador, resultados[i]);
        }
      }
    }

    // 4. Salva timestamp da execução atual no Supabase
    await supabaseService.salvarUltimaExecucao(dataFim);
    
    // 5. Registra log da sincronização
    const duracaoMs = Date.now() - inicio;
    const eventosEnviados = totalEventos > 0 ? resultados.filter(r => r?.success).length : 0;
    await supabaseService.registrarLog(
      'cron_auto',
      totalEventos,
      totalEventos,
      eventosEnviados,
      duracaoMs
    );

    const duracao = (duracaoMs / 1000).toFixed(2);
    console.log('\n' + '='.repeat(80));
    console.log(`✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!`);
    console.log(`⏱️  Duração: ${duracao}s`);
    console.log(`📅 Próximo cron em 15 minutos buscará dados a partir de: ${dataFim.toISOString()}`);
    console.log('='.repeat(80) + '\n');

    return {
      success: true,
      totalEventos,
      duracao,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: dataFim.toISOString()
      }
    };

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERRO NA SINCRONIZAÇÃO!');
    console.error('Detalhes:', error.message);
    console.error('='.repeat(80) + '\n');
    
    // Registra erro no log
    const duracaoMs = Date.now() - inicio;
    await supabaseService.registrarLog(
      'cron_auto',
      0,
      0,
      0,
      duracaoMs,
      error.message
    );
    
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  executarSincronizacao
};
