/**
 * Test script - Carrinho por ID
 * Verifica se buscar carrinho por ID retorna mais dados
 */

import axios from 'axios';
import { readFileSync } from 'fs';

// Lê .env manualmente
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

async function testarCarrinhoPorId() {
  try {
    console.log('\n🧪 TESTE: Carrinho por ID\n');
    console.log('='.repeat(80));
    
    const carrinhoId = 10061; // ID do primeiro carrinho do teste anterior
    
    console.log(`📦 Buscando carrinho ID ${carrinhoId} via /v2/site/carrinho/${carrinhoId}\n`);
    
    const response = await axios.get(`${magazordService.apiUrl}/v2/site/carrinho/${carrinhoId}`, {
      auth: magazordService.auth
    });
    
    const carrinho = response.data?.data || response.data;
    
    console.log('📋 ESTRUTURA COMPLETA DO CARRINHO:');
    console.log(JSON.stringify(carrinho, null, 2));
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Teste concluído\n');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testarCarrinhoPorId();
