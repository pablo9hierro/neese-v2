# 🎯 PROPOSTA FINAL: Implementação do Link de Pagamento

## ✅ DESCOBERTAS DOS TESTES

### 1️⃣ **Endpoint /payments FUNCIONA perfeitamente**
```json
{
  "status": "success",
  "data": {
    "items": [{
      "formaRecebimento": "Barte (MZ Pagamentos)",
      "gateway": "Magazord Pagamentos v2",
      "valor": "381.66",
      "boleto": null,  // Ou objeto com campo "url"
      "pix": null,     // Ou objeto com campo "qrCode"
      "cartao": { ... }
    }]
  }
}
```

### 2️⃣ **Carrinhos têm campo `url_checkout` PRONTO!**

Na resposta de `/v2/site/carrinho/{id}/itens`:
```json
{
  "carrinho": {
    "hash": "4ae2bd5bbe8bcabc08bc8459f548ad7a",
    "url_checkout": "https://www.danajalecos.com.br/checkout/cart?carr_hash=4ae2bd5bbe8bcabc08bc8459f548ad7a"  // ← USAR ESSE!
  }
}
```

**Melhor usar `url_checkout` do que gerar manualmente!**

---

## 🔧 IMPLEMENTAÇÃO: Arquivos a Modificar

### 1️⃣ **magazord.service.js** - Adicionar método `buscarPagamentoPedido()`

**Arquivo:** [src/services/magazord.service.js](../src/services/magazord.service.js)

```javascript
/**
 * Busca informações de pagamento do pedido
 * Endpoint: GET /v2/site/pedido/{codigoPedido}/payments
 */
async buscarPagamentoPedido(pedidoCodigo) {
  try {
    const response = await axios.get(
      `${this.apiUrl}/v2/site/pedido/${pedidoCodigo}/payments`,
      { auth: this.auth }
    );
    
    const payments = response.data?.data?.items || [];
    return payments.length > 0 ? payments[0] : null; // Retorna primeiro pagamento
  } catch (error) {
    console.error(`Erro ao buscar pagamento do pedido ${pedidoCodigo}:`, error.response?.data || error.message);
    return null;
  }
}
```

---

### 2️⃣ **transformer.service.js** - Adicionar métodos para extrair link

**Arquivo:** [src/services/transformer.service.js](../src/services/transformer.service.js)

#### Adicionar após `gerarLinkCheckout()`:

```javascript
/**
 * Extrai link de pagamento do objeto payment
 * Retorna URL do boleto, QR Code do PIX ou null
 */
extrairLinkPagamento(payment) {
  if (!payment) return null;
  
  // Boleto - retorna URL
  if (payment.boleto?.url) {
    return payment.boleto.url;
  }
  
  // PIX - retorna QR Code (Copia e Cola)
  if (payment.pix?.qrCode) {
    return payment.pix.qrCode;
  }
  
  return null;
}

/**
 * Extrai link de checkout do carrinho
 * Prioriza url_checkout que vem da API
 */
extrairLinkCheckoutCarrinho(itensResponse) {
  // O endpoint /carrinho/{id}/itens retorna um objeto com a estrutura:
  // { carrinho: { url_checkout: "..." } }
  return itensResponse?.carrinho?.url_checkout || null;
}
```

---

### 3️⃣ **sync.controller.js** - Buscar e adicionar links

**Arquivo:** [src/controllers/sync.controller.js](../src/controllers/sync.controller.js)

#### A. **Processar Carrinhos** (linha ~100):

