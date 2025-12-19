import express from 'express';
import { executarSincronizacao } from '../controllers/sync.controller.js';

const router = express.Router();

/**
 * Endpoint Cron - Chamado pelo Vercel Cron a cada 20 minutos
 * GET /api/cron
 */
router.get('/', async (req, res) => {
  try {
    // Verifica se a requisição vem do Vercel Cron (segurança básica)
    const authorization = req.headers.authorization;
    const userAgent = req.headers['user-agent'] || '';
    
    console.log('\n📡 Requisição Cron recebida');
    console.log('User-Agent:', userAgent);
    console.log('Authorization:', authorization ? '✓ Presente' : '✗ Ausente');

    // Executa sincronização
    const resultado = await executarSincronizacao();

    res.json({
      success: true,
      message: 'Sincronização executada',
      ...resultado,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no endpoint cron:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint manual para testar sincronização
 * POST /api/cron/manual
 */
router.post('/manual', async (req, res) => {
  try {
    console.log('\n🔧 Sincronização manual iniciada');
    
    const resultado = await executarSincronizacao();

    res.json({
      success: true,
      message: 'Sincronização manual concluída',
      ...resultado,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na sincronização manual:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
