/**
 * Script de Teste - URL Checkout para Pedidos Cancelados
 * Verifica se pedidos cancelados (status 2/14) têm carrinho com url_checkout
 * que pode ser usado para cliente refazer o pedido
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

async function buscarCarrinhosPedido(dataInicio, dataFim) {
  try {
    const offsetBrasilia = -3 * 60;
    const dataInicioBrasilia = new Date(dataInicio.getTime() + (offsetBrasilia * 60 * 1000));
    const dataFimBrasilia = new Date(dataFim.getTime() + (offsetBrasilia * 60 * 1000));
    
    const dataInicioStr = dataInicioBrasilia.toISOString().split('.')[0].replace('T', ' ');
    const dataFimStr = dataFimBrasilia.toISOString().split('.')[0].replace('T', ' ');
    
    console.log(`   Período: ${dataInicioStr} → ${dataFimStr}\n`);
    
    const response = await axios.get(`${magazordService.apiUrl}/v2/site/carrinho`, {
      auth: magazordService.auth,
      params: {
        dataAtualizacaoInicio: dataInicioStr,
        dataAtualizacaoFim: dataFimStr,
        limit: 100
      }
    });
    
    return response.data?.data?.items || [];
  } catch (error) {
    console.log(`   ⚠️ Erro ao buscar carrinhos: ${error.message}`);
    return [];
  }
}

async function buscarItensCarrinho(carrinhoId) {
  try {
    const response = await axios.get(
      `${magazordService.apiUrl}/v2/site/carrinho/${carrinhoId}/itens`,
      { auth: magazordService.auth }
    );
    
    return response.data?.data || response.data || null;
  } catch (error) {
    console.log(`      ⚠️ Erro ao buscar itens: ${error.message}`);
    return null;
  }
}

async function testarCheckoutPedidosCancelados() {
  try {
    console.log('\n🧪 TESTE: URL Checkout para Pedidos Cancelados\n');
    console.log('='.repeat(80));
    console.log('📋 Estratégia: Verificar se carrinhos que viraram pedidos cancelados');
    console.log('📋 ainda têm url_checkout válido para cliente refazer pedido\n');
    console.log('='.repeat(80));
    
    // Buscar pedidos cancelados (status 2 e 14)
    const dataFim = new Date();
    const dataInicio = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 dias
    
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
    
    // Filtrar status 2 e 14 (cancelados)
    const pedidosCancelados = todosPedidos.filter(p => 
      p.pedidoSituacao === 2 || p.pedidoSituacao === 14
    );
    
    console.log(`📦 Total de pedidos cancelados (status 2/14): ${pedidosCancelados.length}\n`);
    console.log('='.repeat(80));
    
    // Agora buscar carrinhos para cruzar com pedidos
    console.log(`\n🔍 Buscando carrinhos do período para cruzar com pedidos...\n`);
    const carrinhos = await buscarCarrinhosPedido(dataInicio, dataFim);
    console.log(`🛒 Encontrados ${carrinhos.length} carrinhos`);
    
    // Filtrar apenas carrinhos que têm pedido associado
    const carrinhosComPedido = carrinhos.filter(c => c.pedido && c.pedido.id);
    console.log(`✅ Carrinhos com pedido associado: ${carrinhosComPedido.length}\n`);
    console.log('='.repeat(80));
    
    let contador = 0;
    let comCheckout = 0;
    let semCheckout = 0;
    
    // Testar apenas os 10 primeiros pedidos cancelados
    const pedidosTeste = pedidosCancelados.slice(0, 10);
    
    for (const pedido of pedidosTeste) {
      contador++;
      console.log(`\n📦 PEDIDO ${contador}/${pedidosTeste.length}`);
      console.log('─'.repeat(80));
      console.log(`   Código: ${pedido.codigo}`);
      console.log(`   Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`   Cliente: ${pedido.pessoaNome}`);
      console.log(`   Forma Pagamento: ${pedido.formaPagamentoNome}`);
      console.log(`   Valor: R$ ${pedido.valorTotal}`);
      console.log(`   Data: ${pedido.dataHora}`);
      
      // Tentar encontrar carrinho relacionado pelo pedido.id
      const carrinhoRelacionado = carrinhosComPedido.find(c => c.pedido?.id === pedido.id);
      
      if (carrinhoRelacionado) {
        console.log(`\n   ✅ Carrinho encontrado: ID ${carrinhoRelacionado.id}`);
        console.log(`      Status Carrinho: ${carrinhoRelacionado.status} (3 = Comprado)`);
        console.log(`      Hash: ${carrinhoRelacionado.hash || 'N/A'}`);
        
        // Buscar itens do carrinho para pegar url_checkout
        console.log(`\n   🔍 Buscando detalhes do carrinho...`);
        const itensResponse = await buscarItensCarrinho(carrinhoRelacionado.id);
        
        if (itensResponse?.carrinho) {
          const carrinho = itensResponse.carrinho;
          
          console.log(`\n   📋 DADOS DO CARRINHO:`);
          console.log(`      Hash: ${carrinho.hash || 'N/A'}`);
          console.log(`      URL Checkout: ${carrinho.url_checkout || 'N/A'}`);
          console.log(`      URL Acesso: ${carrinho.url_acesso || 'N/A'}`);
          
          if (carrinho.url_checkout) {
            comCheckout++;
            console.log(`\n   ✅ ✅ ✅ URL DE CHECKOUT DISPONÍVEL!`);
            console.log(`   🔗 ${carrinho.url_checkout}`);
            console.log(`\n   💡 SOLUÇÃO: Podemos enviar este link para o cliente refazer o pedido!`);
            console.log(`   💡 Mesmo com pedido cancelado, o carrinho ainda está acessível.`);
          } else {
            semCheckout++;
            console.log(`\n   ❌ Carrinho sem url_checkout`);
          }
          
          // Mostrar itens
          if (carrinho.itens && carrinho.itens.length > 0) {
            console.log(`\n   📦 ITENS DO CARRINHO (${carrinho.itens.length}):`);
            carrinho.itens.forEach((item, idx) => {
              console.log(`      ${idx + 1}. Produto: ${item.codigo_produto || 'N/A'} - Qtd: ${item.quantidade}`);
            });
          }
        } else {
          semCheckout++;
          console.log(`   ⚠️ Não foi possível buscar detalhes do carrinho`);
        }
      } else {
        semCheckout++;
        console.log(`\n   ❌ Nenhum carrinho encontrado relacionado a este pedido`);
        console.log(`   💡 Pedido pode ter sido criado sem carrinho (TEF, manual, etc)`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total analisado: ${contador} pedidos cancelados`);
    console.log(`   ✅ Com URL de checkout: ${comCheckout}`);
    console.log(`   ❌ Sem URL de checkout: ${semCheckout}\n`);
    
    if (comCheckout > 0) {
      const percentual = ((comCheckout / contador) * 100).toFixed(1);
      console.log(`✅ CONCLUSÃO: ${percentual}% dos pedidos cancelados TÊM url_checkout!`);
      console.log(`💡 PODEMOS usar url_checkout para pedidos status 2/14!`);
      console.log(`💡 Cliente consegue refazer o pedido com os mesmos produtos.\n`);
    } else {
      console.log(`❌ CONCLUSÃO: Nenhum pedido cancelado tem url_checkout`);
      console.log(`💡 Estratégia não funcionará para estes pedidos\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testarCheckoutPedidosCancelados();
