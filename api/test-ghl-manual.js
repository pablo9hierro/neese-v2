/**
 * ENDPOINT DE TESTE MANUAL - Envia dados mockados ao GHL
 * Use para testar se os workflows do GHL estão funcionando
 * 
 * URL: /api/test-ghl-manual
 * Método: GET
 */

import ghlService from '../src/services/ghl.service.js';

export default async function handler(req, res) {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTE MANUAL - Enviando dados mockados ao GHL');
  console.log('='.repeat(80));

  try {
    // CENÁRIO 1: Carrinho Aberto
    const carrinhoAberto = {
      tipo_evento: 'carrinho_aberto',
      carrinho_id: 999001,
      status: {
        codigo: 1,
        descricao: 'Carrinho Aberto',
        data_atualizacao: new Date().toISOString()
      },
      pessoa: {
        nome: 'Pablo Teste',
        email: 'mulekinrx1v9@gmail.com',
        telefone: '(83) 98751-6699'
      },
      carrinho: {
        carrinho_id: 999001,
        status: 'aberto',
        status_codigo: 1,
        valor_total: '150.00',
        itens: [
          {
            produto_id: 1,
            descricao: 'Produto Teste 1',
            quantidade: 2,
            valor_unitario: '50.00',
            valor_total: '100.00'
          },
          {
            produto_id: 2,
            descricao: 'Produto Teste 2',
            quantidade: 1,
            valor_unitario: '50.00',
            valor_total: '50.00'
          }
        ]
      },
      pedido: {
        status_codigo: 0
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `TESTE-MANUAL-CARRINHO-ABERTO-${Date.now()}`
      }
    };

    // CENÁRIO 2: Carrinho Checkout (Aguardando Pagamento)
    const carrinhoCheckout = {
      tipo_evento: 'carrinho_checkout',
      carrinho_id: 999002,
      status: {
        codigo: 2,
        descricao: 'Comprou (Aguardando Pagamento)',
        data_atualizacao: new Date().toISOString()
      },
      pessoa: {
        nome: 'Pablo Teste',
        email: 'mulekinrx1v9@gmail.com',
        telefone: '(83) 98751-6699'
      },
      carrinho: {
        carrinho_id: 999002,
        status: 'checkout',
        status_codigo: 2,
        valor_total: '250.00',
        forma_pagamento: 'Pix',
        itens: [
          {
            produto_id: 3,
            descricao: 'Produto Teste 3',
            quantidade: 1,
            valor_unitario: '250.00',
            valor_total: '250.00'
          }
        ]
      },
      pedido: {
        status_codigo: 1,
        valor_total: '250.00',
        forma_pagamento: 'Pix',
        itens: [
          {
            produto_id: 3,
            descricao: 'Produto Teste 3',
            quantidade: 1,
            valor_unitario: '250.00',
            valor_total: '250.00'
          }
        ]
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `TESTE-MANUAL-CARRINHO-CHECKOUT-${Date.now()}`
      }
    };

    // CENÁRIO 3: Carrinho Abandonado
    const carrinhoAbandonado = {
      tipo_evento: 'carrinho_abandonado',
      carrinho_id: 999003,
      status: {
        codigo: 4,
        descricao: 'Carrinho Abandonado',
        data_atualizacao: new Date().toISOString()
      },
      pessoa: {
        nome: 'Pablo Teste',
        email: 'mulekinrx1v9@gmail.com',
        telefone: '(83) 98751-6699'
      },
      carrinho: {
        carrinho_id: 999003,
        status: 'abandonado',
        status_codigo: 4,
        valor_total: '180.00',
        itens: [
          {
            produto_id: 4,
            descricao: 'Produto Teste 4',
            quantidade: 3,
            valor_unitario: '60.00',
            valor_total: '180.00'
          }
        ]
      },
      pedido: {
        status_codigo: 0
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `TESTE-MANUAL-CARRINHO-ABANDONADO-${Date.now()}`
      }
    };

    // CENÁRIO 4: Pedido - Pagamento em Análise
    const pedidoPagamentoAnalise = {
      tipo_evento: 'status_atualizado',
      pedido_id: 999004,
      pedido_codigo: 'TESTE-999004',
      status: {
        codigo: 2,
        descricao: 'Pagamento em Análise',
        data_atualizacao: new Date().toISOString()
      },
      pessoa: {
        nome: 'Pablo Teste',
        email: 'mulekinrx1v9@gmail.com',
        telefone: '(83) 98751-6699'
      },
      carrinho: {
        status_codigo: 0
      },
      pedido: {
        status_codigo: 2,
        data_pedido: new Date().toISOString(),
        valor_total: '320.00',
        forma_pagamento: 'Cartão - Visa',
        link_pagamento: null,
        itens: [
          {
            produto_id: 5,
            descricao: 'Produto Teste 5',
            quantidade: 2,
            valor_unitario: '160.00',
            valor_total: '320.00'
          }
        ]
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `TESTE-MANUAL-PEDIDO-${Date.now()}`
      },
      entrega: {
        status: 'aguardando',
        codigo_rastreio: '',
        transportadora: '',
        link_rastreio: '',
        previsao_entrega: '',
        data_postagem: '',
        endereco_entrega: null,
        eventos: []
      }
    };

    // CENÁRIO 5: Pedido Aprovado
    const pedidoAprovado = {
      tipo_evento: 'status_atualizado',
      pedido_id: 999005,
      pedido_codigo: 'TESTE-999005',
      status: {
        codigo: 4,
        descricao: 'Aprovado',
        data_atualizacao: new Date().toISOString()
      },
      pessoa: {
        nome: 'Pablo Teste',
        email: 'mulekinrx1v9@gmail.com',
        telefone: '(83) 98751-6699'
      },
      carrinho: {
        status_codigo: 0
      },
      pedido: {
        status_codigo: 4,
        data_pedido: new Date().toISOString(),
        valor_total: '450.00',
        forma_pagamento: 'Pix',
        link_pagamento: null,
        itens: [
          {
            produto_id: 6,
            descricao: 'Produto Teste 6',
            quantidade: 3,
            valor_unitario: '150.00',
            valor_total: '450.00'
          }
        ]
      },
      origem: {
        fonte: 'magazord',
        capturado_em: new Date().toISOString(),
        identificador_unico: `TESTE-MANUAL-PEDIDO-APROVADO-${Date.now()}`
      },
      entrega: {
        status: 'aguardando',
        codigo_rastreio: '',
        transportadora: '',
        link_rastreio: '',
        previsao_entrega: '',
        data_postagem: '',
        endereco_entrega: null,
        eventos: []
      }
    };

    console.log('\n📤 ENVIANDO 5 CENÁRIOS DE TESTE:');
    console.log('1. Carrinho Aberto (status_codigo: 1)');
    console.log('2. Carrinho Checkout (status_codigo: 2)');
    console.log('3. Carrinho Abandonado (status_codigo: 4)');
    console.log('4. Pedido - Pagamento em Análise (status_codigo: 2)');
    console.log('5. Pedido - Aprovado (status_codigo: 4)');

    // Enviar todos os cenários
    const eventos = [
      carrinhoAberto,
      carrinhoCheckout,
      carrinhoAbandonado,
      pedidoPagamentoAnalise,
      pedidoAprovado
    ];

    const resultados = await ghlService.enviarLote(eventos);

    console.log('\n📊 RESULTADOS:');
    resultados.forEach((resultado, index) => {
      const evento = eventos[index];
      console.log(`\n${index + 1}. ${evento.tipo_evento} (${evento.carrinho_id || evento.pedido_id}):`);
      if (resultado.success) {
        console.log('   ✅ Enviado com sucesso');
      } else {
        console.log(`   ❌ Falha: ${resultado.error}`);
      }
    });

    const sucessos = resultados.filter(r => r.success).length;
    const falhas = resultados.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(80));
    console.log(`✅ Enviados: ${sucessos}/${eventos.length}`);
    console.log(`❌ Falhas: ${falhas}/${eventos.length}`);
    console.log('='.repeat(80));

    // Resposta para o usuário
    res.status(200).json({
      success: true,
      message: `Teste manual concluído! ${sucessos} eventos enviados ao GHL.`,
      eventos_enviados: sucessos,
      falhas,
      detalhes: eventos.map((evento, index) => ({
        cenario: evento.tipo_evento,
        id: evento.carrinho_id || evento.pedido_id,
        status_codigo_carrinho: evento.carrinho?.status_codigo,
        status_codigo_pedido: evento.pedido?.status_codigo,
        email: evento.pessoa?.email,
        telefone: evento.pessoa?.telefone,
        enviado: resultados[index].success,
        erro: resultados[index].error || null
      }))
    });

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE MANUAL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
