# 🎯 GUIA RÁPIDO - ATIVAR CRON GRÁTIS (15 minutos)

## ✅ O QUE JÁ ESTÁ FEITO:

1. ✅ Edge Function criada e deployada no Supabase
2. ✅ GitHub Actions criado (`.github/workflows/sync-cron.yml`)
3. ✅ Cron do Vercel removido

---

## 🚀 PASSOS PARA ATIVAR:

### 1️⃣ PEGAR A URL DO VERCEL

Depois do deploy no Vercel, você terá uma URL tipo:
```
https://neese-xxxx.vercel.app
```

### 2️⃣ CONFIGURAR SECRETS NO SUPABASE

Execute estes comandos (substitua `SUA_URL_VERCEL`):

```bash
npx supabase secrets set VERCEL_API_URL=https://SUA_URL_VERCEL --project-ref gyxjuxmwnwyansfoabyv
npx supabase secrets set CRON_SECRET=neese-cron-secret-2024 --project-ref gyxjuxmwnwyansfoabyv
```

**OU** configure manualmente no dashboard:
1. Acesse: https://supabase.com/dashboard/project/gyxjuxmwnwyansfoabyv/settings/functions
2. Adicione os secrets:
   - `VERCEL_API_URL` = sua URL do Vercel
   - `CRON_SECRET` = `neese-cron-secret-2024`

### 3️⃣ ESCOLHER MÉTODO DE CRON (GRÁTIS)

Você tem **3 opções grátis**. Escolha UMA:

---

#### 🥇 OPÇÃO 1: GitHub Actions (RECOMENDADO - 100% Grátis)

**JÁ ESTÁ CRIADO!** Só precisa ativar:

1. Faça commit e push:
   ```bash
   git add .
   git commit -m "feat: adiciona GitHub Actions para cron"
   git push origin main
   ```

2. No GitHub, vá em: https://github.com/pateta-murcho/neese/actions
3. Clique em "I understand my workflows, go ahead and enable them"
4. Pronto! Executará a cada 15 minutos automaticamente 🎉

**Testar manualmente:**
- Vá em: https://github.com/pateta-murcho/neese/actions
- Clique em "Sync Cron"
- Clique em "Run workflow"

---

#### 🥈 OPÇÃO 2: Cron-job.org (Grátis até 1 execução/minuto)

**VOCÊ JÁ CRIOU!** Só precisa ativar:

1. No Cron-job.org: https://cron-job.org/en/members/jobs/
2. Ative o job "neese"
3. Pronto! 🎉

---

#### 🥉 OPÇÃO 3: EasyCron (Grátis - 1 cron a cada 30 min)

1. Cadastre: https://www.easycron.com/user/register
2. Crie novo cron:
   - URL: `https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron`
   - Intervalo: 30 minutos (limite do grátis)
3. Salve

---

## 🧪 TESTAR SE ESTÁ FUNCIONANDO

### Teste 1: Edge Function diretamente
```bash
curl https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron
```

Deve retornar algo como:
```json
{
  "success": true,
  "status": 200,
  "duracao_ms": 1234,
  "timestamp": "2025-12-19T...",
  "resultado": {...}
}
```

### Teste 2: Ver logs no Supabase
1. Acesse: https://supabase.com/dashboard/project/gyxjuxmwnwyansfoabyv/logs/edge-functions
2. Filtre por "sync-cron"
3. Veja as execuções

### Teste 3: Ver execuções do GitHub Actions
1. Acesse: https://github.com/pateta-murcho/neese/actions
2. Veja o histórico de execuções

---

## 📊 MONITORAMENTO

### Logs em tempo real:
```bash
# Supabase Logs
npx supabase functions logs sync-cron --project-ref gyxjuxmwnwyansfoabyv

# Ou no dashboard:
# https://supabase.com/dashboard/project/gyxjuxmwnwyansfoabyv/logs/edge-functions
```

### Ver banco de dados (depois de criar as tabelas):
```sql
-- Ver últimas execuções
SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;

-- Ver eventos processados
SELECT * FROM eventos_processados ORDER BY processado_em DESC LIMIT 10;
```

---

## 🎯 CHECKLIST FINAL

- [ ] Deploy no Vercel concluído
- [ ] URL do Vercel configurada nos secrets do Supabase
- [ ] Escolhido método de cron (GitHub Actions, Cron-job.org ou EasyCron)
- [ ] Testado manualmente a Edge Function
- [ ] Executado `schema.sql` no Supabase (criar tabelas)
- [ ] Verificado logs funcionando

---

## 💡 DICAS

**Para GitHub Actions:**
- Executa GRÁTIS a cada 15 minutos
- 2.000 minutos/mês no plano free
- Cada execução leva ~10 segundos
- Total: ~480 execuções/mês = 80 minutos usados

**Para Cron-job.org:**
- Limite: 1 execução por minuto (mais que suficiente!)
- Sem limite de execuções/mês
- Interface visual para ver histórico

**Para EasyCron:**
- Limite: 1 cron a cada 30 minutos no plano grátis
- Se quiser 15 minutos, precisa do plano pago

---

## 🆘 PROBLEMAS?

### Edge Function retorna erro 500:
- Verifique se `VERCEL_API_URL` está configurada corretamente
- Teste sua API Vercel diretamente: `https://SUA_URL/api/cron`

### GitHub Actions não executa:
- Verifique se habilitou workflows em: https://github.com/pateta-murcho/neese/actions
- Repositório público? Actions são grátis
- Repositório privado? Tem 2.000 minutos grátis/mês

### Cron-job.org não chama:
- Verifique se o job está ativo
- Veja o histórico de execuções

---

**RECOMENDAÇÃO FINAL:** Use **GitHub Actions** (opção 1) - é 100% grátis e confiável! 🚀
