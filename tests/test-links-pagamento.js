/**
 * Script de Teste - Links de Pagamento
 * Busca pedidos com status 1, 2, 14 e mostra links de pagamento
 * NÃO envia para GHL - apenas mostra no console
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

async function testarLinksPagamento() {
  try {
    console.log('\n🧪 TESTE: Links de Pagamento em Pedidos\n');
    console.log('='.repeat(80));
    console.log('📋 Buscando pedidos com status:');
    console.log('   - Status 1: Aguardando Pagamento');
    console.log('   - Status 2: Cancelado (PIX expirado)');
    console.log('   - Status 14: Cancelado (Boleto vencido)\n');
    console.log('='.repeat(80));
    
    // Buscar últimos 100 pedidos (sem filtro de data)
    const dataFim = new Date();
    const dataInicio = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 dias atrás
    
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
        limit: 100
      }
    });
    
    const todosPedidos = response.data?.data?.items || [];
    console.log(`📦 Total de pedidos encontrados: ${todosPedidos.length}\n`);
    
    // Filtrar apenas status 1, 2, 14
    const pedidosRelevantes = todosPedidos.filter(p => 
      p.pedidoSituacao === 1 || p.pedidoSituacao === 2 || p.pedidoSituacao === 14
    );
    
    console.log(`✅ Pedidos com status 1, 2 ou 14: ${pedidosRelevantes.length}\n`);
    console.log('='.repeat(80));
    
    let contador = 0;
    
    for (const pedido of pedidosRelevantes) {
      contador++;
      console.log(`\n📦 PEDIDO ${contador}/${pedidosRelevantes.length}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${pedido.id}`);
      console.log(`   Código: ${pedido.codigo}`);
      console.log(`   Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`   Data: ${pedido.dataHora}`);
      console.log(`   Cliente: ${pedido.pessoaNome}`);
      console.log(`   Email: ${pedido.pessoaEmail || 'N/A'}`);
      console.log(`   Telefone: ${pedido.pessoaContato}`);
      console.log(`   Valor: R$ ${pedido.valorTotal}`);
      console.log(`   Forma Pagamento: ${pedido.formaPagamentoNome}`);
      
      // Buscar pagamento
      console.log(`\n   💳 Buscando dados de pagamento...`);
      const payment = await buscarPagamento(pedido.codigo);
      
      if (payment) {
        console.log(`   ✅ Pagamento encontrado!`);
        console.log(`   📋 Estrutura do payment:`);
        console.log(JSON.stringify(payment, null, 6));
        
        const linkPagamento = extrairLinkPagamento(payment);
        
        if (linkPagamento) {
          console.log(`\n   ✅ LINK DE PAGAMENTO ENCONTRADO:`);
          console.log(`   🔗 ${linkPagamento}`);
          
          // Identificar tipo
          if (payment.pix?.qrCode) {
            console.log(`   📌 Tipo: PIX (Copia e Cola)`);
          } else if (payment.boleto?.url) {
            console.log(`   📌 Tipo: BOLETO (URL)`);
          }
        } else {
          console.log(`\n   ❌ Link de pagamento NÃO encontrado`);
        }
      } else {
        console.log(`   ❌ Pagamento NÃO encontrado`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Teste concluído!`);
    console.log(`📊 Total analisado: ${contador} pedidos\n`);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testarLinksPagamento();
