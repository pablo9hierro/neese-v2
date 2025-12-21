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

      // SKIP: Carrinho convertido será processado como pedido
      if (carrinho.status === 3) {
        continue;
      }

      // SKIP: Carrinhos abertos (status 1) e abandonados (status 4) raramente têm dados de contato
      // Apenas processar checkout (status 2) que tem mais chance de ter pessoa
      if (carrinho.status === 1 || carrinho.status === 4) {
        console.log(`   ⏭️  Pulando carrinho ${carrinho.id} (status ${carrinho.status}) - sem garantia de contato`);
        continue;
      }

      let carrinhoCompleto = { ...carrinho };
      let cliente = null;
      let itens = [];
      
      try {
        // Buscar itens do carrinho
        itens = await magazordService.buscarItensCarrinho(carrinho.id);
        carrinhoCompleto.itens = itens;
        
      } catch (error) {
        console.log(`   ⚠️ Erro ao buscar itens do carrinho ${carrinho.id}:`, error.message);
      }

      // Processar apenas checkout (status 2)
      let evento = null;
      if (carrinho.status === 2) {
        evento = transformerService.transformarCarrinhoCheckout(carrinhoCompleto, cliente);
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
      } else {
        console.log(`   ⚠️  Carrinho ${carrinho.id} rejeitado (sem dados obrigatórios)`);
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
    console.log(`   🔍 API retornou: ${pedidos ? pedidos.length : 0} pedidos`);
    
    if (!pedidos || pedidos.length === 0) {
      console.log('   ✓ Nenhum pedido novo ou atualizado');
      return [];
    }

    console.log(`   📦 Processando ${pedidos.length} pedidos...`);
    
    const eventos = [];
    for (const pedido of pedidos) {
      console.log(`\n   🔹 Pedido ${pedido.id}:`);
      console.log(`      - Status: ${pedido.pedidoSituacao}`);
      console.log(`      - PessoaId: ${pedido.pessoaId}`);
      console.log(`      - Nome: ${pedido.pessoaNome}`);
      console.log(`      - Contato: ${pedido.pessoaContato}`);
      
      const identificador = `PEDIDO-${pedido.id}-${pedido.pedidoSituacao}`;
      
      if (jaFoiProcessado(identificador)) {
        console.log(`      ⏭️  Já processado`);
        continue;
      }

      // Pedidos da lista JÁ vêm com pessoaId, pessoaNome, pessoaContato!
      let cliente = null;
      let rastreamento = null;
      
      try {
        // 1. Buscar dados completos da pessoa
        if (pedido.pessoaId) {
          console.log(`      🔍 Buscando pessoa ${pedido.pessoaId}...`);
          cliente = await magazordService.buscarPessoa(pedido.pessoaId);
          console.log(`      ✅ Pessoa: ${cliente ? cliente.nome : 'não encontrada'}`);
          console.log(`         Email: ${cliente ? cliente.email : 'N/A'}`);
        }
        
        // 2. Buscar rastreamento se pedido foi enviado
        if (pedido.pedidoSituacao >= 6) {
          console.log(`      🔍 Buscando rastreamento...`);
          rastreamento = await magazordService.buscarRastreamento(pedido.id);
        }
      } catch (error) {
        console.log(`      ⚠️ Erro ao buscar dados: ${error.message}`);
      }

      // Montar pedido completo
      const pedidoCompleto = {
        ...pedido,
        clienteAPI: cliente // Passar cliente completo
      };
      
      console.log(`      🔄 Transformando pedido...`);
      const evento = transformerService.transformarPedido(pedidoCompleto, null, rastreamento);
      
      if (!evento) {
        console.log(`      ❌ Rejeitado (sem dados obrigatórios)`);
        continue;
      }
      
      console.log(`      ✅ Evento criado!`);
      
      // Tenta registrar no Supabase (evita duplicatas)
      const isNovo = await supabaseService.registrarEvento(
        identificador,
        'PEDIDO',
        { pedido_id: pedido.id, ...evento }
      );
      
      if (isNovo) {
        eventos.push(evento);
        marcarProcessado(identificador);
        console.log(`      ✅ Adicionado à fila de envio`);
      } else {
        console.log(`      ⏭️  Duplicado (já registrado no Supabase)`);
      }
    }

    console.log(`\n   ✅ Novos pedidos processados: ${eventos.length}/${pedidos.length}`);
    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar pedidos:', error.message);
    console.error(error.stack);
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

    // 3. Processa APENAS PEDIDOS (dados de pessoa garantidos)
    console.log('\n📦 Processando pedidos...');
    const eventosPedidos = await processarPedidos(dataInicio, dataFim);

    // Junta todos os eventos
    const todosEventos = [...eventosPedidos];
    totalEventos = todosEventos.length;

    if (totalEventos === 0) {
      console.log('\n✅ NENHUM EVENTO NOVO - Sistema atualizado!');
    } else {
      console.log(`\n📊 RESUMO: ${totalEventos} eventos novos encontrados`);
      console.log(`    Pedidos: ${eventosPedidos.length}`);
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
