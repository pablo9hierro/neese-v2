// Supabase Edge Function - Cron Automático
// Chama a API Vercel a cada 15 minutos para sincronização

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const VERCEL_API_URL = Deno.env.get('VERCEL_API_URL') || 'https://neese-23vy.vercel.app'
const CRON_SECRET = Deno.env.get('CRON_SECRET') || ''

serve(async (req) => {
  try {
    console.log('🚀 Iniciando sincronização automática via Supabase...')
    console.log('📍 VERCEL_API_URL:', VERCEL_API_URL)
    
    // Registra início da execução
    const inicio = new Date()
    
    // Chama o endpoint do Vercel
    const vercelUrl = `${VERCEL_API_URL}/api/cron`
    console.log('📞 Chamando:', vercelUrl)
    
    const response = await fetch(vercelUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Cron/1.0',
        'X-Cron-Secret': CRON_SECRET,
      },
    })

    const fim = new Date()
    const duracao = fim.getTime() - inicio.getTime()
    
    let resultado
    try {
      resultado = await response.json()
    } catch (e) {
      resultado = { error: 'Resposta não é JSON', text: await response.text() }
    }

    console.log('✅ Sincronização concluída:', {
      status: response.status,
      duracao_ms: duracao,
      resultado
    })

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        duracao_ms: duracao,
        timestamp: fim.toISOString(),
        vercel_url: vercelUrl,
        resultado
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        vercel_url: VERCEL_API_URL
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200  // Retorna 200 mesmo com erro para não quebrar os crons
      }
    )
  }
})
