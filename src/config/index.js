export default {
  magazord: {
    apiUrl: process.env.MAGAZORD_API_URL || 'https://danajalecos.painel.magazord.com.br/api',
    user: process.env.MAGAZORD_USER || 'MZDKe610ed8d77404c8ebe37b79a35b579a5e4e85682c15d6bd89f30d5852757',
    password: process.env.MAGAZORD_PASSWORD || 'o#W51myRIS@j'
  },
  ghl: {
    webhookUrl: process.env.GHL_WEBHOOK_URL || 'https://services.leadconnectorhq.com/hooks/scD4yzuj3zsDsqfrgvtZ/webhook-trigger/b6fd6bb0-15ef-4af5-af2b-3122b92376b6'
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gyxjuxmwnwyansfoabyv.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eGp1eG13bnd5YW5zZm9hYnl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE3NjEwNywiZXhwIjoyMDgxNzUyMTA3fQ.Dw_qvsXu_SOCQiuH3KXcryuZ3Tzjg23sZxTNNXPEy8c'
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL) || 20
  },
  port: process.env.PORT || 3000
};