```javascript
async function processarCarrinhos(dataInicio, dataFim) {
  try {
    // ... código existente até o loop de carrinhos ...
    
    // OTIMIZAÇÃO: Buscar TODOS os itens em paralelo
    const itensMap = {};
    const itensPromises = carrinhosRelevantes.map(async (carrinho) => {
      try {
        const itens = await magazordService.buscarItensCarrinho(carrinho.id);
        itensMap[carrinho.id] = itens || {};  // ← Guardar resposta completa
      } catch (err) {
        console.log(`      ⚠️ Erro ao buscar itens do carrinho ${carrinho.id}: ${err.message}`);
        itensMap[carrinho.id] = {};
      }
    });
    
    await Promise.all(itensPromises);
    console.log(`   ✅ Itens buscados para ${Object.keys(itensMap).length} carrinhos\n`);
    
    const eventos = [];
    for (const carrinho of carrinhosRelevantes) {
      // ... código de validação existente ...
      
      // 🆕 EXTRAIR LINK DE CHECKOUT
      const itensResponse = itensMap[carrinho.id] || {};
      const linkCheckout = transformerService.extrairLinkCheckoutCarrinho(itensResponse);
      
      console.log(`   🔗 Link checkout: ${linkCheckout || '❌ NÃO TEM'}`);
      
      // Montar carrinho completo com link
      const carrinhoCompleto = {
        ...carrinho,
        itens: itensResponse.carrinho?.itens || [],  // ← Usar itens da resposta
        linkCheckout: linkCheckout
      };
      
      // Processar apenas carrinho abandonado (status 2)
      let evento = null;
      
      if (carrinho.status === 2) {
        evento = transformerService.transformarCarrinhoAbandonado(carrinhoCompleto, cliente);
      }
      
      // ... resto do código ...
    }
  } catch (error) {
    console.error('❌ Erro ao processar carrinhos:', error.message);
    return [];
  }
}
```

#### B. **Processar Pedidos** (linha ~179):

```javascript
async function processarPedidos(dataInicio, dataFim) {
  try {
    // ... código existente até o loop de pedidos ...
    
    // Processar TODOS os pedidos com os dados já obtidos
    for (const pedido of pedidos) {
      console.log(`\n   🔹 Pedido ${pedido.id}:`);
      console.log(`      - Código: ${pedido.codigo}`);
      console.log(`      - Status: ${pedido.pedidoSituacao}`);
      console.log(`      - Forma Pagamento: ${pedido.formaPagamentoNome}`);
      
      // ... validações existentes ...
      
      // 🆕 BUSCAR PAGAMENTO (para obter link)
      let linkPagamento = null;
      
      if (pedido.pedidoSituacao === 1 || pedido.pedidoSituacao === 2 || pedido.pedidoSituacao === 14) {
        console.log(`      💳 Buscando pagamento...`);
        const payment = await magazordService.buscarPagamentoPedido(pedido.codigo);
        
        if (payment) {
          linkPagamento = transformerService.extrairLinkPagamento(payment);
          console.log(`      ✅ Link pagamento: ${linkPagamento ? 'TEM' : 'NÃO TEM'}`);
        }
      }
      
      // Montar pedido completo
      const pedidoCompleto = {
        ...pedido,
        clienteAPI: cliente,
        linkPagamento: linkPagamento  // ← Adicionar link
      };
      
      console.log(`      🔄 Transformando pedido...`);
      
      // Transformar pedido (apenas status usados no GHL)
      const evento = transformerService.transformarPedido(pedidoCompleto, null, null);
      
      // ... resto do código ...
    }
  } catch (error) {
    console.error('❌ Erro ao processar pedidos:', error.message);
    return [];
  }
}
```

---

### 4️⃣ **transformer.service.js** - Adicionar campo no evento do carrinho

**Arquivo:** [src/services/transformer.service.js](../src/services/transformer.service.js)  
**Função:** `transformarCarrinhoAbandonado()` (linha ~93)

