import magazordService from '../src/services/magazord.service.js';
import transformerService from '../src/services/transformer.service.js';

/**
 * Script de teste: Estrutura completa dos eventos enviados ao GHL
 * Valida que TODOS campos obrigatórios estão preenchidos
 */

async function testarEventosCompleto() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTE: Estrutura Completa dos Eventos GHL');
  console.log('='.repeat(80) + '\n');

  try {
    // Buscar dados reais
    const dataInicio = new Date('2026-01-08T00:00:00-03:00');
    const dataFim = new Date();
    
    console.log('📦 1. Buscando pedidos reais...\n');
    const pedidos = await magazordService.buscarPedidos(dataInicio, dataFim);
    
    console.log('🛒 2. Buscando carrinhos reais...\n');
    const carrinhos = await magazordService.buscarCarrinhos(dataInicio, dataFim);
    
    console.log(`✅ Encontrados: ${pedidos.length} pedidos e ${carrinhos.length} carrinhos\n`);
    
    // ===== TESTE 1: CARRINHO ABANDONADO =====
    console.log('\n' + '━'.repeat(80));
    console.log('📋 TESTE 1: CARRINHO ABANDONADO (status 2)');
    console.log('━'.repeat(80) + '\n');
    
    const carrinhosAbandonados = carrinhos.filter(c => c.status === 2);
    
    if (carrinhosAbandonados.length > 0) {
      const carrinhoTeste = carrinhosAbandonados[0];
      
      console.log(`🛒 Carrinho ID: ${carrinhoTeste.id}`);
      console.log(`   Status: ${carrinhoTeste.status}`);
      console.log(`   Hash: ${carrinhoTeste.hash || '❌ NÃO TEM'}`);
      console.log('');
      
      // Buscar itens
      const itens = await magazordService.buscarItensCarrinho(carrinhoTeste.id);
      
      // Buscar cliente
      let cliente = null;
      if (carrinhoTeste.pessoaId) {
        cliente = await magazordService.buscarPessoa(carrinhoTeste.pessoaId);
        console.log(`👤 Cliente encontrado:`);
        console.log(`   Nome: ${cliente?.nome}`);
        console.log(`   Email: ${cliente?.email}`);
        console.log(`   Telefone: ${cliente?.telefone || carrinhoTeste.pessoaContato}`);
        console.log('');
      }
      
      // Gerar evento
      const carrinhoCompleto = {
        ...carrinhoTeste,
        itens,
        linkCheckout: transformerService.gerarLinkCheckout(carrinhoTeste)
      };
      
      const evento = transformerService.transformarCarrinhoAbandonado(carrinhoCompleto, cliente);
      
      console.log('📤 EVENTO GERADO:');
      console.log(JSON.stringify(evento, null, 2));
      console.log('');
      
      // Validações
      console.log('✅ VALIDAÇÕES:');
      console.log(`   tipo_evento preenchido: ${evento?.tipo_evento ? '✅' : '❌'}`);
      console.log(`   pessoa.phone preenchido: ${evento?.pessoa?.phone ? '✅' : '❌'}`);
      console.log(`   pessoa.email preenchido: ${evento?.pessoa?.email ? '✅' : '❌'}`);
      console.log(`   carrinho.link_checkout: ${carrinhoCompleto.linkCheckout ? '✅' : '❌ FALTANDO'}`);
      console.log(`   carrinho.valor_total: ${evento?.carrinho?.valor_total ? '✅' : '❌'}`);
      console.log(`   carrinho.itens.length: ${evento?.carrinho?.itens?.length || 0}`);
      console.log('');
      
    } else {
      console.log('⚠️  Nenhum carrinho abandonado encontrado\n');
    }
    
    // ===== TESTE 2: PEDIDO AGUARDANDO PAGAMENTO =====
    console.log('\n' + '━'.repeat(80));
    console.log('📋 TESTE 2: PEDIDO AGUARDANDO PAGAMENTO (status 1)');
    console.log('━'.repeat(80) + '\n');
    
    const pedidosAguardando = pedidos.filter(p => p.pedidoSituacao === 1);
    
    if (pedidosAguardando.length > 0) {
      const pedidoTeste = pedidosAguardando[0];
      
      console.log(`📦 Pedido ID: ${pedidoTeste.id}`);
      console.log(`   Código: ${pedidoTeste.codigo}`);
      console.log(`   Status: ${pedidoTeste.ped idoSituacao}`);
      console.log(`   Forma Pagamento: ${pedidoTeste.formaPagamentoNome}`);
      console.log('');
      
      // Buscar cliente
      let cliente = null;
      if (pedidoTeste.pessoaId) {
        cliente = await magazordService.buscarPessoa(pedidoTeste.pessoaId);
        console.log(`👤 Cliente encontrado:`);
        console.log(`   Nome: ${cliente?.nome}`);
        console.log(`   Email: ${cliente?.email}`);
        console.log(`   Telefone: ${cliente?.telefone || pedidoTeste.pessoaContato}`);
        console.log('');
      }
      
      // 🆕 BUSCAR PAGAMENTO
      console.log(`💳 Buscando informações de pagamento...\n`);
      
      try {
        const axios = (await import('axios')).default;
        const config = (await import('../src/config/index.js')).default;
        
        const response = await axios.get(
          `${config.magazord.apiUrl}/v2/site/pedido/${pedidoTeste.id}/payments`,
          {
            auth: {
              username: config.magazord.user,
              password: config.magazord.password
            }
          }
        );
        
        const payment = response.data?.data?.items?.[0];
        
        if (payment) {
          console.log('✅ Payment encontrado:');
          console.log(`   Forma: ${payment.formaRecebimento}`);
          console.log(`   Gateway: ${payment.gateway}`);
          console.log(`   Valor: R$ ${payment.valor}`);
          
          if (payment.boleto) {
            console.log(`   📄 Boleto URL: ${payment.boleto.url || '❌ NÃO TEM'}`);
          }
          
          if (payment.pix) {
            console.log(`   📱 PIX QR Code: ${payment.pix.qrCode ? '✅ TEM' : '❌ NÃO TEM'}`);
            console.log(`   📱 PIX Expiração: ${payment.pix.dataExpiracao || 'N/A'}`);
          }
          
          console.log('');
        } else {
          console.log('❌ Nenhum payment encontrado\n');
        }
        
        // Adicionar payment ao pedido
        const pedidoCompleto = {
          ...pedidoTeste,
          clienteAPI: cliente,
          payment: payment,
          linkPagamento: payment?.boleto?.url || payment?.pix?.qrCode || null
        };
        
        // Gerar evento
        const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
        
        console.log('📤 EVENTO GERADO:');
        console.log(JSON.stringify(evento, null, 2));
        console.log('');
        
        // Validações
        console.log('✅ VALIDAÇÕES:');
        console.log(`   tipo_evento: ${evento?.tipo_evento || '❌'}`);
        console.log(`   pessoa.phone preenchido: ${evento?.pessoa?.phone ? '✅' : '❌'}`);
        console.log(`   pessoa.email preenchido: ${evento?.pessoa?.email ? '✅' : '❌'}`);
        console.log(`   pedido.link_pagamento: ${evento?.pedido?.link_pagamento ? '✅ TEM' : '❌ FALTANDO'}`);
        console.log(`   pedido.valor_total: ${evento?.pedido?.valor_total ? '✅' : '❌'}`);
        console.log(`   pedido.forma_pagamento: ${evento?.pedido?.forma_pagamento || '❌'}`);
        console.log('');
        
      } catch (error) {
        console.error('❌ Erro ao buscar payment:', error.message);
      }
      
    } else {
      console.log('⚠️  Nenhum pedido aguardando pagamento encontrado\n');
    }
    
    // ===== TESTE 3: PIX EXPIRADO / BOLETO VENCIDO =====
    console.log('\n' + '━'.repeat(80));
    console.log('📋 TESTE 3: PIX EXPIRADO / BOLETO VENCIDO (status 2 ou 14)');
    console.log('━'.repeat(80) + '\n');
    
    const pedidosCancelados = pedidos.filter(p => p.pedidoSituacao === 2 || p.pedidoSituacao === 14);
    
    if (pedidosCancelados.length > 0) {
      const pedidoTeste = pedidosCancelados[0];
      
      console.log(`📦 Pedido ID: ${pedidoTeste.id}`);
      console.log(`   Código: ${pedidoTeste.codigo}`);
      console.log(`   Status: ${pedidoTeste.pedidoSituacao}`);
      console.log(`   Forma Pagamento: ${pedidoTeste.formaPagamentoNome}`);
      console.log('');
      
      // Buscar cliente
      let cliente = null;
      if (pedidoTeste.pessoaId) {
        cliente = await magazordService.buscarPessoa(pedidoTeste.pessoaId);
      }
      
      // Buscar payment
      try {
        const axios = (await import('axios')).default;
        const config = (await import('../src/config/index.js')).default;
        
        const response = await axios.get(
          `${config.magazord.apiUrl}/v2/site/pedido/${pedidoTeste.id}/payments`,
          {
            auth: {
              username: config.magazord.user,
              password: config.magazord.password
            }
          }
        );
        
        const payment = response.data?.data?.items?.[0];
        
        const pedidoCompleto = {
          ...pedidoTeste,
          clienteAPI: cliente,
          payment: payment,
          linkPagamento: payment?.boleto?.url || payment?.pix?.qrCode || null
        };
        
        const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
        
        if (evento) {
          console.log('📤 EVENTO GERADO:');
          console.log(JSON.stringify(evento, null, 2));
          console.log('');
          
          console.log('✅ VALIDAÇÕES:');
          console.log(`   tipo_evento: ${evento?.tipo_evento} (esperado: pix_expirado ou boleto_vencido)`);
          console.log(`   pedido.link_pagamento: ${evento?.pedido?.link_pagamento ? '✅ TEM' : '❌ FALTANDO'}`);
          console.log('');
        } else {
          console.log('⚠️  Evento não gerado (pode não ter telefone ou forma de pagamento não identificada)\n');
        }
        
      } catch (error) {
        console.error('❌ Erro ao buscar payment:', error.message);
      }
      
    } else {
      console.log('⚠️  Nenhum pedido cancelado encontrado\n');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE CONCLUÍDO');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error(error);
  }
}

// Executar teste
testarEventosCompleto();
