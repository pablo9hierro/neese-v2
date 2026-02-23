# 🔍 ANÁLISE: Campo "link_pagamento" nos Eventos GHL

## ❌ PROBLEMA IDENTIFICADO

Atualmente, o campo `link_pagamento` **NÃO está sendo preenchido corretamente** para os eventos enviados ao GHL.

### Código Atual ([transformer.service.js](src/services/transformer.service.js#L192)):
```javascript
pedido: {
  status_codigo: statusCodigo,
  data_pedido: pedido.dataHora || pedido.dataPedido || pedido.data_pedido || new Date().toISOString(),
  valor_total: pedido.valorTotal || pedido.valor_total || '0.00',
  forma_pagamento: pedido.formaPagamentoNome || pedido.formaPagamento || pedido.forma_pagamento || 'Não informado',
  link_pagamento: pedido.linkPagamento || pedido.link_pagamento || null, // ❌ PROBLEMA AQUI
  itens: this.transformarItens(pedido.itens || [])
}
```

**O problema**: Apenas lê um campo que **não existe** na resposta da API do Magazord!

---

## 📊 EVENTOS QUE PRECISAM DE LINK DE PAGAMENTO

Conforme solicitado, os eventos que devem ser enviados ao GHL são:

| Evento | Status | Forma Pagamento | Link Necessário |
|--------|--------|-----------------|-----------------|
| `carrinho_abandonado` | Carrinho status 2 | Qualquer | ✅ Link para recuperar carrinho |
| `pedido_aguardando_pagamento` | Pedido status 1 | Qualquer | ✅ Link do boleto/PIX |
| `pix_expirado` | Pedido status 2 ou 14 | PIX | ✅ Link para gerar novo PIX |
| `boleto_vencido` | Pedido status 2 ou 14 | Boleto | ✅ Link do boleto |
| `pedido_aprovado` | Pedido status 4 | Qualquer | ❌ Não precisa |

---

## 🔧 SOLUÇÃO: Como Buscar o Link de Pagamento

### 1️⃣ **Para Carrinhos Abandonados**

**Endpoint Magazord:** `GET /v2/site/carrinho/{carrinho}/itens`

**Resposta da API inclui:**
```json
{
  "id": 12345,
  "status": 2,
  "hash": "abc123xyz",  // ← Campo usado para gerar link
  "dataAtualizacao": "2026-02-23T10:00:00"
}
```

**Link gerado:**
```
https://danajalecos.painel.magazord.com.br/carrinho/{hash}
```

✅ **Já existe função**: `gerarLinkCheckout(carrinho)` ([linha 286](src/services/transformer.service.js#L286))

❌ **Problema**: A função NÃO está sendo chamada!

---

### 2️⃣ **Para Pedidos (PIX/Boleto)**

**Endpoint Magazord:** `GET /v2/site/pedido/{id}/payments`

**Resposta da API:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 123,
        "formaRecebimento": "Boleto Bancário",
        "gateway": "PagSeguro",
        "valor": "250.00",
        "boleto": {
          "url": "https://pagseguro.com.br/boleto/xyz123",  // ← LINK DO BOLETO
          "situacao": "Emitido",
          "dataVencimento": "2026-03-01"
        },
        "pix": {
          "qrCode": "00020126...",  // ← QR CODE PIX
          "dataExpiracao": "2026-02-23T23:59:59",
          "situacao": "Pendente"
        }
      }
    ]
  }
}
```

**Campos importantes:**
- `boleto.url` → Link do boleto
- `pix.qrCode` → QR Code do PIX (pode ser convertido em link também)
- `pix.dataExpiracao` → Verifica se expirou

❌ **Problema**: Este endpoint **NÃO está sendo consultado** atualmente!

---

## ✅ PROPOSTA DE SOLUÇÃO

### 1. **Novo Método em `magazord.service.js`**

```javascript
/**
 * Busca informações de pagamento do pedido
 * Endpoint: GET /v2/site/pedido/{id}/payments
 */
async buscarPagamentoPedido(ped idoId) {
  try {
    const response = await axios.get(`${this.apiUrl}/v2/site/pedido/${pedidoId}/payments`, {
      auth: this.auth
    });
    
    const payments = response.data?.data?.items || [];
    return payments.length > 0 ? payments[0] : null; // Retorna primeiro pagamento
  } catch (error) {
    console.error(`Erro ao buscar pagamento do pedido ${pedidoId}:`, error.response?.data || error.message);
    return null;
  }
}
```

### 2. **Atualizar `transformer.service.js`**

```javascript
/**
 * Extrai link de pagamento do objeto payment
 */
