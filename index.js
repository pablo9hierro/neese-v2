import express from 'express';
import cronRouter from './src/routes/cron.route.js';
import webhookRouter from './src/routes/webhook.route.js';
import config from './src/config/index.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas
app.use('/api/cron', cronRouter);
app.use('/api/webhook', webhookRouter);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    name: 'Neese - Integração Magazord + GoHighLevel',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      cron: '/api/cron (GET - executado automaticamente a cada 20 minutos)',
      cronManual: '/api/cron/manual (POST - executar manualmente)',
      webhook: '/api/webhook/magazord (POST - receber webhooks do Magazord)',
      health: '/api/webhook/health (GET - verificar status)'
    },
    timestamp: new Date().toISOString()
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Handler 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path
  });
});

// Handler de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message
  });
});

// Inicia servidor (apenas em desenvolvimento, Vercel usa serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Acesse: http://localhost:${PORT}`);
    console.log(`⏰ Sincronização configurada para rodar a cada ${config.sync.intervalMinutes} minutos\n`);
  });
}

// Exporta para Vercel
export default app;
