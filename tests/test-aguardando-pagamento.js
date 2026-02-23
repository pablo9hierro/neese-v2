/**
 * Script de Teste - Pedidos Aguardando Pagamento
 * Busca APENAS pedidos com status 1 (Aguardando Pagamento)
 * que ainda têm links de pagamento ativos
 */

import axios from 'axios';
import { readFileSync } from 'fs';

// Lê .env manualmente
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const magazordService = {
  apiUrl: envVars.MAGAZORD_API_URL,
  auth: {
    username: envVars.MAGAZORD_USER,
    password: envVars.MAGAZORD_PASSWORD
  }
};

async function buscarPagamento(pedidoCodigo) {
  try {
    const response = await axios.get(
      `${magazordService.apiUrl}/v2/site/pedido/${pedidoCodigo}/payments`,
      { auth: magazordService.auth }
    );
    
    const payments = response.data?.data || [];
    return payments[0] || null;
  } catch (error) {
    console.log(`      ⚠️ Erro ao buscar pagamento: ${error.message}`);
    return null;
  }
}

function extrairLinkPagamento(payment) {
  if (!payment) return null;
  
  // PIX: qrCode (copia e cola)
  if (payment.pix?.qrCode) {
    return payment.pix.qrCode;
  }
  
  // Boleto: URL
  if (payment.boleto?.url) {
    return payment.boleto.url;
  }
  
  return null;
}

async function testarPedidosAguardandoPagamento() {
  try {
    console.log('\n🧪 TESTE: Pedidos Aguardando Pagamento (Status 1)\n');
    console.log('='.repeat(80));
    console.log('📋 Objetivo: Verificar se links de pagamento estão sendo preenchidos');
    console.log('📋 Status buscado: 1 - Aguardando Pagamento\n');
    console.log('='.repeat(80));
    
    // Buscar últimos 200 pedidos
    const dataFim = new Date();
    const dataInicio = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 dias atrás
    
    const offsetBrasilia = -3 * 60;
    const dataInicioBrasilia = new Date(dataInicio.getTime() + (offsetBrasilia * 60 * 1000));
    const dataFimBrasilia = new Date(dataFim.getTime() + (offsetBrasilia * 60 * 1000));
    
    const dataInicioStr = dataInicioBrasilia.toISOString().split('.')[0] + '-03:00';
    const dataFimStr = dataFimBrasilia.toISOString().split('.')[0] + '-03:00';
    
    console.log(`\n📅 Buscando pedidos de ${dataInicioStr} até ${dataFimStr}\n`);
    
    const response = await axios.get(`${magazordService.apiUrl}/v2/site/pedido`, {
      auth: magazordService.auth,
      params: {
        'dataHora[gte]': dataInicioStr,
        'dataHora[lte]': dataFimStr,
        limit: 200
      }
    });
    
    const todosPedidos = response.data?.data?.items || [];
    console.log(`📦 Total de pedidos encontrados: ${todosPedidos.length}\n`);
    
    // Filtrar APENAS status 1
    const pedidosAguardando = todosPedidos.filter(p => p.pedidoSituacao === 1);
    
    console.log(`✅ Pedidos com status 1 (Aguardando Pagamento): ${pedidosAguardando.length}\n`);
    console.log('='.repeat(80));
    
    if (pedidosAguardando.length === 0) {
      console.log('\n⚠️  Nenhum pedido aguardando pagamento encontrado!');
      console.log('💡 Dica: Crie um pedido de teste na loja para validar os links\n');
      return;
    }
    
    let contador = 0;
    let comLink = 0;
    let semLink = 0;
    
    for (const pedido of pedidosAguardando) {
      contador++;
      console.log(`\n📦 PEDIDO ${contador}/${pedidosAguardando.length}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${pedido.id}`);
      console.log(`   Código: ${pedido.codigo}`);
      console.log(`   Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`   Data: ${pedido.dataHora}`);
      console.log(`   Cliente: ${pedido.pessoaNome}`);
      console.log(`   Telefone: ${pedido.pessoaContato}`);
      console.log(`   Valor: R$ ${pedido.valorTotal}`);
      console.log(`   Forma Pagamento: ${pedido.formaPagamentoNome}`);
      
      // Buscar pagamento
      console.log(`\n   💳 Buscando dados de pagamento...`);
      const payment = await buscarPagamento(pedido.codigo);
      
      if (payment) {
        console.log(`   ✅ Pagamento encontrado!`);
        
        // Mostrar estrutura completa
        console.log(`\n   📋 ESTRUTURA COMPLETA DO PAYMENT:`);
        console.log(`   ` + JSON.stringify(payment, null, 6).split('\n').join('\n   '));
        
        const linkPagamento = extrairLinkPagamento(payment);
        
        if (linkPagamento) {
          comLink++;
          console.log(`\n   ✅ ✅ ✅ LINK DE PAGAMENTO ENCONTRADO:`);
          console.log(`   🔗 ${linkPagamento.substring(0, 100)}${linkPagamento.length > 100 ? '...' : ''}`);
          
          // Identificar tipo
          if (payment.pix?.qrCode) {
            console.log(`   📌 Tipo: PIX (Copia e Cola)`);
            console.log(`   📝 Tamanho: ${linkPagamento.length} caracteres`);
          } else if (payment.boleto?.url) {
            console.log(`   📌 Tipo: BOLETO (URL)`);
          }
        } else {
          semLink++;
          console.log(`\n   ❌ Link de pagamento NÃO encontrado no payment`);
        }
      } else {
        semLink++;
        console.log(`   ❌ Pagamento NÃO encontrado via API`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total analisado: ${contador} pedidos`);
    console.log(`   ✅ Com link de pagamento: ${comLink}`);
    console.log(`   ❌ Sem link de pagamento: ${semLink}\n`);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testarPedidosAguardandoPagamento();