extrairLinkPagamento(payment, formaPagamento) {
  if (!payment) return null;
  
  // Boleto
  if (payment.boleto?.url) {
    return payment.boleto.url;
  }
  
  // PIX - converte QR Code em link
  if (payment.pix?.qrCode) {
    // Pode retornar o próprio QR Code ou gerar um link
    return payment.pix.qrCode;
  }
  
  return null;
}
```

### 3. **Atualizar `sync.controller.js`**

Buscar pagamento ao processar pedidos:

```javascript
async function processarPedidos(dataInicio, dataFim) {
  // ... código existente ...
  
  for (const pedido of pedidos) {
    // ... código existente ...
    
    // 🆕 BUSCAR PAGAMENTO (para obter link)
    const payment = await magazordService.buscarPagamentoPedido(pedido.id);
    const linkPagamento = transformerService.extrairLinkPagamento(payment, pedido.formaPagamentoNome);
    
    // Adicionar ao pedidoCompleto
    pedidoCompleto.linkPagamento = linkPagamento;
    pedidoCompleto.payment = payment;
    
    // Transformar pedido
    const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
    
    // ... resto do código ...
  }
}
```

### 4. **Atualizar Carrinho Abandonado**

```javascript
async function processarCarrinhos(dataInicio, dataFim) {
  // ... código existente ...
  
  for (const carrinho of carrinhosRelevantes) {
    // ... código existente ...
    
    const carrinhoCompleto = {
      ...carrinho,
      itens,
      // 🆕 GERAR LINK DE CHECKOUT
      linkCheckout: transformerService.gerarLinkCheckout(carrinho)
    };
    
    const evento = transformerService.transformarCarrinhoAbandonado(carrinhoCompleto, cliente);
    
    // ... resto do código ...
  }
}
```

---

## 📝 RESUMO DAS MUDANÇAS

| Arquivo | Mudança | Descrição |
|---------|---------|-----------|
| `magazord.service.js` | **Adicionar** `buscarPagamentoPedido()` | Busca detalhes do pagamento na API |
| `transformer.service.js` | **Adicionar** `extrairLinkPagamento()` | Extrai link do boleto/PIX |
| `transformer.service.js` | **Usar** `gerarLinkCheckout()` | Já existe, mas não é chamada |
| `sync.controller.js` | **Chamar** `buscarPagamentoPedido()` | Busca payment ao processar pedidos |
| `sync.controller.js` | **Adicionar** linkCheckout em carrinhos | Usa função `gerarLinkCheckout()` |

---

## ⚠️ VALIDAÇÕES NECESSÁRIAS

### Para Carrinho Abandonado:
✅ Campo `hash` existe no carrinho?  
✅ Link gerado está correto?  
✅ Link redireciona para checkout válido?  

### Para Pedidos (PIX/Boleto):
✅ Endpoint `/payments` retorna dados?  
✅ Campo `boleto.url` está preenchido?  
✅ Campo `pix.qrCode` está preenchido?  
✅ Link do boleto está válido e não expirado?  
✅ PIX está expirado (verificar `dataExpiracao`)?  

---

## 🧪 SCRIPTS DE TESTE (A CRIAR)

1. **`test-buscar-pagamento.js`** - Testa endpoint `/payments`
2. **`test-carrinho-hash.js`** - Testa se carrinho tem hash
3. **`test-link-checkout.js`** - Valida link de checkout gerado
4. **`test-eventos-completo.js`** - Testa estrutura final dos eventos

---

## 📊 ESTRUTURA FINAL ESPERADA

### Evento: `carrinho_abandonado`
```json
{
  "tipo_evento": "carrinho_abandonado",
  "carrinho": {
    "status": "abandonado",
    "valor_total": "250.00",
    "link_checkout": "https://danajalecos.painel.magazord.com.br/carrinho/abc123"
  },
  "pedido": {
    "status_codigo": 0
  }
}
```

### Evento: `pedido_aguardando_pagamento`
```json
{
  "tipo_evento": "pedido_aguardando_pagamento",
  "pedido": {
    "status_codigo": 1,
    "forma_pagamento": "Boleto Bancário",
    "link_pagamento": "https://pagseguro.com.br/boleto/xyz123",  // ← PREENCHIDO
    "valor_total": "320.00"
  }
}
```

### Evento: `pix_expirado`
```json
{
  "tipo_evento": "pix_expirado",
  "pedido": {
    "status_codigo": 2,
    "forma_pagamento": "Pix",
    "link_pagamento": "00020126...",  // ← QR CODE PIX
    "valor_total": "180.00"
  }
}
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar scripts de teste
2. ✅ Implementar mudanças propostas
3. ✅ Testar localmente
4. ✅ Validar links gerados
5. ✅ Deploy para produção
