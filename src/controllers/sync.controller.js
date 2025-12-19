import magazordService from '../services/magazord.service.js';
import ghlService from '../services/ghl.service.js';
import transformerService from '../services/transformer.service.js';

/**
 * Controlador principal para sincronização automática (Cron Job)
 * Executa a cada 20 minutos via Vercel Cron
 */

// Cache para rastrear eventos já processados (evitar duplicatas)
const eventosProcessados = new Set();

/**
 * Limpa cache de eventos antigos (mais de 24 horas)
 */
function limparCache() {
  if (eventosProcessados.size > 1000) {
    eventosProcessados.clear();
    console.log('🧹 Cache de eventos limpo');
  }
}

/**
 * Verifica se evento já foi processado
 */
function jaToi(identificador) {
  return eventosProcessados.has(identificador);
}

/**
 * Marca evento como processado
 */
function marcarProcessado(identificador) {
  eventosProcessados.add(identificador);
}

/**
 * Processa carrinhos abertos
 */
async function processarCarrinhosAbertos() {
  try {
    console.log('\n🛒 Buscando carrinhos abertos...');
    const carrinhos = await magazordService.buscarCarrinhos(1); // Status 1 = Aberto
    
    if (!carrinhos || carrinhos.length === 0) {
      console.log('✓ Nenhum carrinho aberto novo');
      return [];
    }

    const eventos = [];
    for (const carrinho of carrinhos) {
      const identificador = `ABERTO-${carrinho.id}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      let cliente = null;
      if (carrinho.cliente_id) {
        try {
          cliente = await magazordService.buscarCliente(carrinho.cliente_id);
        } catch (error) {
          console.error(`Erro ao buscar cliente ${carrinho.cliente_id}`);
        }
      }

      const evento = transformerService.transformarCarrinhoAberto(carrinho, cliente);
      eventos.push(evento);
      marcarProcessado(identificador);
    }

    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar carrinhos abertos:', error.message);
    return [];
  }
}

/**
 * Processa carrinhos em checkout (aguardando pagamento)
 */
async function processarCarrinhosCheckout() {
  try {
    console.log('\n💳 Buscando carrinhos em checkout...');
    const carrinhos = await magazordService.buscarCarrinhos(2); // Status 2 = Checkout/Aguardando
    
    if (!carrinhos || carrinhos.length === 0) {
      console.log('✓ Nenhum carrinho em checkout novo');
      return [];
    }

    const eventos = [];
    for (const carrinho of carrinhos) {
      const identificador = `CHECKOUT-${carrinho.id}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      let cliente = null;
      if (carrinho.cliente_id) {
        try {
          cliente = await magazordService.buscarCliente(carrinho.cliente_id);
        } catch (error) {
          console.error(`Erro ao buscar cliente ${carrinho.cliente_id}`);
        }
      }

      const evento = transformerService.transformarCarrinhoCheckout(carrinho, cliente);
      eventos.push(evento);
      marcarProcessado(identificador);
    }

    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar carrinhos checkout:', error.message);
    return [];
  }
}

/**
 * Processa carrinhos abandonados
 */
async function processarCarrinhosAbandonados() {
  try {
    console.log('\n🚫 Buscando carrinhos abandonados...');
    const carrinhos = await magazordService.buscarCarrinhos(4); // Status 4 = Abandonado
    
    if (!carrinhos || carrinhos.length === 0) {
      console.log('✓ Nenhum carrinho abandonado novo');
      return [];
    }

    const eventos = [];
    for (const carrinho of carrinhos) {
      const identificador = `ABANDONADO-${carrinho.id}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      let cliente = null;
      if (carrinho.cliente_id) {
        try {
          cliente = await magazordService.buscarCliente(carrinho.cliente_id);
        } catch (error) {
          console.error(`Erro ao buscar cliente ${carrinho.cliente_id}`);
        }
      }

      const evento = transformerService.transformarCarrinhoAbandonado(carrinho, cliente);
      eventos.push(evento);
      marcarProcessado(identificador);
    }

    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar carrinhos abandonados:', error.message);
    return [];
  }
}

/**
 * Processa pedidos recém aprovados
 */
async function processarPedidosAprovados() {
  try {
    console.log('\n✅ Buscando pedidos aprovados...');
    const pedidos = await magazordService.buscarPedidos({ status: 4 }); // Status 4 = Aprovado
    
    if (!pedidos || pedidos.length === 0) {
      console.log('✓ Nenhum pedido aprovado novo');
      return [];
    }

    const eventos = [];
    for (const pedido of pedidos) {
      const identificador = `PEDIDO-${pedido.id}`;
      
      if (jaFoiProcessado(identificador)) {
        continue;
      }

      let cliente = null;
      let rastreamento = null;

      if (pedido.cliente_id) {
        try {
          cliente = await magazordService.buscarCliente(pedido.cliente_id);
        } catch (error) {
          console.error(`Erro ao buscar cliente ${pedido.cliente_id}`);
        }
      }

      try {
        rastreamento = await magazordService.buscarRastreamento(pedido.id);
      } catch (error) {
        console.error(`Erro ao buscar rastreamento do pedido ${pedido.id}`);
      }

      const evento = transformerService.transformarPedidoCriado(pedido, cliente, rastreamento);
      eventos.push(evento);
      marcarProcessado(identificador);
    }

    return eventos;
  } catch (error) {
    console.error('❌ Erro ao processar pedidos aprovados:', error.message);
    return [];
  }
}

/**
 * Função principal do Cron - executa todas as sincronizações
 */
export async function executarSincronizacao() {
  console.log('\n' + '='.repeat(60));
  console.log('⏰ INICIANDO SINCRONIZAÇÃO - ' + new Date().toISOString());
  console.log('='.repeat(60));

  const inicio = Date.now();
  let totalEventos = 0;

  try {
    // Limpa cache se necessário
    limparCache();

    // Processa todos os tipos de eventos em paralelo
    const [
      eventosAbertos,
      eventosCheckout,
      eventosAbandonados,
      eventosPedidos
    ] = await Promise.all([
      processarCarrinhosAbertos(),
      processarCarrinhosCheckout(),
      processarCarrinhosAbandonados(),
      processarPedidosAprovados()
    ]);

    // Junta todos os eventos
    const todosEventos = [
      ...eventosAbertos,
      ...eventosCheckout,
      ...eventosAbandonados,
      ...eventosPedidos
    ];

    totalEventos = todosEventos.length;

    if (totalEventos === 0) {
      console.log('\n✓ Nenhum evento novo para processar');
    } else {
      console.log(`\n📊 Total de eventos encontrados: ${totalEventos}`);
      console.log('📤 Enviando eventos para GHL...');

      // Envia todos os eventos para o GHL
      const resultados = await ghlService.enviarLote(todosEventos);

      const sucessos = resultados.filter(r => r.success).length;
      const falhas = resultados.filter(r => !r.success).length;

      console.log(`\n✅ Enviados com sucesso: ${sucessos}`);
      if (falhas > 0) {
        console.log(`❌ Falhas: ${falhas}`);
      }
    }

    const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`✓ SINCRONIZAÇÃO CONCLUÍDA - Duração: ${duracao}s`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      totalEventos,
      duracao
    };

  } catch (error) {
    console.error('\n❌ ERRO NA SINCRONIZAÇÃO:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  executarSincronizacao
};
