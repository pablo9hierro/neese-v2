# 📋 Guia de Eventos e Filtros para GHL

Este documento explica como configurar os filtros no GHL para identificar cada tipo de evento disparado pelo sistema de integração Magazord.

## 🎯 Estrutura do JSON Enviado ao GHL

Todos os eventos enviados ao GHL contêm os seguintes campos principais:

```json
{
  "tipo_evento": "string",
  "pessoa": {
    "nome": "string",
    "email": "string",
    "telefone": "string"  // ⚠️ OBRIGATÓRIO
  },
  "carrinho": {
    "status_codigo": number
  },
  "pedido": {
    "status_codigo": number
  },
  "status": {
    "codigo": number,
    "descricao": "string"
  }
}
```

---

## 📊 EVENTOS E FILTROS

### 1️⃣ **Carrinho Abandonado**
**Quando ocorre:** Cliente iniciou checkout/carrinho e não concluiu  
**Filtros no GHL:**
```
tipo_evento is carrinho_abandonado
AND carrinho.status_codigo Equal to 2
```

**Campos disponíveis:**
- `pessoa.telefone` ✅ (obrigatório)
- `pessoa.email` 
- `pessoa.nome`
- `carrinho.valor_total`
- `carrinho.itens[]`

---

### 2️⃣ **Pedido Aberto (Aguardando Pagamento)**
**Quando ocorre:** Pedido é gerado (PIX/boleto) e fica "Aguardando Pagamento"  
**Filtros no GHL:**
```
tipo_evento is status_atualizado
AND pedido.status_codigo Equal to 1
```

**Descrição do status:** "Aguardando Pagamento"

**Campos disponíveis:**
- `pessoa.telefone` ✅ (obrigatório)
- `pessoa.email`
- `pessoa.nome`
- `pedido.valor_total`
- `pedido.forma_pagamento`
- `pedido.link_pagamento`
- `pedido.itens[]`

---

### 3️⃣ **PIX Expirado / Boleto Vencido (Cancelado por Falta de Pagamento)**
**Quando ocorre:** PIX expira ou boleto vence e o pedido fica "Expirado/Cancelado por falta de pagamento"  
**Filtros no GHL:**
```
tipo_evento is status_atualizado
AND pedido.status_codigo Equal to 2
```
**OU**
```
tipo_evento is status_atualizado
AND pedido.status_codigo Equal to 14
```

**Descrições dos status:**
- Status 2: "Cancelado Pagamento"
- Status 14: "Cancelado Pagamento Análise"

**Campos disponíveis:**
- `pessoa.telefone` ✅ (obrigatório)
- `pessoa.email`
- `pessoa.nome`
- `pedido.valor_total`
- `pedido.forma_pagamento`

---

### 4️⃣ **Cartão Recusado**
**Quando ocorre:** Tentativa de pagamento com cartão falha/recusada  
**Filtros no GHL:**
```
tipo_evento is status_atualizado
AND pedido.status_codigo Equal to 2
AND pedido.forma_pagamento Contains "Cartão"
```
**OU**
```
tipo_evento is status_atualizado
AND pedido.status_codigo Equal to 14
AND pedido.forma_pagamento Contains "Cartão"
```

**Descrições dos status:**
- Status 2: "Cancelado Pagamento"
- Status 14: "Cancelado Pagamento Análise"

**Campos disponíveis:**
- `pessoa.telefone` ✅ (obrigatório)
- `pessoa.email`
- `pessoa.nome`
- `pedido.valor_total`
- `pedido.forma_pagamento`

---

## 📚 Referência Completa: Status do Pedido (Magazord)

