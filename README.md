# 🚀 Neese - Integração Magazord + GoHighLevel

Sistema de integração automática entre **Magazord** e **GoHighLevel** para automação de carrinhos e pedidos de e-commerce.

## 📋 Funcionalidades

### Eventos Capturados e Enviados ao GHL:

1. **🛒 Carrinho Aberto**
   - Cliente adiciona produtos ao carrinho
   - Dados enviados em tempo real para GHL

2. **💳 Carrinho em Checkout (Aguardando Pagamento)**
   - Cliente vai para página de pagamento
   - GHL pode disparar email: "Você realizou o pedido $x, finalize seu pagamento"

3. **🚫 Carrinho Abandonado**
   - Cliente não finalizou pagamento dentro do prazo
   - GHL pode disparar email de recuperação com link direto para checkout
   - Inclui todos os dados necessários para recriar o carrinho

4. **✅ Pedido Aprovado/Criado**
   - Pagamento confirmado
   - GHL pode disparar email de boas-vindas e agradecimento
   - Inclui dados de rastreamento e previsão de entrega

5. **📦 Status do Pedido Atualizado**
   - Mudanças no status (Em produção, Enviado, Entregue, etc.)
   - Cliente é notificado via GHL sobre andamento

## 🔄 Sincronização Automática

- **Frequência**: A cada **20 minutos** (via Vercel Cron)
- **Busca ativa** na API Magazord por novos eventos
- **Evita duplicatas** com sistema de cache inteligente
- **Processa em lote** para otimizar performance

## 📊 Dados Enviados ao GHL

Formato JSON padronizado com:
- Tipo do evento
- Dados do pedido/carrinho
- Informações do cliente (nome, email, telefone)
- Itens do carrinho/pedido
- Status e datas
- Dados de entrega e rastreamento
- Link para checkout (em carrinhos abandonados)
- Origem e identificador único

## 🛠️ Tecnologias

- **Node.js** + **Express**
- **Axios** para requisições HTTP
- **Vercel** para hospedagem serverless
- **Vercel Cron** para execução periódica

## 📦 Estrutura do Projeto

```
neese/
├── index.js                          # Servidor Express principal
├── package.json
├── vercel.json                       # Configuração Vercel + Cron
├── .env.example                      # Exemplo de variáveis
├── src/
│   ├── config/
│   │   └── index.js                 # Configurações centralizadas
│   ├── services/
│   │   ├── magazord.service.js      # Integração API Magazord
│   │   ├── ghl.service.js           # Envio para GoHighLevel
│   │   └── transformer.service.js   # Transformação de dados
│   ├── controllers/
│   │   └── sync.controller.js       # Lógica de sincronização
│   └── routes/
│       ├── cron.route.js            # Endpoint do Cron
│       └── webhook.route.js         # Webhook Magazord
```

## 🚀 Instalação e Deploy

### 1. Clonar o Repositório

```bash
git clone [URL_DO_REPOSITORIO]
cd neese
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais (já estão preenchidas):

```env
MAGAZORD_API_URL=https://danajalecos.painel.magazord.com.br/api
MAGAZORD_USER=MZDKe610ed8d77404c8ebe37b79a35b579a5e4e85682c15d6bd89f30d5852757
MAGAZORD_PASSWORD=o#W51myRIS@j
GHL_WEBHOOK_URL=https://services.leadconnectorhq.com/hooks/scD4yzuj3zsDsqfrgvtZ/webhook-trigger/b6fd6bb0-15ef-4af5-af2b-3122b92376b6
SYNC_INTERVAL=20
PORT=3000
```

### 4. Testar Localmente

```bash
npm start
```

Acesse: `http://localhost:3000`

### 5. Deploy no Vercel

#### Opção A: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

#### Opção B: Via GitHub

1. Faça push para GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Acesse [vercel.com](https://vercel.com)
3. Clique em "Import Project"
4. Selecione o repositório `neese`
5. Configure as variáveis de ambiente no painel da Vercel
6. Deploy!

### 6. Configurar Variáveis no Vercel

No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

- `MAGAZORD_API_URL`
- `MAGAZORD_USER`
- `MAGAZORD_PASSWORD`
- `GHL_WEBHOOK_URL`
- `SYNC_INTERVAL`

## 📡 Endpoints

### 1. Cron Job (Automático)
```
GET /api/cron
```
- Executado automaticamente a cada 20 minutos pelo Vercel Cron
- Busca novos eventos no Magazord
- Envia para GHL

### 2. Sincronização Manual
```
POST /api/cron/manual
```
- Executa sincronização manualmente
- Útil para testes

### 3. Webhook Magazord
```
POST /api/webhook/magazord
```
- Recebe notificações em tempo real do Magazord
- Processa e envia para GHL imediatamente

### 4. Health Check
```
GET /health
GET /api/webhook/health
```
- Verifica se o sistema está online

### 5. Home
```
GET /
```
- Informações sobre o sistema e endpoints

## 🔍 Monitoramento

### Logs no Vercel

Acesse o painel da Vercel e vá em **Logs** para ver:
- Execuções do Cron
- Eventos processados
- Erros e avisos

### Testar Manualmente

```bash
# Via curl
curl -X POST https://seu-projeto.vercel.app/api/cron/manual

# Via navegador
https://seu-projeto.vercel.app/api/cron/manual
```

## ❓ Perguntas Frequentes

### 1. **O Magazord fornece dados de rastreamento/frete?**

**Sim!** O Magazord disponibiliza:
- Código de rastreamento
- Transportadora
- Link de rastreamento
- Previsão de entrega
- Data de postagem
- Eventos de rastreamento (histórico)

O sistema já está preparado para capturar e enviar esses dados ao GHL através do endpoint:
```
GET /api/pedidos/{pedidoId}/rastreamento
```

### 2. **Como funciona a notificação de mudança de status?**

O sistema captura mudanças de status do pedido:
- **Pendente** (1)
- **Em Processamento** (2)
- **Enviado** (3)
- **Aprovado** (4)
- **Cancelado** (5)
- **Aguardando Pagamento** (6)

A cada mudança, os dados são enviados ao GHL com `tipo_evento: "pedido_status_atualizado"`.

### 3. **Como o GHL vai criar o link de checkout para carrinho abandonado?**

O sistema envia no campo `carrinho.link_checkout` o link direto para recuperação do carrinho. O GHL pode usar esse link no botão "Clique aqui e compre".

### 4. **Quanto tempo o sistema guarda os eventos processados?**

O cache é limpo automaticamente quando atinge 1000 eventos, evitando duplicatas mas mantendo o sistema leve.

## 🐛 Troubleshooting

### Cron não está executando

1. Verifique no painel Vercel se o Cron está habilitado
2. Confira os logs em **Vercel > Logs**
3. Teste manualmente: `POST /api/cron/manual`

### Erro de autenticação Magazord

- Verifique as credenciais no `.env` ou nas variáveis da Vercel
- Teste diretamente a API do Magazord

### Eventos não chegam no GHL

1. Verifique a URL do webhook GHL
2. Teste manualmente com Postman/Insomnia
3. Confira os logs para ver se há erros de envio

## 📞 Suporte

Para dúvidas sobre:
- **API Magazord**: Consulte a documentação oficial do Magazord
- **GoHighLevel**: Consulte a documentação do GHL
- **Este sistema**: Verifique os logs e ajuste conforme necessário

## 📄 Licença

ISC

---

**Desenvolvido para automação de e-commerce** 🛍️
