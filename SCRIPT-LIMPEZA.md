# 🧹 Script de Limpeza do Banco de Datos (Supabase)

## 📋 Descrição

Script automatizado para limpar dados antigos do Supabase, mantendo apenas os dados recentes necessários para o sistema continuar funcionando corretamente.

## ⚙️ Configurações Padrão

- **Eventos processados**: Mantém últimos **30 dias**
- **Logs de sincronização**: Mantém últimos **15 dias**
- **Preserva**: Configurações do sistema e timestamp da última execução

## 🚀 Como Usar

### Opção 1: Via npm script
```bash
npm run limpar-banco
```

### Opção 2: Diretamente com Node
```bash
node scripts/limpar-banco.js
```

## 🎯 O que o Script Faz

1. **Remove eventos antigos** da tabela `eventos_processados`
   - Remove eventos criados há mais de 30 dias
   - Mantém eventos recentes para continuidade do sistema

2. **Remove logs antigos** da tabela `sync_logs`
   - Remove logs criados há mais de 15 dias
   - Reduz acúmulo desnecessário de dados

3. **Exibe estatísticas** após limpeza
   - Total de eventos restantes
   - Eventos enviados ao GHL
   - Total de logs
   - Data da última execução do cron

## ⚠️ Importante

### O que é preservado:
✅ Configurações do sistema (tabela `configuracoes`)
✅ Timestamp da última execução do cron
✅ Eventos dos últimos 30 dias
✅ Logs dos últimos 15 dias

### O que é removido:
❌ Eventos criados há mais de 30 dias
❌ Logs de sincronização com mais de 15 dias

## 🔧 Personalizar Período de Retenção

Edite o arquivo `scripts/limpar-banco.js` e altere as constantes:

```javascript
const DIAS_PARA_MANTER = 30;      // Eventos
const DIAS_PARA_MANTER_LOGS = 15; // Logs
```

## 📊 Exemplo de Saída

```
================================================================================
🚀 SCRIPT DE LIMPEZA DO BANCO DE DADOS SUPABASE
================================================================================

⚙️  Configurações:
   - Manter eventos dos últimos 30 dias
   - Manter logs dos últimos 15 dias
   - URL Supabase: https://gyxjuxmwnwyansfoabyv.supabase.co

⏳ Iniciando em 3 segundos... (Ctrl+C para cancelar)

🧹 LIMPANDO EVENTOS ANTIGOS...

📅 Removendo eventos criados antes de: 2026-01-24T22:00:00.000Z
   (Mantendo apenas últimos 30 dias)

📊 Encontrados 1243 eventos para deletar
✅ 1243 eventos deletados com sucesso!

📊 Eventos restantes no banco: 456

🧹 LIMPANDO LOGS ANTIGOS...

📅 Removendo logs criados antes de: 2026-02-08T22:00:00.000Z
   (Mantendo apenas últimos 15 dias)

📊 Encontrados 89 logs para deletar
✅ 89 logs deletados com sucesso!

📊 Logs restantes no banco: 32

📊 ESTATÍSTICAS FINAIS DO BANCO:

✅ Total de eventos: 456
✅ Eventos enviados ao GHL: 456
✅ Total de logs: 32
✅ Última execução do cron: 23/02/2026 19:00:00

================================================================================
✅ LIMPEZA CONCLUÍDA COM SUCESSO!
================================================================================
```

## 🔄 Automatização (Opcional)

Para executar automaticamente a cada mês, você pode:

### Opção 1: Cron do Sistema (Linux/Mac)
```bash
# Editar crontab
crontab -e

# Adicionar linha (executa todo dia 1 às 3h da manhã)
0 3 1 * * cd /caminho/do/projeto && npm run limpar-banco
```

### Opção 2: Task Scheduler (Windows)
1. Abra o Agendador de Tarefas
2. Criar Tarefa Básica
3. Executar: `cmd.exe`
4. Argumentos: `/c cd C:\caminho\do\projeto && npm run limpar-banco`

### Opção 3: Supabase Edge Function
Crie uma Edge Function que execute o script via API.

## 🛡️ Segurança

- O script tem delay de 3 segundos antes de iniciar
- Você pode cancelar com `Ctrl+C` antes de executar
- Usa `SUPABASE_SERVICE_KEY` do arquivo `.env`
- Não afeta configurações ou timestamp do cron

## ❓ Perguntas Frequentes

### Por que manter 30 dias de eventos?
Para garantir que o sistema tenha dados suficientes para continuar funcionando incrementalmente. Se houver algum problema e o cron precisar reprocessar eventos recentes, eles ainda estarão disponíveis.

### Posso executar durante o funcionamento do sistema?
Sim! O script não interfere com o cron ou webhooks ativos.

### E se eu deletar todos os eventos?
O sistema continuará funcionando normalmente, buscando eventos desde a última execução salva na tabela `configuracoes`.

### Com que frequência devo rodar?
- **Mensal**: Para manutenção regular
- **Semanal**: Se houver muito volume de eventos
- **Manual**: Quando o banco estiver muito cheio
