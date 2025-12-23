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
  eventosProcessados.clear();
  console.log('🧹 Cache de eventos limpo');
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
        console.log(`   ⏭️  Pulando carrinho ${carrinho.id} (status 3 - convertido em pedido)`);
        continue;
      }

      // Processar apenas status relevantes: 1 (aberto), 2 (checkout), 4 (abandonado)
      if (![1, 2, 4].includes(carrinho.status)) {
        console.log(`   ⏭️  Pulando carrinho ${carrinho.id} (status ${carrinho.status} - não rastreado)`);
        continue;
      }

      let carrinhoCompleto = { ...carrinho };
      let cliente = null;
      let itens = [];
      
      try {
        // Buscar itens do carrinho
        itens = await magazordService.buscarItensCarrinho(carrinho.id);
        carrinhoCompleto.itens = itens;
        
        // NOVO: Buscar dados da pessoa se tiver pessoaId (para obter email/telefone)
        if (carrinho.pessoaId) {
          try {
            cliente = await magazordService.buscarPessoa(carrinho.pessoaId);
            console.log(`   ✅ Dados da pessoa ${carrinho.pessoaId} obtidos - Email: ${cliente?.email || 'N/A'}`);
          } catch (error) {
            console.log(`   ⚠️ Erro ao buscar pessoa ${carrinho.pessoaId}:`, error.message);
          }
        }
        
      } catch (error) {
        console.log(`   ⚠️ Erro ao buscar dados do carrinho ${carrinho.id}:`, error.message);
      }

      // Processar TODOS os status relevantes (1, 2, 4)
      let evento = null;
      
      if (carrinho.status === 1) {
        evento = transformerService.transformarCarrinhoAberto(carrinhoCompleto, cliente);
      } else if (carrinho.status === 2) {
        evento = transformerService.transformarCarrinhoCheckout(carrinhoCompleto, cliente);
      } else if (carrinho.status === 4) {
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
          console.log(`   ✅ Carrinho ${carrinho.id} (status ${carrinho.status}) adicionado à fila`);
        }
      } else {
        console.log(`   ⚠️  Carrinho ${carrinho.id} rejeitado (sem email/telefone)`);
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

    // 🎯 FILTRO: APENAS PEDIDOS CANCELADOS (status 8) - Economia de requisições GHL
    const pedidosCancelados = pedidos.filter(p => p.pedidoSituacao === 8);
    const ignorados = pedidos.length - pedidosCancelados.length;
    
    if (ignorados > 0) {
      console.log(`   ⏭️  ${ignorados} pedidos ignorados (enviando apenas cancelados - status 8)`);
    }
    
    if (pedidosCancelados.length === 0) {
      console.log('   ✓ Nenhum pedido cancelado (status 8) encontrado');
      return [];
    }

    console.log(`   📦 Processando ${pedidosCancelados.length} pedidos cancelados...`);
    
    const eventos = [];
    
    // OTIMIZAÇÃO: Buscar emails de TODAS as pessoas de uma vez (paralelo)
    const pessoasIds = [...new Set(pedidosCancelados.filter(p => p.pessoaId).map(p => p.pessoaId))];
    console.log(`\n   📧 Buscando emails de ${pessoasIds.length} pessoas em paralelo...`);
    
    const pessoasMap = {};
    const pessoasPromises = pessoasIds.map(async (id) => {
      try {
        const pessoa = await magazordService.buscarPessoa(id);
        if (pessoa) pessoasMap[id] = pessoa;
      } catch (err) {
        console.log(`      ⚠️ Erro ao buscar pessoa ${id}: ${err.message}`);
      }
    });
    
    await Promise.all(pessoasPromises);
    console.log(`   ✅ ${Object.keys(pessoasMap).length} emails obtidos`);
    
    // Processar pedidos cancelados com os dados já obtidos
    for (const pedido of pedidosCancelados) {
      console.log(`\n   🔹 Pedido ${pedido.id}:`);
      console.log(`      - Status: 8 (CANCELADO)`);
      console.log(`      - Nome: ${pedido.pessoaNome}`);
      console.log(`      - Contato: ${pedido.pessoaContato}`);
      
      const identificador = `PEDIDO-${pedido.id}-${pedido.pedidoSituacao}`;
      
      if (jaFoiProcessado(identificador)) {
        console.log(`      ⏭️  Já processado`);
        continue;
      }

      // Usar dados já obtidos (sem novas requisições!)
      const cliente = pedido.pessoaId ? pessoasMap[pedido.pessoaId] : null;
      if (cliente) {
        console.log(`      ✅ Email: ${cliente.email || 'N/A'}`);
      }

      // Montar pedido completo
      const pedidoCompleto = {
        ...pedido,
        clienteAPI: cliente
      };
      
      console.log(`      🔄 Transformando pedido...`);
      // Rastreamento: opcional, só busca se realmente necessário (pedido enviado)
      let rastreamento = null;
      if (pedido.pedidoSituacao >= 6) {
        try {
          rastreamento = await magazordService.buscarRastreamento(pedido.id);
        } catch (err) {
          console.log(`      ⚠️ Rastreamento não encontrado`);
        }
      }
      
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
    // TEMPORÁRIO: Buscar apenas dia 20/12/2025
    dataInicio = new Date('2025-12-20T00:00:00-03:00');
    dataFim = new Date('2025-12-20T23:59:59-03:00');
    
    console.log(`\n📊 PERÍODO DE SINCRONIZAÇÃO:`);
    console.log(`   De: ${dataInicio.toISOString()} (${dataInicio.toLocaleString('pt-BR')})`);
    console.log(`   Até: ${dataFim.toISOString()} (${dataFim.toLocaleString('pt-BR')})`);
    
    const diferencaMinutos = Math.floor((dataFim - dataInicio) / (1000 * 60));
    console.log(`   ⏱️  Janela: ${diferencaMinutos} minutos`);
    console.log(`   🔄 Buscando dados do dia 20/12/2025`);    
    // 2. Limpa cache se necessário
    limparCache();

    // 3. Processa CARRINHOS e PEDIDOS
    console.log('\n🛒 Processando carrinhos...');
    const eventosCarrinhos = await processarCarrinhos(dataInicio, dataFim);
    
    console.log('\n📦 Processando pedidos...');
    const eventosPedidos = await processarPedidos(dataInicio, dataFim);

    // Junta todos os eventos
    const todosEventos = [...eventosCarrinhos, ...eventosPedidos];
    totalEventos = todosEventos.length;

    if (totalEventos === 0) {
      console.log('\n✅ NENHUM EVENTO NOVO - Sistema atualizado!');
    } else {
      console.log(`\n📊 RESUMO: ${totalEventos} eventos novos encontrados`);
      console.log(`    Carrinhos: ${eventosCarrinhos.length}`);
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
