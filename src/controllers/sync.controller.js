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
    
    // FILTRO: Apenas carrinhos CRIADOS a partir de 08/01/2026
    const dataLimite = new Date('2026-01-08T00:00:00-03:00');
    const carrinhosFiltrados = carrinhos.filter(c => {
      const dataInicio = new Date(c.dataInicio);
      return dataInicio >= dataLimite;
    });
    
    if (carrinhosFiltrados.length < carrinhos.length) {
      console.log(`   🗑️  ${carrinhos.length - carrinhosFiltrados.length} carrinhos ignorados (criados antes de 08/01/2026)`);
    }
    
    console.log(`   ✅ ${carrinhosFiltrados.length} carrinhos válidos (criados >= 08/01/2026)`);
    
    // FILTRAR apenas carrinhos ABANDONADOS (status 2) - eventos usados no GHL
    const carrinhosRelevantes = carrinhosFiltrados.filter(c => c.status === 2);
    console.log(`   ✅ ${carrinhosRelevantes.length} carrinhos abandonados (status 2) para processar`);
    
    if (carrinhosRelevantes.length === 0) {
      console.log('   ✓ Nenhum carrinho para processar');
      return [];
    }
    
    // OTIMIZAÇÃO: Buscar TODAS as pessoas em paralelo (igual aos pedidos)
    const pessoasIds = [...new Set(carrinhosRelevantes.filter(c => c.pessoaId).map(c => c.pessoaId))];
    console.log(`\n   📧 Buscando dados de ${pessoasIds.length} pessoas em paralelo...`);
    
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
    console.log(`   ✅ ${Object.keys(pessoasMap).length} pessoas com dados completos\n`);
    
    // OTIMIZAÇÃO: Buscar TODOS os itens em paralelo
    const itensMap = {};
    const itensPromises = carrinhosRelevantes.map(async (carrinho) => {
      try {
        const itens = await magazordService.buscarItensCarrinho(carrinho.id);
        itensMap[carrinho.id] = itens || {};
      } catch (err) {
        console.log(`      ⚠️ Erro ao buscar itens do carrinho ${carrinho.id}: ${err.message}`);
        itensMap[carrinho.id] = {};
      }
    });
    
    await Promise.all(itensPromises);
    console.log(`   ✅ Itens buscados para ${Object.keys(itensMap).length} carrinhos\n`);
    
    const eventos = [];
    for (const carrinho of carrinhosRelevantes) {
      const identificador = `CARRINHO-${carrinho.id}-${carrinho.status}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      // Montar carrinho completo com dados já obtidos (sem novas requisições!)
      const cliente = carrinho.pessoaId ? pessoasMap[carrinho.pessoaId] : null;
      const itensResponse = itensMap[carrinho.id] || {};
      const linkCheckout = transformerService.extrairLinkCheckoutCarrinho(itensResponse);
      
      // 🆕 EXTRAIR DADOS DE PESSOA DO ITENS RESPONSE
      // Endpoint /v2/site/carrinho/{id}/itens retorna pessoa.contato_principal
      const pessoaCarrinho = itensResponse.carrinho?.pessoa || null;
      const draft = itensResponse.carrinho?.draft || carrinho.draft || null;
      
      const carrinhoCompleto = {
        ...carrinho,
        itens: itensResponse.carrinho?.itens || [],
        linkCheckout: linkCheckout,
        pessoaCarrinho: pessoaCarrinho,
        draft: draft
      };
      
      console.log(`   🔍 Carrinho ${carrinho.id} - pessoaId: ${carrinho.pessoaId || 'NÃO TEM'}`);
      
      if (cliente) {
        console.log(`      - Email (API pessoa): ${cliente.email || 'N/A'}`);
        console.log(`      - Telefone (API pessoa): ${cliente.telefone || 'N/A'}`);
      }
      
      if (pessoaCarrinho) {
        console.log(`      - Email (carrinho): ${pessoaCarrinho.email || 'N/A'}`);
        console.log(`      - Telefone (carrinho): ${pessoaCarrinho.contato_principal || 'N/A'}`);
      }
      
      if (draft) {
        const emailDraft = draft.email || draft['pessoa-fisica']?.email || draft['pessoa-juridica']?.email;
        const telefoneDraft = draft['pessoa-fisica']?.celular || draft['pessoa-fisica']?.telefone || draft['pessoa-juridica']?.celular || draft['pessoa-juridica']?.telefone;
        console.log(`      - Email (draft): ${emailDraft || 'N/A'}`);
        console.log(`      - Telefone (draft): ${telefoneDraft || 'N/A'}`);
      }
      
      // Verificar telefone (prioridade: pessoa do carrinho > cliente da API > draft)
      const telefone = pessoaCarrinho?.contato_principal || 
                      cliente?.telefone || 
                      draft?.['pessoa-fisica']?.celular || 
                      draft?.['pessoa-fisica']?.telefone ||
                      draft?.['pessoa-juridica']?.celular ||
                      draft?.['pessoa-juridica']?.telefone || 
                      '';
      
      if (!telefone || telefone.trim() === '') {
        console.log(`   ❌ Carrinho ${carrinho.id} REJEITADO - Sem telefone`);
        continue;
      }
      
      console.log(`   ✅ Carrinho ${carrinho.id} tem telefone: ${telefone}`);
      console.log(`   🔗 Link checkout: ${linkCheckout || '❌ NÃO TEM'}`);

      // Processar apenas carrinho abandonado (status 2)
      let evento = null;
      
      if (carrinho.status === 2) {
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

    console.log(`   📦 Processando ${pedidos.length} pedidos...`);
    
    const eventos = [];
    
    // OTIMIZAÇÃO: Buscar dados completos de TODAS as pessoas de uma vez (paralelo)
    const pessoasIds = [...new Set(pedidos.filter(p => p.pessoaId).map(p => p.pessoaId))];
    console.log(`\n   📧 Buscando dados de ${pessoasIds.length} pessoas em paralelo...`);
    
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
    console.log(`   ✅ ${Object.keys(pessoasMap).length} pessoas com dados completos`);
    
    // Processar TODOS os pedidos com os dados já obtidos
    for (const pedido of pedidos) {
      console.log(`\n   🔹 Pedido ${pedido.id}:`);
      console.log(`      - Código: ${pedido.codigo}`);
      console.log(`      - Status: ${pedido.pedidoSituacao}`);
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
        console.log(`      ✅ Telefone: ${cliente.telefone || 'N/A'}`);
      }
      
      // ⚠️ VALIDAÇÃO OBRIGATÓRIA: Telefone deve existir
      const telefone = pedido.pessoaContato || cliente?.telefone || '';
      if (!telefone || telefone.trim() === '') {
        console.log(`      ❌ REJEITADO - Sem número de telefone`);
        continue;
      }

      // 🆕 BUSCAR PAGAMENTO (para obter link)
      let linkPagamento = null;
      
      if (pedido.pedidoSituacao === 1 || pedido.pedidoSituacao === 2 || pedido.pedidoSituacao === 14) {
        console.log(`      💳 Buscando pagamento...`);
        const payment = await magazordService.buscarPagamentoPedido(pedido.codigo);
        
        if (payment) {
          linkPagamento = transformerService.extrairLinkPagamento(payment);
          console.log(`      ✅ Link pagamento: ${linkPagamento ? 'TEM' : 'NÃO TEM'}`);
        }
      }

      // Montar pedido completo
      const pedidoCompleto = {
        ...pedido,
        clienteAPI: cliente,
        linkPagamento: linkPagamento
      };
      
      console.log(`      🔄 Transformando pedido...`);
      
      // Transformar pedido (apenas status usados no GHL)
      const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
      
      if (!evento) {
        console.log(`      ❌ Rejeitado (status não usado no GHL ou sem dados obrigatórios)`);
        continue;
      }
      
      console.log(`      ✅ Evento criado: ${evento.tipo_evento}`);
      
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
    // 📅 A partir de 23/02/2026 às 09:00 AM
    dataInicio = new Date('2026-02-23T09:00:00-03:00');
    dataFim = new Date();
    
    console.log(`\n📊 PERÍODO DE SINCRONIZAÇÃO:`);
    console.log(`   De: ${dataInicio.toISOString()}`)
    console.log(`   Até: ${dataFim.toISOString()}`);    
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
