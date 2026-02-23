# 🔍 ANÁLISE: Sistema de Busca Incremental de Eventos

## ❓ Pergunta Principal

**"Os disparos para pegar eventos no GHL estão sendo feitos incrementalmente ou exclusivamente pelo cron? O servidor vê o dia de hoje ou o cron incrementa sempre esse disparo?"**

## ✅ Resposta

O sistema funciona de forma **INCREMENTAL BASEADO EM DATAS**, gerenciado pelo Supabase. **NÃO** é o cron que incrementa manualmente, mas sim o **timestamp salvo no banco de dados**.

---

## 🔄 Como Funciona o Sistema

### 1️⃣ **Primeira Execução do Cron**
```javascript
// Arquivo: src/services/supabase.service.js (linha 82)
getInicioDoDia() {
  const hoje = new Date();
  hoje.setHours(hoje.getHours() - (7 * 24), 0, 0, 0); // 7 dias atrás
  return hoje;
}
```

**Comportamento:**
- Busca eventos desde **7 dias atrás** até **agora**
- Isso garante que nenhum evento recente seja perdido

---

### 2️⃣ **Próximas Execuções**
```javascript
// Arquivo: src/controllers/sync.controller.js (linha 311)
dataInicio = new Date('2026-01-08T00:00:00-03:00');
dataFim = new Date();
```

**Comportamento:**
- **dataInicio**: Sempre fixo em `08/01/2026` (filtro hardcoded)
- **dataFim**: Momento atual da execução
- O sistema busca TODOS os eventos desde 08/01/2026, mas...
- O **Supabase** evita duplicatas através da tabela `eventos_processados`

---

### 3️⃣ **Controle de Duplicatas**
```javascript
// Arquivo: src/services/supabase.service.js (linha 95)
async registrarEvento(identificador, tipoEvento, dados) {
  const { error } = await this.supabase
    .from('eventos_processados')
    .insert({ identificador, ... });
  
  // Se erro de duplicata (código 23505), retorna false
  if (error?.code === '23505') {
    return false; // Já existe
  }
  
  return true; // Evento novo
}
```

**Comportamento:**
- Cada evento tem um **identificador único**: `CARRINHO-{id}-{status}` ou `PEDIDO-{id}-{situacao}`
- Antes de processar, verifica se já existe no banco
- Se já existe, **ignora** (não duplica)
- Se é novo, **processa e envia ao GHL**

---

### 4️⃣ **Salvamento do Timestamp**
```javascript
// Arquivo: src/controllers/sync.controller.js (linha 370)
await supabaseService.salvarUltimaExecucao(dataFim);
```

**Comportamento:**
- Após cada execução, salva a data/hora atual no Supabase
- Tabela: `configuracoes`
- Chave: `ultima_execucao_cron`
- Valor: `{ timestamp: "2026-02-23T22:15:00.000Z", status: "sucesso" }`

---

## 📊 Exemplo Passo a Passo

### Execução 1: 23/02/2026 às 10:00
```
📅 Busca: 08/01/2026 00:00 → 23/02/2026 10:00
📦 Encontra: 150 carrinhos e 300 pedidos
✅ Processa: 450 eventos (todos novos)
💾 Salva no Supabase: 450 registros
📤 Envia ao GHL: 450 eventos
💾 Atualiza timestamp: 23/02/2026 10:00
```

### Execução 2: 23/02/2026 às 10:15
```
📅 Busca: 08/01/2026 00:00 → 23/02/2026 10:15
📦 Encontra: 152 carrinhos e 302 pedidos (API retorna tudo)
🔍 Verifica Supabase: 450 já existem (duplicatas)
✅ Processa: 4 eventos NOVOS (2 carrinhos + 2 pedidos)
💾 Salva no Supabase: 4 registros
📤 Envia ao GHL: 4 eventos
💾 Atualiza timestamp: 23/02/2026 10:15
```

### Execução 3: 23/02/2026 às 10:30
```
📅 Busca: 08/01/2026 00:00 → 23/02/2026 10:30
📦 Encontra: 152 carrinhos e 303 pedidos
🔍 Verifica Supabase: 454 já existem
✅ Processa: 1 evento NOVO (1 pedido)
💾 Salva no Supabase: 1 registro
📤 Envia ao GHL: 1 evento
💾 Atualiza timestamp: 23/02/2026 10:30
```

---

## 🎯 Resposta Direta às Suas Perguntas

### ✅ É incremental ou exclusivamente pelo cron?
**Resposta:** É **INCREMENTAL** gerenciado pelo **Supabase**, não pelo cron.

### ✅ O servidor vê o dia de hoje?
**Resposta:** Sim, sempre usa `new Date()` (momento atual) como `dataFim`.

### ✅ O cron incrementa o disparo?
**Resposta:** **NÃO**. O cron apenas dispara a busca. O **Supabase** (banco de dados) controla quais eventos já foram processados através da tabela `eventos_processados`.

### ✅ Como garante que não processa duplicatas?
**Resposta:** Através do **identificador único** de cada evento:
- `CARRINHO-{id}-{status}` → Ex: `CARRINHO-12345-2`
- `PEDIDO-{id}-{situacao}` → Ex: `PEDIDO-67890-aguardando_pagamento`

---

## 🧹 Por Que Precisa de Limpeza?

### Problema:
- Toda execução busca desde `08/01/2026`
- API retorna **TODOS** os eventos (mesmo já processados)
- Supabase verifica duplicatas para cada um
- Com o tempo, a tabela `eventos_processados` cresce muito
- Verificação de duplicatas fica mais lenta

### Solução:
- Script de limpeza remove eventos antigos (>30 dias)
- Mantém apenas dados recentes
- Sistema continua funcionando normalmente
- Banco de dados fica leve e rápido

---

## 📁 Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| [sync.controller.js](src/controllers/sync.controller.js#L311) | Define período de busca (`dataInicio` → `dataFim`) |
| [supabase.service.js](src/services/supabase.service.js#L95) | Registra eventos e evita duplicatas |
| [supabase.service.js](src/services/supabase.service.js#L58) | Salva timestamp da última execução |
| [scripts/limpar-banco.js](scripts/limpar-banco.js) | Script de limpeza automática |

---

## 🚀 Como Executar o Sistema

### 1. Rodar servidor local:
```bash
npm run dev
```

### 2. Testar sincronização manual:
```bash
curl -X POST http://localhost:3000/api/cron/manual
```

### 3. Limpar banco de dados:
```bash
npm run limpar-banco
```

---

## 📌 Conclusão

O sistema é **INTELIGENTE** e **INCREMENTAL**:
- ✅ Busca sempre todos os eventos desde 08/01/2026
- ✅ Usa Supabase para evitar processar duplicatas
- ✅ Envia ao GHL apenas eventos novos
- ✅ Salva timestamp para referência futura
- ✅ Script de limpeza mantém banco leve

**Não é o cron que incrementa, é o Supabase que gerencia!** 🎯
