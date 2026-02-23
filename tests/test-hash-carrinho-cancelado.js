/**
 * Script de Teste - Hash de Carrinho em Pedidos Cancelados
 * Verifica se pedidos cancelados (status 2/14) têm carrinho associado
 * e se podemos gerar link de checkout válido
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

async function buscarPedidoDetalhado(pedidoCodigo) {
  try {
    const response = await axios.get(
      `${magazordService.apiUrl}/v2/site/pedido/${pedidoCodigo}`,
      { auth: magazordService.auth }
    );
    
    return response.data?.data || response.data || null;
  } catch (error) {
    console.log(`      ⚠️ Erro ao buscar pedido: ${error.message}`);
    return null;
  }
}

async function buscarCarrinhoPorHash(hash) {
  try {
    const response = await axios.get(
      `${magazordService.apiUrl}/v2/site/carrinho`,
      { 
        auth: magazordService.auth,
        params: {
          hash: hash,
          limit: 1
        }
      }
    );
    
    const carrinhos = response.data?.data?.items || [];
    return carrinhos[0] || null;
  } catch (error) {
    console.log(`      ⚠️ Erro ao buscar carrinho: ${error.message}`);
    return null;
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

async function testarHashCarrinhoPedidosCancelados() {
  try {
    console.log('\n🧪 TESTE: Hash de Carrinho em Pedidos Cancelados\n');
    console.log('='.repeat(80));
    console.log('📋 Objetivo: Verificar se pedidos cancelados têm carrinho com hash');
    console.log('📋 Objetivo: Testar se link de checkout ainda funciona\n');
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
    
    let contador = 0;
    let comCarrinho = 0;
    let comHash = 0;
    let semCarrinho = 0;
    
    // Testar apenas os 10 primeiros
    const pedidosTeste = pedidosCancelados.slice(0, 10);
    
    for (const pedido of pedidosTeste) {
      contador++;
      console.log(`\n📦 PEDIDO ${contador}/${pedidosTeste.length}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${pedido.id}`);
      console.log(`   Código: ${pedido.codigo}`);
      console.log(`   Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`   Data: ${pedido.dataHora}`);
      console.log(`   Cliente: ${pedido.pessoaNome}`);
      console.log(`   Valor: R$ ${pedido.valorTotal}`);
      console.log(`   Forma Pagamento: ${pedido.formaPagamentoNome}`);
      
      // Buscar detalhes completos do pedido
      console.log(`\n   🔍 Buscando detalhes completos do pedido...`);
      const pedidoDetalhado = await buscarPedidoDetalhado(pedido.codigo);
      
      if (pedidoDetalhado) {
        console.log(`   ✅ Pedido detalhado encontrado`);
        
        // Verificar se tem carrinho associado
        if (pedidoDetalhado.carrinho || pedidoDetalhado.carrinhoId || pedidoDetalhado.carrinho_id) {
          const carrinhoId = pedidoDetalhado.carrinho?.id || pedidoDetalhado.carrinhoId || pedidoDetalhado.carrinho_id;
          comCarrinho++;
          
          console.log(`   ✅ Pedido TEM carrinho associado: ID ${carrinhoId}`);
          
          // Buscar itens do carrinho (que inclui hash e url_checkout)
          console.log(`   🔍 Buscando itens do carrinho...`);
          const itensResponse = await buscarItensCarrinho(carrinhoId);
          
          if (itensResponse?.carrinho) {
            const carrinho = itensResponse.carrinho;
            
            console.log(`\n   📋 DADOS DO CARRINHO:`);
            console.log(`      ID: ${carrinho.id}`);
            console.log(`      Status: ${carrinho.status}`);
            console.log(`      Hash: ${carrinho.hash || 'N/A'}`);
            console.log(`      URL Checkout: ${carrinho.url_checkout || 'N/A'}`);
            
            if (carrinho.hash) {
              comHash++;
              console.log(`\n   ✅ ✅ ✅ CARRINHO TEM HASH!`);
              
              if (carrinho.url_checkout) {
                console.log(`   ✅ ✅ ✅ URL DE CHECKOUT DISPONÍVEL:`);
                console.log(`   🔗 ${carrinho.url_checkout}`);
                console.log(`\n   💡 Este link pode ser usado para o cliente refazer o pedido!`);
              }
            } else {
              console.log(`   ❌ Carrinho sem hash`);
            }
            
            // Mostrar itens
            if (carrinho.itens && carrinho.itens.length > 0) {
              console.log(`\n   📦 ITENS DO CARRINHO (${carrinho.itens.length}):`);
              carrinho.itens.forEach((item, idx) => {
                console.log(`      ${idx + 1}. Produto: ${item.codigo_produto || 'N/A'} - Qtd: ${item.quantidade}`);
              });
            }
          }
        } else {
          semCarrinho++;
          console.log(`   ❌ Pedido NÃO tem carrinho associado`);
          
          // Mostrar estrutura do pedido para debug
          console.log(`\n   📋 ESTRUTURA DO PEDIDO (keys):`);
          console.log(`      ${Object.keys(pedidoDetalhado).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Não foi possível buscar detalhes do pedido`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total analisado: ${contador} pedidos`);
    console.log(`   ✅ Com carrinho associado: ${comCarrinho}`);
    console.log(`   ✅ Com hash de checkout: ${comHash}`);
    console.log(`   ❌ Sem carrinho associado: ${semCarrinho}\n`);
    
    if (comHash > 0) {
      console.log(`✅ CONCLUSÃO: Pedidos cancelados TÊM hash de carrinho!`);
      console.log(`💡 Podemos usar url_checkout para clientes refazerem pedidos\n`);
    } else {
      console.log(`❌ CONCLUSÃO: Pedidos cancelados NÃO têm hash de carrinho`);
      console.log(`💡 Será necessário criar novo carrinho via API\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testarHashCarrinhoPedidosCancelados();
