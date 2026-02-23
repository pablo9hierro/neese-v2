/**
 * TESTE CRÍTICO - URL Checkout funciona para REFAZER pedido cancelado?
 * Analisa se carrinho com pedido cancelado permite nova compra
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
    console.error(`❌ Erro ao buscar itens: ${error.message}`);
    return null;
  }
}

async function testarUrlCheckout() {
  console.log('\n🧪 TESTE: URL Checkout permite REFAZER pedido cancelado?\n');
  console.log('='.repeat(80));
  
  // Carrinhos que encontramos com pedidos cancelados:
  // - Carrinho 10062 → Pedido 0012601731635 (status 2 - Cancelado)
  // - Carrinho 10165 → Pedido 0012601083920 (status 14 - Cancelado Pagamento)
  
  const carrinhosTeste = [
    { id: 10062, pedidoCodigo: '0012601731635', status: 2, statusNome: 'Cancelado' },
    { id: 10165, pedidoCodigo: '0012601083920', status: 14, statusNome: 'Cancelado Pagamento' }
  ];
  
  for (const carrinho of carrinhosTeste) {
    console.log(`\n📦 CARRINHO ${carrinho.id} → Pedido ${carrinho.pedidoCodigo}`);
    console.log(`   Status Pedido: ${carrinho.status} - ${carrinho.statusNome}`);
    console.log('─'.repeat(80));
    
    const itens = await buscarItensCarrinho(carrinho.id);
    
    if (!itens) {
      console.log('   ❌ Não foi possível buscar itens do carrinho\n');
      continue;
    }
    
    // Analisar estrutura completa
    console.log('\n📊 ESTRUTURA DO CARRINHO:');
    console.log(`   Status Carrinho: ${itens.carrinho?.status || 'N/A'}`);
    console.log(`   URL Checkout: ${itens.carrinho?.url_checkout || 'N/A'}`);
    console.log(`   Hash: ${itens.carrinho?.hash || 'N/A'}`);
    console.log(`   Data Início: ${itens.carrinho?.dataInicio || 'N/A'}`);
    console.log(`   Data Fim: ${itens.carrinho?.dataFim || 'N/A'}`);
    
    // Campos críticos que podem indicar se permite recompra
    console.log('\n🔍 CAMPOS CRÍTICOS:');
    console.log(`   pedido.id: ${itens.carrinho?.pedido?.id || 'N/A'}`);
    console.log(`   pedido.codigo: ${itens.carrinho?.pedido?.codigo || 'N/A'}`);
    console.log(`   ativo: ${itens.carrinho?.ativo !== undefined ? itens.carrinho.ativo : 'N/A'}`);
    console.log(`   bloqueado: ${itens.carrinho?.bloqueado !== undefined ? itens.carrinho.bloqueado : 'N/A'}`);
    console.log(`   finalizado: ${itens.carrinho?.finalizado !== undefined ? itens.carrinho.finalizado : 'N/A'}`);
    console.log(`   permite_checkout: ${itens.carrinho?.permite_checkout !== undefined ? itens.carrinho.permite_checkout : 'N/A'}`);
    
    // Mostrar TODOS os campos do carrinho para análise
    console.log('\n📋 TODOS OS CAMPOS DO CARRINHO:');
    console.log(JSON.stringify(itens.carrinho, null, 2));
    
    // Análise de itens
    console.log(`\n🛍️ ITENS DO CARRINHO: ${itens.items?.length || 0}`);
    if (itens.items && itens.items.length > 0) {
      itens.items.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.descricao} - Qtd: ${item.quantidade} - R$ ${item.valorUnitario}`);
      });
    }
    
    // URL final que seria enviada no evento
    const urlCheckout = itens.carrinho?.url_checkout;
    console.log(`\n🔗 URL QUE SERIA ENVIADA NO EVENTO:`);
    console.log(`   ${urlCheckout}`);
    
    // Conclusão baseada nos campos
    console.log('\n💡 ANÁLISE:');
    if (itens.carrinho?.status === 3) {
      console.log('   ⚠️  Status 3 = Comprado (carrinho foi convertido em pedido)');
    }
    
    if (itens.carrinho?.pedido?.id) {
      console.log('   ⚠️  Carrinho tem pedido associado (já virou compra)');
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n📝 CONCLUSÃO FINAL:');
  console.log('   Para saber se o URL funciona MESMO, seria necessário:');
  console.log('   1. Abrir a URL em um navegador');
  console.log('   2. Verificar se o sistema permite finalizar nova compra');
  console.log('   3. Ou se mostra mensagem "Pedido já finalizado"');
  console.log('\n   🔍 Verifique a URL manualmente no navegador!');
  console.log('='.repeat(80) + '\n');
}

testarUrlCheckout().catch(console.error);
