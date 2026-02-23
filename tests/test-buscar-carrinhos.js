/**
 * TESTE SIMPLES - Validar busca de carrinhos
 */

import axios from 'axios';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const magazordService = {
  apiUrl: envVars.MAGAZORD_API_URL,
  auth: {
    username: envVars.MAGAZORD_USER,
    password: envVars.MAGAZORD_PASSWORD
  }
};

async function testarBuscaCarrinhos() {
  console.log('\n🧪 TESTE: Busca de Carrinhos\n');
  
  // Tentar diferentes formatos de data
  const formatos = [
    {
      nome: 'ISO com espaço',
      inicio: '2026-02-23 00:00:00',
      fim: '2026-02-23 23:59:59'
    },
    {
      nome: 'ISO sem segundos',
      inicio: '2026-02-23 00:00',
      fim: '2026-02-23 23:59'
    },
    {
      nome: 'Formato BR com espaço',
      inicio: '23/02/2026 00:00:00',
      fim: '23/02/2026 23:59:59'
    },
    {
      nome: 'Sem parâmetros de data',
      inicio: null,
      fim: null
    }
  ];
  
  for (const formato of formatos) {
    console.log(`\n📅 Testando formato: ${formato.nome}`);
    console.log(`   Início: ${formato.inicio || 'N/A'}`);
    console.log(`   Fim: ${formato.fim || 'N/A'}`);
    
    try {
      const params = { limit: 5 };
      if (formato.inicio) {
        params.dataAtualizacaoInicio = formato.inicio;
        params.dataAtualizacaoFim = formato.fim;
      }
      
      const response = await axios.get(`${magazordService.apiUrl}/v2/site/carrinho`, {
        auth: magazordService.auth,
        params
      });
      
      const carrinhos = response.data?.data?.items || [];
      console.log(`   ✅ SUCESSO! Encontrados ${carrinhos.length} carrinhos`);
      
      if (carrinhos.length > 0) {
        const primeiro = carrinhos[0];
        console.log(`\n   📦 Primeiro carrinho:`);
        console.log(`      ID: ${primeiro.id}`);
        console.log(`      Status: ${primeiro.status}`);
        console.log(`      Hash: ${primeiro.hash || 'N/A'}`);
        console.log(`      Pedido: ${primeiro.pedido ? `ID ${primeiro.pedido.id}` : 'SEM PEDIDO'}`);
      }
      
      break; // Se funcionou, para aqui
      
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`   Mensagem:`, JSON.stringify(error.response.data, null, 6));
      }
    }
  }
}

testarBuscaCarrinhos();
