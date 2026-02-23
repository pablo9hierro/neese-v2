import magazordService from '../src/services/magazord.service.js';
import transformerService from '../src/services/transformer.service.js';

/**
 * Script de teste: Verificar se carrinhos têm hash para gerar link de checkout
 * Valida função gerarLinkCheckout()
 */

async function testarCarrinhoHash() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTE: Hash de Carrinho e Link de Checkout');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Buscar carrinhos recentes
    console.log('🛒 1. Buscando carrinhos dos últimos 7 dias...\n');
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 7);
    const dataFim = new Date();
    
    const carrinhos = await magazordService.buscarCarrinhos(dataInicio, dataFim);
    
    if (!carrinhos || carrinhos.length === 0) {
      console.log('❌ Nenhum carrinho encontrado');
      return;
    }
    
    console.log(`✅ Encontrados ${carrinhos.length} carrinhos\n`);
    
    // 2. Analisar cada carrinho
    console.log('📊 2. Analisando carrinhos...\n');
    
    let carrinhosComHash = 0;
    let carrinhosSemHash = 0;
    
    carrinhos.slice(0, 10).forEach((carrinho, index) => {
      console.log(`🛒 Carrinho ${index + 1}:`);
      console.log(`   ID: ${carrinho.id}`);
      console.log(`   Status: ${carrinho.status}`);
      console.log(`   Hash: ${carrinho.hash || 'NÃO TEM ❌'}`);
      
      if (carrinho.hash) {
        carrinhosComHash++;
        const link = transformerService.gerarLinkCheckout(carrinho);
        console.log(`   ✅ Link gerado: ${link}`);
      } else {
        carrinhosSemHash++;
        console.log(`   ❌ Sem hash - não pode gerar link`);
      }
      
      console.log('');
    });
    
    // 3. Estatísticas
    console.log('📊 Estatísticas:');
    console.log(`   Total analisado: ${Math.min(10, carrinhos.length)}`);
    console.log(`   Com hash: ${carrinhosComHash} ✅`);
    console.log(`   Sem hash: ${carrinhosSemHash} ❌`);
    console.log('');
    
    // 4. Testar buscar carrinho específico por ID (pode ter mais detalhes)
    if (carrinhos.length > 0) {
      const carrinhoTeste = carrinhos[0];
      console.log(`🔍 3. Buscando detalhes completos do carrinho ${carrinhoTeste.id}...\n`);
      
      try {
        // Buscar itens do carrinho
        const itens = await magazordService.buscarItensCarrinho(carrinhoTeste.id);
        
        console.log('📦 Itens do carrinho:');
        console.log(JSON.stringify(itens, null, 2));
        console.log('');
        
        // Verificar se tem pedido vinculado
        if (carrinhoTeste.pedido) {
          console.log('🔗 Carrinho tem pedido vinculado:');
          console.log(`   Pedido ID: ${carrinhoTeste.pedido.id || 'N/A'}`);
          console.log('');
        }
        
      } catch (error) {
        console.error('❌ Erro ao buscar detalhes do carrinho:', error.message);
      }
    }
    
    // 5. Teste da função gerarLinkCheckout
    console.log('🧪 4. Teste da função gerarLinkCheckout():\n');
    
    const carrinhoMock1 = { id: 123, hash: 'abc123xyz', status: 2 };
    const carrinhoMock2 = { id: 456, status: 2 }; // Sem hash
    
    console.log('Teste 1 - Carrinho COM hash:');
    console.log(`Input: ${JSON.stringify(carrinhoMock1)}`);
    console.log(`Output: ${transformerService.gerarLinkCheckout(carrinhoMock1)}`);
    console.log('');
    
    console.log('Teste 2 - Carrinho SEM hash:');
    console.log(`Input: ${JSON.stringify(carrinhoMock2)}`);
    console.log(`Output: ${transformerService.gerarLinkCheckout(carrinhoMock2)}`);
    console.log('');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE CONCLUÍDO');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error(error);
  }
}

// Executar teste
testarCarrinhoHash();