```javascript
transformarCarrinhoAbandonado(carrinho, cliente) {
  const pessoa = this.extrairDadosPessoa(carrinho, cliente);
  
  if (!this.validarDadosContato({ email: pessoa.email, phone: pessoa.phone })) {
    console.log(`⚠️  Carrinho abandonado ${carrinho.id} sem telefone - IGNORADO`);
    return null;
  }

  return {
    tipo_evento: 'carrinho_abandonado',
    carrinho_id: carrinho.id,
    status: {
      codigo: 2,
      descricao: 'Carrinho Abandonado',
      data_atualizacao: carrinho.dataAtualizacao || carrinho.data_atualizacao || new Date().toISOString()
    },
    pessoa,
    carrinho: {
      carrinho_id: carrinho.id,
      status: 'abandonado',
      status_codigo: 2,
      valor_total: carrinho.valor_total || carrinho.valorTotal || '0.00',
      link_checkout: carrinho.linkCheckout || null,  // 🆕 ADICIONAR ESTE CAMPO
      itens: this.transformarItens(carrinho.itens || [])
    },
    pedido: {
      status_codigo: 0
    },
    origem: {
      fonte: 'magazord',
      capturado_em: new Date().toISOString(),
      identificador_unico: `CART-ABANDONED-${carrinho.id}-${Date.now()}`
    }
  };
}
```

---

## 📊 ESTRUTURA FINAL DOS EVENTOS

### ✅ Carrinho Abandonado:
```json
{
  "tipo_evento": "carrinho_abandonado",
  "carrinho": {
    "status": "abandonado",
    "valor_total": "250.00",
    "link_checkout": "https://www.danajalecos.com.br/checkout/cart?carr_hash=abc123",
    "itens": [...]
  }
}
```

### ✅ Pedido Aguardando Pagamento:
```json
{
  "tipo_evento": "pedido_aguardando_pagamento",
  "pedido": {
    "status_codigo": 1,
    "forma_pagamento": "Boleto Bancário",
    "link_pagamento": "https://gateway.com/boleto/xyz123",
    "valor_total": "320.00"
  }
}
```

### ✅ PIX Expirado:
```json
{
  "tipo_evento": "pix_expirado",
  "pedido": {
    "status_codigo": 2,
    "forma_pagamento": "Pix",
    "link_pagamento": "000201260350014...",  // QR Code Copia e Cola
    "valor_total": "180.00"
  }
}
```

---

## ⚡ ORDEM DE IMPLEMENTAÇÃO

1. ✅ **`magazord.service.js`** - Adicionar `buscarPagamentoPedido()`
2. ✅ **`transformer.service.js`** - Adicionar `extrairLinkPagamento()` e `extrairLinkCheckoutCarrinho()`
3. ✅ **`transformer.service.js`** - Atualizar `transformarCarrinhoAbandonado()` para incluir `link_checkout`
4. ✅ **`sync.controller.js`** - Atualizar `processarCarrinhos()` para extrair link
5. ✅ **`sync.controller.js`** - Atualizar `processarPedidos()` para buscar payment
6. ✅ Testar localmente com `npm run dev`
7. ✅ Validar com `npm run test:eventos`

---

## 🧪 VALIDAÇÃO

Após implementar, executar:

```bash
# Teste de estrutura completa
npm run test:eventos

# Rodar servidor local
npm run dev

# Executar sincronização manual (em outro terminal)
curl -X POST http://localhost:3000/api/cron/manual
```

Verificar nos logs:
- ✅ `link_checkout` preenchido em carrinhos abandonados
- ✅ `link_pagamento` preenchido em pedidos aguardando pagamento
- ✅ `link_pagamento` preenchido em PIX expirado/boleto vencido
- ✅ Todos campos obrigatórios presentes

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **Carrinho**: Usa `url_checkout` da API (não precisa gerar manualmente)
2. **Pedido**: Busca dados de payment APENAS para status 1, 2, 14 (otimização)
3. **Boleto**: Campo `boleto.url` pode vir `null` se não foi gerado
4. **PIX**: Campo `pix.qrCode` é o código "Copia e Cola" (não é um link HTTP)
5. **Performance**: Buscar payment adiciona ~1 requisição por pedido relevante

---

## 🚀 PRÓXIMO PASSO

**Você quer que eu implemente todas essas mudanças agora?**  
Posso criar os arquivos modificados prontos para uso.
