# 🧪 Testes de Validação - Link de Pagamento

## 📋 Descrição

Scripts de teste para validar se os campos de **link de pagamento** e **link de checkout** estão sendo preenchidos corretamente nos eventos enviados ao GHL.

---

## 🚀 Como Executar

### 1️⃣ **Teste: Buscar Pagamento de Pedido**

Valida se o endpoint `/v2/site/pedido/{id}/payments` retorna dados de pagamento (boleto/PIX).

```bash
npm run test:pagamento
```

**O que testa:**
- ✅ Endpoint `/payments` está funcionando
- ✅ Retorna dados de boleto (campo `url`)
- ✅ Retorna dados de PIX (campo `qrCode`)
- ✅ Verifica situação e data de expiração

---

### 2️⃣ **Teste: Hash de Carrinho**

Valida se carrinhos têm o campo `hash` necessário para gerar link de checkout.

```bash
npm run test:carrinho
```

**O que testa:**
- ✅ Carrinhos têm campo `hash`
- ✅ Função `gerarLinkCheckout()` está funcionando
- ✅ Link gerado está no formato correto
- ✅ Estatísticas de carrinhos com/sem hash

---

### 3️⃣ **Teste: Estrutura Completa dos Eventos**

Valida a estrutura final dos eventos que serão enviados ao GHL.

```bash
npm run test:eventos
```

**O que testa:**
- ✅ Evento `carrinho_abandonado` tem `link_checkout`
- ✅ Evento `pedido_aguardando_pagamento` tem `link_pagamento`
- ✅ Evento `pix_expirado` tem `link_pagamento`
- ✅ Evento `boleto_vencido` tem `link_pagamento`
- ✅ Todos campos obrigatórios estão preenchidos
- ✅ Telefone está formatado corretamente

---

## 📊 Resultados Esperados

### ✅ Sucesso

```
🧪 TESTE: Buscar Pagamento de Pedido
================================================================================

✅ Encontrados 45 pedidos

📋 Pedido selecionado para teste:
   ID: 12345
   Status: 1
   Forma Pagamento: Boleto Bancário

✅ Endpoint /payments FUNCIONOU!

💰 Pagamento 1:
   Forma: Boleto Bancário
   Gateway: PagSeguro
   Valor: R$ 250.00
   📄 Boleto:
      URL: https://pagseguro.com.br/boleto/xyz123  ✅
      Situação: Emitido
      Vencimento: 2026-03-01

================================================================================
✅ TESTE CONCLUÍDO
================================================================================
```

### ❌ Problemas Possíveis

```
❌ Erro ao buscar endpoint /payments:
   Status: 404
   Mensagem: Endpoint não encontrado
```

**Solução:** Verificar se o endpoint está disponível na versão da API.

```
⚠️  Nenhuma informação de pagamento encontrada
```

**Solução:** Pedido pode não ter dados de pagamento associados. Testar com outro pedido.

```
❌ Sem hash - não pode gerar link
```

**Solução:** Carrinho não tem hash. Verificar se API retorna esse campo.

---

## 🔧 Debug e Logs

Todos os scripts incluem logs detalhados com:

- 🔍 **console.log()** para acompanhar execução
- 📊 **JSON.stringify()** para ver estrutura completa dos dados
- ✅ **Validações** de cada campo obrigatório
- ❌ **Erros detalhados** com status code e mensagem

---

## 📝 Checklist de Validação

Após executar os testes, verifique:

### Para Carrinhos:
- [ ] Campo `hash` existe no carrinho
- [ ] Função `gerarLinkCheckout()` gera link válido
- [ ] Link segue formato: `https://danajalecos.painel.magazord.com.br/carrinho/{hash}`

### Para Pedidos:
- [ ] Endpoint `/payments` retorna dados
- [ ] Campo `boleto.url` está preenchido (se boleto)
- [ ] Campo `pix.qrCode` está preenchido (se PIX)
- [ ] Função `extrairLinkPagamento()` extrai corretamente

### Para Eventos:
- [ ] `carrinho_abandonado` tem `carrinho.link_checkout`
- [ ] `pedido_aguardando_pagamento` tem `pedido.link_pagamento`
- [ ] `pix_expirado` tem `pedido.link_pagamento`
- [ ] `boleto_vencido` tem `pedido.link_pagamento`
- [ ] Todos eventos têm `pessoa.phone` formatado

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
# Certifique-se que está no diretório do projeto
cd c:\Users\pablo\OneDrive\Documentos\nesse-v2

# Instale dependências se necessário
npm install
```

### Erro: "Não autorizado"

Verifique credenciais no arquivo `.env`:
- `MAGAZORD_USER`
- `MAGAZORD_PASSWORD`

### Sem dados retornados

Ajuste período de busca nos arquivos de teste:
```javascript
// Altere de 30 para mais dias
dataInicio.setDate(dataInicio.getDate() - 60); // 60 dias atrás
```

---

## 📦 Próximos Passos

Após validar que os testes estão passando:

1. ✅ Implementar mudanças propostas em [ANALISE-LINK-PAGAMENTO.md](../ANALISE-LINK-PAGAMENTO.md)
2. ✅ Adicionar método `buscarPagamentoPedido()` em `magazord.service.js`
3. ✅ Adicionar método `extrairLinkPagamento()` em `transformer.service.js`
4. ✅ Atualizar `processarPedidos()` em `sync.controller.js`
5. ✅ Atualizar `processarCarrinhos()` em `sync.controller.js`
6. ✅ Testar localmente com `npm run dev`
7. ✅ Deploy para produção

---

## 🎯 Validação Final

Antes do deploy, execute:

```bash
# Rodar todos os testes
npm run test:pagamento
npm run test:carrinho
npm run test:eventos

# Validar servidor local
npm run dev

# Executar sincronização manual
curl -X POST http://localhost:3000/api/cron/manual
```

Verifique nos logs da sincronização que os links estão sendo preenchidos.
