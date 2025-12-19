# 🚀 SETUP COMPLETO - SUPABASE + VERCEL

## ✅ O que foi feito:

1. **Removido o cron do Vercel** - agora você pode fazer deploy sem problemas
2. **Criado banco de dados no Supabase** - para rastrear eventos processados
3. **Criada Edge Function** - para chamar sua API Vercel a cada 15 minutos
4. **Configurado pg_cron** - cron job nativo do PostgreSQL

---

## 📋 PASSO A PASSO PARA CONFIGURAR

### 1️⃣ CRIAR TABELAS NO SUPABASE

1. Acesse o **SQL Editor** do Supabase: https://gyxjuxmwnwyansfoabyv.supabase.co
2. Cole e execute o conteúdo do arquivo: `supabase/schema.sql`
3. Isso criará:
   - Tabela `eventos_processados` (rastrear eventos)
   - Tabela `sync_logs` (logs de sincronização)
   - Tabela `configuracoes` (configurações gerais)
   - Funções de limpeza automática

---

### 2️⃣ FAZER DEPLOY DA EDGE FUNCTION

**Opção A - Via Dashboard do Supabase (Mais Fácil):**

1. Acesse: https://gyxjuxmwnwyansfoabyv.supabase.co/project/_/functions
2. Clique em **"New Function"**
3. Nome: `sync-cron`
4. Cole o código do arquivo: `supabase/functions/sync-cron/index.ts`
5. Em **Secrets**, adicione:
   - `VERCEL_API_URL` = `https://seu-app.vercel.app` (coloque a URL real do Vercel)
   - `CRON_SECRET` = `alguma-senha-secreta-aqui` (opcional, para segurança)

**Opção B - Via Supabase CLI:**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Fazer login
supabase login

# Link com projeto
supabase link --project-ref gyxjuxmwnwyansfoabyv

# Deploy da função
supabase functions deploy sync-cron

# Configurar secrets
supabase secrets set VERCEL_API_URL=https://seu-app.vercel.app
supabase secrets set CRON_SECRET=alguma-senha-secreta
```

---

### 3️⃣ CONFIGURAR O CRON JOB (pg_cron)

**⚠️ IMPORTANTE:** O pg_cron só está disponível no **plano Pro** do Supabase ($25/mês).

Se você tem plano Pro:
1. No **SQL Editor**, execute: `supabase/cron-setup.sql`
2. Isso criará um cron que executa a cada 15 minutos

**Se você está no plano FREE do Supabase:**

Use uma dessas alternativas:

#### **Alternativa 1 - Cron-job.org (GRÁTIS)**
1. Cadastre em: https://cron-job.org
2. Crie novo cron job:
   - URL: `https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron`
   - Frequência: `*/15 * * * *` (a cada 15 minutos)

#### **Alternativa 2 - EasyCron (GRÁTIS)**
1. Cadastre em: https://www.easycron.com
2. Plano gratuito: 1 cron a cada 30 minutos
3. Configure URL da edge function

#### **Alternativa 3 - GitHub Actions (GRÁTIS)**
Crie arquivo `.github/workflows/cron.yml`:

```yaml
name: Sync Cron
on:
  schedule:
    - cron: '*/15 * * * *'  # A cada 15 minutos
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Edge Function
        run: |
          curl -X GET https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron
```

---

### 4️⃣ VARIÁVEIS DE AMBIENTE NO VERCEL

Adicione no Vercel (https://vercel.com/pateta-murcho/neese/settings/environment-variables):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gyxjuxmwnwyansfoabyv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_mFO1y3tCjIGg6j5QsJQUpQ_vobxOhZw

# Secret para validar cron (opcional)
CRON_SECRET=alguma-senha-secreta-aqui

# Suas outras variáveis já existentes (Magazord, GHL, etc)
```

---

### 5️⃣ ADICIONAR SEGURANÇA NO ENDPOINT (Opcional)

Edite `src/routes/cron.route.js` para validar chamadas do cron:

```javascript
// Verifica se a chamada vem do cron autorizado
router.get('/', (req, res, next) => {
  const cronSecret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}, syncController.executarSyncAutomatica);
```

---

## 🔍 TESTAR O SETUP

### Teste manual da Edge Function:
```bash
curl https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron
```

### Verificar logs no Supabase:
```sql
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;
SELECT * FROM eventos_processados ORDER BY processado_em DESC LIMIT 10;
```

### Ver cron jobs agendados (se usar pg_cron):
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 💰 RESUMO DE CUSTOS

| Serviço | Plano | Cron | Custo |
|---------|-------|------|-------|
| **Vercel** | Hobby | ❌ Não | Grátis |
| **Supabase** | Free | ❌ Não (sem pg_cron) | Grátis |
| **Supabase** | Pro | ✅ Sim (pg_cron) | $25/mês |
| **Cron-job.org** | Free | ✅ Sim (até 1/min) | Grátis |
| **GitHub Actions** | Free | ✅ Sim | Grátis |

**RECOMENDAÇÃO:** Use **Supabase Free + Cron-job.org** = **100% GRÁTIS** 🎉

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Deploy no Vercel (sem cron)
2. ⬜ Executar `schema.sql` no Supabase
3. ⬜ Deploy da Edge Function
4. ⬜ Configurar cron externo (Cron-job.org ou GitHub Actions)
5. ⬜ Testar sincronização

---

## 🆘 AJUDA

Se precisar de ajuda:
- Logs Vercel: https://vercel.com/pateta-murcho/neese/logs
- Logs Supabase: https://gyxjuxmwnwyansfoabyv.supabase.co/project/_/logs/edge-functions
- SQL Editor: https://gyxjuxmwnwyansfoabyv.supabase.co/project/_/sql
