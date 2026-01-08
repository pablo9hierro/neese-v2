/**
 * TESTE MANUAL - Buscar e enviar dados para GHL
 * Execute: node teste-manual-ghl.js
 */

import magazordService from './src/services/magazord.service.js';
import ghlService from './src/services/ghl.service.js';
import transformerService from './src/services/transformer.service.js';

async function testeManual() {
  console.log('🧪 TESTE MANUAL - Buscando dados do Magazord\n');
  
  // Data: 08/01/2026 em diante
  const dataInicio = new Date('2026-01-08T00:00:00-03:00');
  const dataFim = new Date();
  
  console.log(`📅 Período: ${dataInicio.toISOString()} até ${dataFim.toISOString()}\n`);
  
  const eventosProntos = [];
  
  // ==========================================
  // 1. BUSCAR CARRINHOS ABANDONADOS (status 2)
  // ==========================================
  console.log('🛒 BUSCANDO CARRINHOS ABANDONADOS...\n');
  
  try {
    const carrinhos = await magazordService.buscarCarrinhos(dataInicio, dataFim, '2'); // Status 2 = Abandonado
    console.log(`   Encontrados: ${carrinhos.length} carrinhos com status 2\n`);
    
    for (const carrinho of carrinhos) {
      // Filtrar por data de criação >= 08/01/2026
      const dataCriacao = new Date(carrinho.dataInicio);
      if (dataCriacao < dataInicio) {
        console.log(`   ❌ Carrinho ${carrinho.id} criado antes de 08/01/2026 - IGNORADO`);
        continue;
      }
      
      console.log(`\n   🔍 Processando carrinho ${carrinho.id}...`);
      
      // Buscar detalhes completos
      const carrinhoDetalhado = await magazordService.buscarCarrinhoPorId(carrinho.id);
      const itens = await magazordService.buscarItensCarrinho(carrinho.id);
      
      const carrinhoCompleto = {
        ...carrinho,
        ...carrinhoDetalhado,
        itens
      };
      
      console.log(`      pessoaId: ${carrinhoCompleto.pessoaId || 'NÃO TEM'}`);
      
      // Buscar telefone em /pessoa{id}
      let cliente = null;
      if (carrinhoCompleto.pessoaId) {
        try {
          cliente = await magazordService.buscarPessoa(carrinhoCompleto.pessoaId);
          console.log(`      ✅ Pessoa encontrada:`);
          console.log(`         Email: ${cliente?.email || 'N/A'}`);
          console.log(`         Telefone: ${cliente?.telefone || 'N/A'}`);
        } catch (err) {
          console.log(`      ⚠️ Erro ao buscar pessoa: ${err.message}`);
        }
      }
      
      // Verificar telefone
      const telefone = carrinhoCompleto.pessoaContato || cliente?.telefone || '';
      if (!telefone || telefone.trim() === '') {
        console.log(`      ❌ SEM TELEFONE - REJEITADO`);
        continue;
      }
      
      console.log(`      ✅ Telefone: ${telefone}`);
      
      // Transformar para formato GHL
      const evento = transformerService.transformarCarrinhoAbandonado(carrinhoCompleto, cliente);
      
      if (evento) {
        eventosProntos.push(evento);
        console.log(`      ✅ EVENTO CRIADO - Carrinho Abandonado`);
      }
    }
  } catch (error) {
    console.error('   ❌ Erro ao buscar carrinhos:', error.message);
  }
  
  // ==========================================
  // 2. BUSCAR PEDIDOS
  // ==========================================
  console.log('\n\n📦 BUSCANDO PEDIDOS...\n');
  
  try {
    const pedidos = await magazordService.buscarPedidos(dataInicio, dataFim);
    console.log(`   Encontrados: ${pedidos.length} pedidos\n`);
    
    // Buscar todas as pessoas em paralelo
    const pessoasIds = [...new Set(pedidos.filter(p => p.pessoaId).map(p => p.pessoaId))];
    console.log(`   📞 Buscando ${pessoasIds.length} pessoas em paralelo...\n`);
    
    const pessoasMap = {};
    await Promise.all(pessoasIds.map(async (id) => {
      try {
        const pessoa = await magazordService.buscarPessoa(id);
        if (pessoa) pessoasMap[id] = pessoa;
      } catch (err) {
        console.log(`      ⚠️ Erro pessoa ${id}: ${err.message}`);
      }
    }));
    
    console.log(`   ✅ ${Object.keys(pessoasMap).length} pessoas obtidas\n`);
    
    for (const pedido of pedidos) {
      console.log(`\n   🔍 Pedido ${pedido.id}:`);
      console.log(`      Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`      Nome: ${pedido.pessoaNome}`);
      console.log(`      Contato: ${pedido.pessoaContato}`);
      
      const cliente = pedido.pessoaId ? pessoasMap[pedido.pessoaId] : null;
      
      if (cliente) {
        console.log(`      Email: ${cliente.email || 'N/A'}`);
        console.log(`      Telefone: ${cliente.telefone || 'N/A'}`);
      }
      
      // Verificar telefone
      const telefone = pedido.pessoaContato || cliente?.telefone || '';
      if (!telefone || telefone.trim() === '') {
        console.log(`      ❌ SEM TELEFONE - REJEITADO`);
        continue;
      }
      
      console.log(`      ✅ Telefone OK: ${telefone}`);
      
      // Eventos específicos que você pediu:
      // 1. Pedido Aguardando Pagamento (status 1)
      // 2. PIX Expirado/Boleto Vencido (status 2 ou 14)
      // 3. Cartão Recusado (status 2 ou 14 + forma pagamento cartão)
      
      let tipoEvento = '';
      
      if (pedido.pedidoSituacao === 1) {
        tipoEvento = 'Pedido Aguardando Pagamento';
      } else if (pedido.pedidoSituacao === 2) {
        if (pedido.formaPagamentoNome?.toLowerCase().includes('cartão') || 
            pedido.formaPagamentoNome?.toLowerCase().includes('cartao')) {
          tipoEvento = 'Cartão Recusado';
        } else {
          tipoEvento = 'PIX Expirado / Boleto Vencido';
        }
      } else if (pedido.pedidoSituacao === 14) {
        if (pedido.formaPagamentoNome?.toLowerCase().includes('cartão') || 
            pedido.formaPagamentoNome?.toLowerCase().includes('cartao')) {
          tipoEvento = 'Cartão Recusado';
        } else {
          tipoEvento = 'PIX Expirado / Boleto Vencido';
        }
      } else {
        tipoEvento = `Outros (Status ${pedido.pedidoSituacao})`;
      }
      
      console.log(`      🎯 Evento: ${tipoEvento}`);
      
      // Transformar
      const pedidoCompleto = {
        ...pedido,
        clienteAPI: cliente
      };
      
      const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
      
      if (evento) {
        eventosProntos.push(evento);
        console.log(`      ✅ EVENTO CRIADO`);
      } else {
        console.log(`      ❌ Falha ao criar evento`);
      }
    }
  } catch (error) {
    console.error('   ❌ Erro ao buscar pedidos:', error.message);
  }
  
  // ==========================================
  // 3. RESUMO E ENVIO PARA GHL
  // ==========================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESUMO DOS EVENTOS PRONTOS PARA ENVIO');
  console.log('='.repeat(80) + '\n');
  
  if (eventosProntos.length === 0) {
    console.log('❌ NENHUM EVENTO VÁLIDO ENCONTRADO!\n');
    console.log('Possíveis motivos:');
    console.log('  - Nenhum pedido/carrinho de 08/01/2026 em diante');
    console.log('  - Todos sem número de telefone');
    console.log('  - Status não correspondem aos eventos solicitados\n');
    return;
  }
  
  console.log(`✅ Total de eventos: ${eventosProntos.length}\n`);
  
  // Mostrar resumo por tipo
  const resumo = {};
  eventosProntos.forEach(ev => {
    const tipo = ev.tipo_evento;
    resumo[tipo] = (resumo[tipo] || 0) + 1;
  });
  
  console.log('Por tipo de evento:');
  Object.entries(resumo).forEach(([tipo, qtd]) => {
    console.log(`  - ${tipo}: ${qtd}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📤 ENVIANDO PARA GHL...');
  console.log('='.repeat(80) + '\n');
  
  // Enviar para GHL
  for (let i = 0; i < eventosProntos.length; i++) {
    const evento = eventosProntos[i];
    console.log(`\n[${i + 1}/${eventosProntos.length}] Enviando evento:`);
    console.log(`    Tipo: ${evento.tipo_evento}`);
    console.log(`    Nome: ${evento.pessoa.nome}`);
    console.log(`    Telefone: ${evento.pessoa.telefone}`);
    console.log(`    Email: ${evento.pessoa.email}`);
    
    if (evento.pedido_id) {
      console.log(`    Pedido ID: ${evento.pedido_id}`);
      console.log(`    Status: ${evento.status.codigo} - ${evento.status.descricao}`);
    } else if (evento.carrinho_id) {
      console.log(`    Carrinho ID: ${evento.carrinho_id}`);
      console.log(`    Status Carrinho: ${evento.carrinho.status_codigo}`);
    }
    
    try {
      const resultado = await ghlService.enviarDados(evento);
      if (resultado.success) {
        console.log(`    ✅ SUCESSO - Enviado para GHL!`);
      } else {
        console.log(`    ❌ FALHA - ${resultado.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.log(`    ❌ ERRO - ${error.message}`);
    }
    
    // Aguardar 500ms entre envios
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTE CONCLUÍDO!');
  console.log('='.repeat(80) + '\n');
}

// Executar
testeManual().catch(error => {
  console.error('\n❌ ERRO NO TESTE:', error);
  console.error(error.stack);
});
