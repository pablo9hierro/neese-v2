/**
 * Test script - Estrutura de Carrinho
 * Verifica estrutura completa dos carrinhos retornados pela API
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

console.log('🔍 ENV Loaded:');
console.log('  API_URL:', envVars.MAGAZORD_API_URL ? 'OK' : 'MISSING');
console.log('  USER:', envVars.MAGAZORD_USER ? 'OK' : 'MISSING');
console.log('  PASSWORD:', envVars.MAGAZORD_PASSWORD ? 'OK' : 'MISSING');

const magazordService = {
  apiUrl: envVars.MAGAZORD_API_URL,
  auth: {
    username: envVars.MAGAZORD_USER,
    password: envVars.MAGAZORD_PASSWORD
  }
};

async function testarEstruturaCarrinho() {
  try {
    console.log('\n🧪 TESTE: Estrutura de Carrinho\n');
    console.log('='.repeat(80));
    
    // Buscar carrinhos das últimas 24 horas
    const dataFim = new Date();
    const dataInicio = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const dataInicioStr = dataInicio.toISOString().split('.')[0].replace('T', ' ');
    const dataFimStr = dataFim.toISOString().split('.')[0].replace('T', ' ');
    
    console.log(`📅 Período: ${dataInicioStr} → ${dataFimStr}\n`);
    
    const response = await axios.get(`${magazordService.apiUrl}/v2/site/carrinho`, {
      auth: magazordService.auth,
      params: {
        dataAtualizacaoInicio: dataInicioStr,
        dataAtualizacaoFim: dataFimStr,
        status: 2, // Abandonados
        limit: 5
      }
    });
    
    const carrinhos = response.data?.data?.items || [];
    console.log(`📦 Encontrados ${carrinhos.length} carrinhos abandonados\n`);
    
    for (const carrinho of carrinhos) {
      console.log('─'.repeat(80));
      console.log(`\n🛒 CARRINHO ID: ${carrinho.id}`);
      console.log(`   Status: ${carrinho.status}`);
      console.log(`   Hash: ${carrinho.hash || 'N/A'}`);
      console.log(`   Data Início: ${carrinho.dataInicio}`);
      console.log(`   Data Atualização: ${carrinho.dataAtualizacao}`);
      console.log(`   Pedido: ${carrinho.pedido ? JSON.stringify(carrinho.pedido) : 'NÃO TEM'}`);
      
      if (carrinho.draft) {
        console.log(`\n   📋 DRAFT (dados parciais):`);
        console.log(JSON.stringify(carrinho.draft, null, 6));
        
        // Tentar extrair dados de contato do draft
        if (carrinho.draft.email) {
          console.log(`   ✅ Email no draft: ${carrinho.draft.email}`);
        }
        
        if (carrinho.draft['pessoa-fisica']) {
          const pf = carrinho.draft['pessoa-fisica'];
          console.log(`\n   👤 Pessoa Física:`);
          console.log(`      Nome: ${pf['nome-completo'] || 'N/A'}`);
          console.log(`      Email: ${pf.email || 'N/A'}`);
          console.log(`      Celular: ${pf.celular || 'N/A'}`);
          console.log(`      Telefone: ${pf.telefone || 'N/A'}`);
          console.log(`      CPF: ${pf.cpf || 'N/A'}`);
        }
        
        if (carrinho.draft['pessoa-juridica']) {
          const pj = carrinho.draft['pessoa-juridica'];
          console.log(`\n   🏢 Pessoa Jurídica:`);
          console.log(`      Nome: ${pj['nome-fantasia'] || 'N/A'}`);
          console.log(`      Email: ${pj.email || 'N/A'}`);
          console.log(`      Celular: ${pj.celular || 'N/A'}`);
          console.log(`      Telefone: ${pj.telefone || 'N/A'}`);
          console.log(`      CNPJ: ${pj.cnpj || 'N/A'}`);
        }
      } else {
        console.log(`\n   ❌ SEM DRAFT`);
      }
      
      console.log('\n');
    }
    
    console.log('='.repeat(80));
    console.log('\n✅ Teste concluído\n');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testarEstruturaCarrinho();
