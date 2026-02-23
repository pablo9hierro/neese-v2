/**
 * TESTE - Extração de links de produtos de pedidos expirados
 * Verifica se conseguimos recuperar links dos produtos para pedidos 2/14
 */

import magazordService from '../src/services/magazord.service.js';
import transformerService from '../src/services/transformer.service.js';

async function testarLinksProdutos() {
  console.log('\n🧪 TESTE: Links de Produtos em Pedidos Expirados\n');
  console.log('='.repeat(80));
  
  // Pedidos com status 2/14 que testamos antes
  const pedidosTeste = [
    { codigo: '0012601731635', status: 2, statusNome: 'Cancelado' },
    { codigo: '0012601083920', status: 14, statusNome: 'Cancelado Pagamento' }
  ];
  
  for (const pedidoInfo of pedidosTeste) {
    console.log(`\n📦 PEDIDO ${pedidoInfo.codigo}`);
    console.log(`   Status: ${pedidoInfo.status} - ${pedidoInfo.statusNome}`);
    console.log('─'.repeat(80));
    
    // 1. Buscar pedido completo
    console.log('   🔍 Buscando pedido completo...');
    const pedidoCompleto = await magazordService.buscarPedidoCompleto(pedidoInfo.codigo);
    
    if (!pedidoCompleto) {
      console.log('   ❌ Pedido não encontrado!\n');
      continue;
    }
    
    console.log(`   ✅ Pedido encontrado!`);
    console.log(`   Cliente: ${pedidoCompleto.pessoaNome}`);
    console.log(`   Valor: R$ ${pedidoCompleto.valorTotal}`);
    
    // 2. Verificar rastreios
    const rastreios = pedidoCompleto.arrayPedidoRastreio || [];
    console.log(`\n   📍 Rastreios: ${rastreios.length}`);
    
    if (rastreios.length === 0) {
      console.log('   ⚠️  Sem rastreios\n');
      continue;
    }
    
    // 3. Verificar itens
    const primeiroRastreio = rastreios[0];
    const itens = primeiroRastreio.pedidoItem || [];
    console.log(`   🛍️  Itens no rastreio: ${itens.length}`);
    
    if (itens.length === 0) {
      console.log('   ⚠️  Sem itens no rastreio\n');
      continue;
    }
    
    // 4. Mostrar links dos produtos
    console.log('\n   📋 PRODUTOS:');
    itens.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.descricao || item.produtoNome}`);
      console.log(`      - Quantidade: ${item.quantidade}`);
      console.log(`      - Valor unitário: R$ ${item.valorUnitario}`);
      console.log(`      - Link: ${item.linkProduto || 'N/A'}`);
      console.log('');
    });
    
    // 5. Testar função do transformer
    const linkExtraido = transformerService.extrairLinksProdutosPedido(pedidoCompleto);
    
    console.log('   🔗 LINK EXTRAÍDO PELO TRANSFORMER:');
    console.log(`   ${linkExtraido || '❌ Nenhum link disponível'}`);
    
    if (linkExtraido) {
      console.log('\n   ✅ ✅ ✅ SUCESSO! Link do produto extraído!');
      console.log('   💡 Cliente pode clicar e adicionar produto ao carrinho novamente!');
    } else {
      console.log('\n   ❌ Falha ao extrair link do produto');
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ Teste concluído!\n');
}

testarLinksProdutos().catch(console.error);
