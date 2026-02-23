import magazordService from '../src/services/magazord.service.js';

/**
 * Script de teste: Buscar detalhes de pagamento de um pedido
 * Testa endpoint: GET /v2/site/pedido/{id}/payments
 */

async function testarBuscarPagamento() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTE: Buscar Pagamento de Pedido');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar pedidos recentes
    console.log('📦 1. Buscando pedidos recentes...\n');
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30); // Últimos 30 dias
    const dataFim = new Date();
    
    const pedidos = await magazordService.buscarPedidos(dataInicio, dataFim);
    
    if (!pedidos || pedidos.length === 0) {
      console.log('❌ Nenhum pedido encontrado nos últimos 30 dias');
      return;
    }
    
    console.log(`✅ Encontrados ${pedidos.length} pedidos\n`);
    
    // 2. Pegar primeiro pedido com status 1 (Aguardando Pagamento) ou 2 (Cancelado)
    const pedidoTeste = pedidos.find(p => 
      p.pedidoSituacao === 1 || 
      p.pedidoSituacao === 2 || 
      p.pedidoSituacao === 14
    ) || pedidos[0];
    
    console.log('📋 Pedido selecionado para teste:');
    console.log(`   ID: ${pedidoTeste.id}`);
    console.log(`   Código: ${pedidoTeste.codigo}`);
    console.log(`   Status: ${pedidoTeste.pedidoSituacao}`);
    console.log(`   Forma Pagamento: ${pedidoTeste.formaPagamentoNome}`);
    console.log(`   Valor Total: R$ ${pedidoTeste.valorTotal}\n`);
    
    // 3. Buscar detalhes completos do pedido
    console.log(`🔍 2. Buscando detalhes completos do pedido ${pedidoTeste.codigo}...\n`);
    
    const pedidoCompleto = await magazordService.buscarPedidoPorId(pedidoTeste.codigo);
    
    console.log('📊 Pedido Completo:');
    console.log(JSON.stringify(pedidoCompleto, null, 2));
    console.log('\n');
    
    // 4. Tentar buscar informações de pagamento (endpoint /payments)
    console.log(`💳 3. Buscando informações de PAGAMENTO do pedido ${pedidoTeste.codigo}...\n`);
    
    try {
      // Criar método temporário para testar
      const axios = (await import('axios')).default;
      const config = (await import('../src/config/index.js')).default;
      
      const response = await axios.get(
        `${config.magazord.apiUrl}/v2/site/pedido/${pedidoTeste.codigo}/payments`,
        {
          auth: {
            username: config.magazord.user,
            password: config.magazord.password
          }
        }
      );
      
      console.log('✅ Endpoint /payments FUNCIONOU!\n');
      console.log('📊 Resposta da API:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('\n');
      
      // Analisar dados de pagamento
      const payments = response.data?.data?.items || [];
      
      if (payments.length === 0) {
        console.log('⚠️  Nenhuma informação de pagamento encontrada');
      } else {
        console.log(`✅ Encontrados ${payments.length} pagamento(s)\n`);
        
        payments.forEach((payment, index) => {
          console.log(`💰 Pagamento ${index + 1}:`);
          console.log(`   Forma: ${payment.formaRecebimento || 'N/A'}`);
          console.log(`   Gateway: ${payment.gateway || 'N/A'}`);
          console.log(`   Valor: R$ ${payment.valor || '0.00'}`);
          
          // Boleto
          if (payment.boleto) {
            console.log(`   📄 Boleto:`);
            console.log(`      URL: ${payment.boleto.url || 'Não informado'}`);
            console.log(`      Situação: ${payment.boleto.situacao || 'N/A'}`);
            console.log(`      Vencimento: ${payment.boleto.dataVencimento || 'N/A'}`);
          }
          
          // PIX
          if (payment.pix) {
            console.log(`   📱 PIX:`);
            console.log(`      QR Code: ${payment.pix.qrCode ? payment.pix.qrCode.substring(0, 50) + '...' : 'Não informado'}`);
            console.log(`      Situação: ${payment.pix.situacao || 'N/A'}`);
            console.log(`      Expiração: ${payment.pix.dataExpiracao || 'N/A'}`);
          }
          
          console.log('');
        });
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar endpoint /payments:');
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Mensagem: ${error.response?.data?.message || error.message}`);
      console.error(`   Dados: ${JSON.stringify(error.response?.data, null, 2)}`);
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
testarBuscarPagamento();
