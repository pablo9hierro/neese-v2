import magazordService from '../src/services/magazord.service.js';
import ghlService from '../src/services/ghl.service.js';
import transformerService from '../src/services/transformer.service.js';

export default async function handler(req, res) {
  console.log('\n🧪 TESTE - BUSCA DIA 20/12/2025');
  
  try {
    // Busca apenas do dia 21/12/2025
    const dataInicio = new Date('2025-12-21T00:00:00-03:00');
    const dataFim = new Date('2025-12-21T23:59:59-03:00');
    
    console.log(`📅 De: ${dataInicio.toISOString()}`);
    console.log(`📅 Até: ${dataFim.toISOString()}`);
    
    // Busca carrinhos
    console.log('\n🛒 Buscando carrinhos...');
    const carrinhos = await magazordService.buscarCarrinhos(dataInicio, dataFim);
    console.log(`   ✅ ${carrinhos ? carrinhos.length : 0} carrinhos encontrados`);
    
    // Busca pedidos (apenas 3)
    console.log('\n📦 Buscando pedidos (limit 3)...');
    const pedidos = await magazordService.buscarPedidos(dataInicio, dataFim);
    console.log(`   ✅ ${pedidos ? pedidos.length : 0} pedidos encontrados`);
    
    const eventosParaEnviar = [];
    
    // Processa primeiro carrinho (se tiver)
    if (carrinhos && carrinhos.length > 0) {
      const carrinho = carrinhos[0];
      console.log(`\n🔹 Processando carrinho ${carrinho.id}, status ${carrinho.status}`);
      
      let evento = null;
      if (carrinho.status === 1) {
        evento = transformerService.transformarCarrinhoAberto(carrinho, null);
      } else if (carrinho.status === 2) {
        evento = transformerService.transformarCarrinhoCheckout(carrinho, null);
      } else if (carrinho.status === 4) {
        evento = transformerService.transformarCarrinhoAbandonado(carrinho, null);
      }
      
      if (evento) {
        console.log('   ✅ Evento criado!');
        eventosParaEnviar.push(evento);
      } else {
        console.log('   ❌ Evento rejeitado (sem dados)');
      }
    }
    
    // Processa primeiros 3 pedidos
    if (pedidos && pedidos.length > 0) {
      const pedidosLimitados = pedidos.slice(0, 3);
      
      // Busca emails
      const pessoasIds = [...new Set(pedidosLimitados.filter(p => p.pessoaId).map(p => p.pessoaId))];
      console.log(`\n📧 Buscando ${pessoasIds.length} emails...`);
      
      const pessoasMap = {};
      for (const id of pessoasIds) {
        try {
          const pessoa = await magazordService.buscarPessoa(id);
          if (pessoa) pessoasMap[id] = pessoa;
        } catch (err) {
          console.log(`   ⚠️ Erro ao buscar pessoa ${id}`);
        }
      }
      console.log(`   ✅ ${Object.keys(pessoasMap).length} emails obtidos`);
      
      for (const pedido of pedidosLimitados) {
        console.log(`\n🔹 Processando pedido ${pedido.id}, status ${pedido.pedidoSituacao}`);
        
        const cliente = pedido.pessoaId ? pessoasMap[pedido.pessoaId] : null;
        if (cliente) {
          console.log(`   Email: ${cliente.email}`);
        }
        
        const pedidoCompleto = { ...pedido, clienteAPI: cliente };
        
        let rastreamento = null;
        if (pedido.pedidoSituacao >= 6) {
          try {
            rastreamento = await magazordService.buscarRastreamento(pedido.id);
          } catch (err) {
            // Sem rastreamento
          }
        }
        
        const evento = transformerService.transformarPedido(pedidoCompleto, null, rastreamento);
        
        if (evento) {
          console.log('   ✅ Evento criado!');
          eventosParaEnviar.push(evento);
        } else {
          console.log('   ❌ Evento rejeitado');
        }
      }
    }
    
    console.log(`\n📊 Total de eventos: ${eventosParaEnviar.length}`);
    
    if (eventosParaEnviar.length > 0) {
      console.log('\n📤 Enviando para GHL...');
      console.log('📋 Primeiro evento:');
      console.log(JSON.stringify(eventosParaEnviar[0], null, 2));
      
      const resultados = await ghlService.enviarLote(eventosParaEnviar);
      const sucessos = resultados.filter(r => r.success).length;
      
      console.log(`✅ ${sucessos}/${eventosParaEnviar.length} enviados com sucesso`);
      
      return res.status(200).json({
        success: true,
        totalEventos: eventosParaEnviar.length,
        enviados: sucessos,
        eventos: eventosParaEnviar,
        resultados
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Nenhum evento válido encontrado',
        totalCarrinhos: carrinhos ? carrinhos.length : 0,
        totalPedidos: pedidos ? pedidos.length : 0
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
