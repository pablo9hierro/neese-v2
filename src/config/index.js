export default {
  magazord: {
    apiUrl: process.env.MAGAZORD_API_URL || 'https://danajalecos.painel.magazord.com.br/api',
    user: process.env.MAGAZORD_USER || 'MZDKe610ed8d77404c8ebe37b79a35b579a5e4e85682c15d6bd89f30d5852757',
    password: process.env.MAGAZORD_PASSWORD || 'o#W51myRIS@j'
  },
  ghl: {
    webhookUrl: process.env.GHL_WEBHOOK_URL || 'https://services.leadconnectorhq.com/hooks/scD4yzuj3zsDsqfrgvtZ/webhook-trigger/b6fd6bb0-15ef-4af5-af2b-3122b92376b6'
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL) || 20
  },
  port: process.env.PORT || 3000
};
