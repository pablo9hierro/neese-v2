// Supabase Edge Function - Cron Automático
// Chama a API Vercel a cada 15 minutos para sincronização

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERCEL_API_URL = Deno.env.get('VERCEL_API_URL') || 'https://seu-app.vercel.app'

serve(async (req) => {
  try {
    console.log('🚀 Iniciando sincronização automática via Supabase...')
    
    // Registra início da execução no Supabase
    const inicio = new Date()
    
    // Chama o endpoint do Vercel
    const response = await fetch(`${VERCEL_API_URL}/api/cron`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Cron/1.0',
        // Adiciona autenticação se necessário
        'X-Cron-Secret': Deno.env.get('CRON_SECRET') || '',
      },
    })

    const resultado = await response.json()
    const fim = new Date()
    const duracao = fim.getTime() - inicio.getTime()

    console.log('✅ Sincronização concluída:', {
      status: response.status,
      duracao_ms: duracao,
      resultado
    })

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status,
        duracao_ms: duracao,
        timestamp: fim.toISOString(),
        resultado
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
