import express from 'express';
import magazordService from '../services/magazord.service.js';
import ghlService from '../services/ghl.service.js';
import transformerService from '../services/transformer.service.js';

const router = express.Router();

/**
 * Webhook para receber notificações do Magazord
 * POST /api/webhook/magazord
 */
router.post('/magazord', async (req, res) => {
  try {
    console.log('\n📥 Webhook Magazord recebido');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const dados = req.body;

    // Responde imediatamente para não bloquear o Magazord
    res.status(200).json({ success: true, message: 'Webhook recebido' });

    // Processa evento de forma assíncrona
    processarWebhookMagazord(dados).catch(error => {
      console.error('❌ Erro ao processar webhook:', error);
    });

  } catch (error) {
    console.error('❌ Erro no webhook Magazord:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Processa dados recebidos do webhook Magazord
 */
async function processarWebhookMagazord(dados) {
  try {
    let evento;
    const tipo = dados.tipo_evento || dados.event || dados.type;

    switch (tipo) {
      case 'carrinho_criado':
      case 'carrinho_aberto':
        evento = transformerService.transformarCarrinhoAberto(dados, dados.cliente);
        break;

      case 'carrinho_checkout':
      case 'checkout_iniciado':
        evento = transformerService.transformarCarrinhoCheckout(dados, dados.cliente);
        break;

      case 'carrinho_abandonado':
        evento = transformerService.transformarCarrinhoAbandonado(dados, dados.cliente);
        break;

      case 'pedido_criado':
      case 'pedido_aprovado':
        evento = transformerService.transformarPedidoCriado(dados, dados.cliente, dados.rastreamento);
        break;

      case 'pedido_atualizado':
      case 'status_atualizado':
        evento = transformerService.transformarStatusPedido(dados, dados.cliente, dados.rastreamento);
        break;

      default:
        console.log(`⚠️ Tipo de evento desconhecido: ${tipo}`);
        return;
    }

    // Envia para GHL
    await ghlService.enviarDados(evento);
    console.log('✅ Webhook processado e enviado para GHL');

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
  }
}

/**
 * Health check
 * GET /api/webhook/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook está funcionando',
    timestamp: new Date().toISOString()
  });
});

export default router;
