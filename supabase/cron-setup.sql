-- ============================================
-- CONFIGURAÇÃO DO CRON NO SUPABASE
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Primeiro, habilite a extensão pg_cron (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cria uma função que chama a Edge Function do Supabase
CREATE OR REPLACE FUNCTION executar_sync_cron()
RETURNS void AS $$
DECLARE
  resultado TEXT;
BEGIN
  -- Registra início da execução
  INSERT INTO sync_logs (tipo_sync, status, detalhes)
  VALUES ('cron_auto', 'em_progresso', '{"inicio": "' || NOW() || '"}'::jsonb);

  -- Chama a edge function (ajuste a URL conforme necessário)
  -- A edge function então chamará o endpoint do Vercel
  SELECT content INTO resultado
  FROM http_get('https://gyxjuxmwnwyansfoabyv.supabase.co/functions/v1/sync-cron');
  
  -- Atualiza configuração de última execução
  UPDATE configuracoes 
  SET valor = jsonb_build_object('timestamp', NOW(), 'status', 'sucesso')
  WHERE chave = 'ultima_execucao_cron';
  
  RAISE NOTICE 'Cron executado com sucesso: %', resultado;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, registra no log
  UPDATE configuracoes 
  SET valor = jsonb_build_object('timestamp', NOW(), 'status', 'erro', 'mensagem', SQLERRM)
  WHERE chave = 'ultima_execucao_cron';
  
  RAISE WARNING 'Erro ao executar cron: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 3. Agenda o cron para executar a cada 15 minutos
-- Formato: (minuto hora dia mês dia_da_semana)
SELECT cron.schedule(
  'sync-magazord-ghl',        -- Nome do job
  '*/15 * * * *',              -- A cada 15 minutos
  $$SELECT executar_sync_cron()$$
);

-- 4. (OPCIONAL) Agenda limpeza de dados antigos diariamente às 3h da manhã
SELECT cron.schedule(
  'limpar-dados-antigos',
  '0 3 * * *',                 -- Diariamente às 3h
  $$
    SELECT limpar_eventos_antigos();
    SELECT limpar_logs_antigos();
  $$
);

-- ============================================
-- COMANDOS ÚTEIS PARA GERENCIAR CRON JOBS
-- ============================================

-- Ver todos os cron jobs agendados:
-- SELECT * FROM cron.job;

-- Desagendar um job:
-- SELECT cron.unschedule('sync-magazord-ghl');

-- Ver execuções recentes:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Forçar execução manual imediata (para teste):
-- SELECT executar_sync_cron();
