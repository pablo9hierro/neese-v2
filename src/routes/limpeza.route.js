import express from 'express';
import { executarLimpeza } from '../controllers/limpeza.controller.js';

const router = express.Router();

/**
 * Rota de limpeza automática do banco
 * GET /api/limpeza
 * Executada automaticamente a cada 2 dias pelo Vercel Cron
 */
router.get('/', executarLimpeza);

export default router;