| Código | Descrição                                | Tipo               |
|--------|------------------------------------------|--------------------|
| 1      | Aguardando Pagamento                     | Normal             |
| 2      | Cancelado Pagamento                      | **Cancelado**      |
| 3      | Em análise Pagamento                     | Aguardando Terceiro|
| 4      | Aprovado                                 | Normal             |
| 5      | Aprovado e Integrado                     | Normal             |
| 6      | Nota Fiscal Emitida                      | Normal             |
| 7      | Transporte                               | Normal             |
| 8      | Entregue                                 | Normal             |
| 9      | Fraude                                   | Normal             |
| 10     | Chargeback                               | Normal             |
| 11     | Disputa                                  | Normal             |
| 12     | Aprovado Análise de Pagamento            | Normal             |
| 13     | Em análise de pagamento (interna)        | Normal             |
| 14     | Cancelado Pagamento Análise              | **Cancelado**      |
| 15     | Aguardando Pagamento (Diferenciado)      | Anomalia           |
| 16     | Problema Fluxo Postal                    | Anomalia           |
| 17     | Devolvido Financeiro                     | Anomalia           |
| 18     | Aguardando Atualização de Dados          | Aguardando Terceiro|
| 19     | Aguardando Chegada do Produto            | Normal             |
| 20     | Devolvido Estoque (Dep. 1)               | Anomalia           |
| 21     | Devolvido Estoque (Outros Dep.)          | Anomalia           |
| 22     | Suspenso Temporariamente                 | Anomalia           |
| 23     | Faturamento Iniciado                     | Normal             |
| 24     | Em Cancelamento                          | **Cancelado**      |
| 25     | Tratamento Pós-Vendas                    | Anomalia           |
| 26     | Nota Fiscal Cancelada                    | Normal             |
| 27     | Crédito por Troca                        | Normal             |
| 28     | Nota Fiscal Denegada                     | Anomalia           |
| 29     | Chargeback Pago                          | Normal             |
| 30     | Aprovado Parcial                         | Normal             |
| 31     | Em Logística Reversa                     | Anomalia           |

---

## 📚 Referência: Status do Carrinho (Magazord)

| Código | Descrição           |
|--------|---------------------|
| 1      | Aberto              |
| 2      | Abandonado          |
| 3      | Comprado            |

---

## ⚠️ REGRAS IMPORTANTES

1. **Telefone é OBRIGATÓRIO** 
   - Todos os eventos enviados ao GHL contêm `pessoa.telefone`
   - Se não houver telefone, o sistema busca em `/pessoa{id}` automaticamente
   - Se ainda assim não tiver telefone, o evento NÃO é enviado ao GHL

2. **Filtro de Data**
   - Apenas pedidos/carrinhos de **08/01/2026 em diante** são processados

3. **Estrutura JSON**
   - A estrutura JSON mantida exatamente como estava
   - Campos: `telefone`, `tipo_evento`, `status_codigo` estão preservados

---

## 🧪 Exemplos de Configuração no GHL

### Exemplo 1: Recuperar Carrinho Abandonado
```
Trigger: Webhook recebido
Filtro 1: tipo_evento is carrinho_abandonado
Filtro 2: carrinho.status_codigo Equal to 2

Ação: Enviar mensagem de recuperação com link do carrinho
```

### Exemplo 2: Lembrar Pagamento Pendente
```
Trigger: Webhook recebido
Filtro 1: tipo_evento is status_atualizado
Filtro 2: pedido.status_codigo Equal to 1

Ação: Enviar lembrete de pagamento PIX/Boleto
```

### Exemplo 3: Notificar Pagamento Expirado
```
Trigger: Webhook recebido
Filtro 1: tipo_evento is status_atualizado
Filtro 2: pedido.status_codigo Equal to 2 OR 14

Ação: Oferecer nova tentativa de compra
```

### Exemplo 4: Cartão Recusado
```
Trigger: Webhook recebido
Filtro 1: tipo_evento is status_atualizado
Filtro 2: pedido.status_codigo Equal to 2
Filtro 3: pedido.forma_pagamento Contains "Cartão"

Ação: Sugerir outro método de pagamento
```

---

## 📞 Suporte

Para dúvidas sobre os eventos ou configuração no GHL, consulte a equipe técnica.

**Última atualização:** 08/01/2026
