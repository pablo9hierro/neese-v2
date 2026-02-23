/**
 * TESTE FINAL - URL Checkout em Pedidos Cancelados
 * Busca carrinhos COM pedidos, verifica se pedidos são cancelados
 * e se url_checkout ainda funciona
 */

import axios from 'axios';
import { readFileSync } from 'fs';

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

async function buscarItensCarrinho(carrinhoId) {
  try {
    const response = await axios.get(
      `${magazordService.apiUrl}/v2/site/carrinho/${carrinhoId}/itens`,
      { auth: magazordService.auth }
    );
    return response.data?.data || response.data || null;
  } catch (error) {
    return null;
  }
}

async function testarCheckoutFinal() {
  console.log('\n🧪 TESTE FINAL: URL Checkout em Pedidos Cancelados\n');
  console.log('='.repeat(80));
  
  // Buscar carrinhos dos últimos 30 dias (máximo permitido pela API)
  const dataFim = '2026-02-23 23:59:59';
  const dataInicio = '2026-01-25 00:00:00'; // 29 dias atrás (seguro)
  
  console.log(`📅 Buscando carrinhos de ${dataInicio} até ${dataFim}`);
  
  const response = await axios.get(`${magazordService.apiUrl}/v2/site/carrinho`, {
    auth: magazordService.auth,
    params: {
      dataAtualizacaoInicio: dataInicio,
      dataAtualizacaoFim: dataFim,
      limit: 100
    }
  });
  
  const todosCarrinhos = response.data?.data?.items || [];
  console.log(`🛒 Total de carrinhos: ${todosCarrinhos.length}`);
  
  // Filtrar apenas carrinhos COM pedido
  const carrinhosComPedido = todosCarrinhos.filter(c => c.pedido && c.pedido.id);
  console.log(`✅ Carrinhos COM pedido: ${carrinhosComPedido.length}\n`);
  console.log('='.repeat(80));
  
  let contador = 0;
  let pedidosCancelados = 0;
  let pedidosCanceladosComCheckout = 0;
  
  for (const carrinho of carrinhosComPedido.slice(0, 20)) { // Testar 20
    contador++;
    
    console.log(`\n🛒 CARRINHO ${contador}/${Math.min(20, carrinhosComPedido.length)}`);
    console.log('─'.repeat(80));
    console.log(`   Carrinho ID: ${carrinho.id}`);
    console.log(`   Status Carrinho: ${carrinho.status}`);
    console.log(`   Hash: ${carrinho.hash || 'N/A'}`);
    console.log(`   Pedido ID: ${carrinho.pedido.id}`);
    console.log(`   Pedido Código: ${carrinho.pedido.codigo}`);
    
    // Buscar detalhes do pedido para pegar status
    try {
      const pedidoResponse = await axios.get(
        `${magazordService.apiUrl}/v2/site/pedido/${carrinho.pedido.codigo}`,
        { auth: magazordService.auth }
      );
      
      const pedido = pedidoResponse.data?.data || pedidoResponse.data;
      console.log(`   Pedido Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      
      // Verificar se pedido está cancelado (status 2 ou 14)
      if (pedido.pedidoSituacao === 2 || pedido.pedidoSituacao === 14) {
        pedidosCancelados++;
        console.log(`\n   🔥 PEDIDO CANCELADO ENCONTRADO!`);
        
        // Buscar itens do carrinho para pegar url_checkout
        const itensResponse = await buscarItensCarrinho(carrinho.id);
        
        if (itensResponse?.carrinho?.url_checkout) {
          pedidosCanceladosComCheckout++;
          console.log(`   ✅ ✅ ✅ URL DE CHECKOUT DISPONÍVEL!`);
          console.log(`   🔗 ${itensResponse.carrinho.url_checkout}`);
          console.log(`\n   💡 SOLUÇÃO FUNCIONOU! Cliente pode refazer pedido!`);
        } else {
          console.log(`   ❌ Carrinho não tem url_checkout`);
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️ Erro ao buscar pedido: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 RESUMO FINAL:`);
  console.log(`   Carrinhos analisados: ${contador}`);
  console.log(`   Pedidos cancelados encontrados: ${pedidosCancelados}`);
  console.log(`   Pedidos cancelados COM url_checkout: ${pedidosCanceladosComCheckout}\n`);
  
  if (pedidosCanceladosComCheckout > 0) {
    const percentual = ((pedidosCanceladosComCheckout / pedidosCancelados) * 100).toFixed(1);
    console.log(`✅ ✅ ✅ CONCLUSÃO: ${percentual}% dos pedidos cancelados TÊM url_checkout!`);
    console.log(`💡 IMPLEMENTAR: Buscar carrinho do pedido e usar url_checkout!`);
    console.log(`💡 Funciona para pedidos status 2 e 14!\n`);
  } else {
    console.log(`❌ Nenhum pedido cancelado com url_checkout encontrado\n`);
  }
}

testarCheckoutFinal();
