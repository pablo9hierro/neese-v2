/**
 * Script de Teste - Link de Pagamento em Pedidos
 * Verifica se pedidos têm campo linkPagamento preenchido
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
    console.log(`      ⚠️ Erro: ${error.message}`);
    return null;
  }
}

async function testarLinkPagamentoPedidos() {
  try {
    console.log('\n🧪 TESTE: Campo linkPagamento em Pedidos\n');
    console.log('='.repeat(80));
    
    // Buscar últimos 100 pedidos
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
    
    // Filtrar status 1 (Aguardando), 2 e 14 (Cancelados)
    const pedidosRelevantes = todosPedidos.filter(p => 
      p.pedidoSituacao === 1 || p.pedidoSituacao === 2 || p.pedidoSituacao === 14
    );
    
    console.log(`📦 Total de pedidos: ${todosPedidos.length}`);
    console.log(`✅ Pedidos relevantes (status 1, 2, 14): ${pedidosRelevantes.length}\n`);
    console.log('='.repeat(80));
    
    let contador = 0;
    let comLink = 0;
    let semLink = 0;
    
    // Testar apenas os 10 primeiros
    const pedidosTeste = pedidosRelevantes.slice(0, 10);
    
    for (const pedido of pedidosTeste) {
      contador++;
      console.log(`\n📦 PEDIDO ${contador}/${pedidosTeste.length}`);
      console.log('─'.repeat(80));
      console.log(`   Código: ${pedido.codigo}`);
      console.log(`   Status: ${pedido.pedidoSituacao} - ${pedido.pedidoSituacaoDescricao}`);
      console.log(`   Cliente: ${pedido.pessoaNome}`);
      console.log(`   Forma Pagamento: ${pedido.formaPagamentoNome}`);
      console.log(`   Valor: R$ ${pedido.valorTotal}`);
      
      // Buscar  detalhes
      const detalhes = await buscarPedidoDetalhado(pedido.codigo);
      
      if (detalhes) {
        if (detalhes.linkPagamento) {
          comLink++;
          console.log(`\n   ✅ ✅ ✅ LINK DE PAGAMENTO ENCONTRADO!`);
          console.log(`   🔗 ${detalhes.linkPagamento}`);
        } else {
          semLink++;
          console.log(`\n   ❌ linkPagamento está vazio`);
        }
        
        // Verificar PIX
        if (detalhes.pedidoPagamentoPix && Object.keys(detalhes.pedidoPagamentoPix).length > 0) {
          console.log(`\n   📋 PIX:`);
          if (detalhes.pedidoPagamentoPix.qrCode) {
            console.log(`      QR Code (Copia e Cola): ${detalhes.pedidoPagamentoPix.qrCode.substring(0, 60)}...`);
          }
          if (detalhes.pedidoPagamentoPix.qrCodeUrl) {
            console.log(`      QR Code URL: ${detalhes.pedidoPagamentoPix.qrCodeUrl}`);
          }
        }
        
        // Verificar Boleto
        if (detalhes.boletos && detalhes.boletos.length > 0) {
          console.log(`\n   📋 BOLETO:`);
          detalhes.boletos.forEach((boleto, idx) => {
            if (boleto.url) {
              console.log(`      ${idx + 1}. URL: ${boleto.url}`);
            }
            if (boleto.linha_digitavel) {
              console.log(`      ${idx + 1}. Linha Digitável: ${boleto.linha_digitavel}`);
            }
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total analisado: ${contador} pedidos`);
    console.log(`   ✅ Com linkPagamento: ${comLink}`);
    console.log(`   ❌ Sem linkPagamento: ${semLink}\n`);
    
    if (comLink > 0) {
      console.log(`✅ CONCLUSÃO: Pedidos TÊM campo linkPagamento!`);
      console.log(`💡 Podemos usar este campo para enviar ao GHL\n`);
    } else {
      console.log(`❌ CONCLUSÃO: Pedidos NÃO têm linkPagamento preenchido`);
      console.log(`💡 Será necessário buscar via /payments endpoint\n`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
  }
}

testarLinkPagamentoPedidos();
