-- ============================================
-- SCHEMA DO BANCO SUPABASE - PROJETO NEESE
-- Sistema de sincronização Magazord -> GHL
-- ============================================

-- Tabela para rastrear eventos processados (evitar duplicatas)
CREATE TABLE IF NOT EXISTS eventos_processados (
  id BIGSERIAL PRIMARY KEY,
  identificador VARCHAR(255) UNIQUE NOT NULL,
  tipo_evento VARCHAR(50) NOT NULL, -- ABERTO, CHECKOUT, CONVERTIDO, ABANDONADO, PEDIDO_APROVADO, etc
  carrinho_id INTEGER,
  pedido_id INTEGER,
  cliente_id INTEGER,
  dados_evento JSONB NOT NULL, -- Armazena dados completos do evento
  processado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enviado_ghl BOOLEAN DEFAULT FALSE,
  ghl_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_eventos_identificador ON eventos_processados(identificador);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_processados(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_processado_em ON eventos_processados(processado_em);
CREATE INDEX IF NOT EXISTS idx_eventos_carrinho_id ON eventos_processados(carrinho_id);
CREATE INDEX IF NOT EXISTS idx_eventos_pedido_id ON eventos_processados(pedido_id);

-- Tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  tipo_sync VARCHAR(50) NOT NULL, -- cron_auto, webhook, manual
  inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fim TIMESTAMP WITH TIME ZONE,
  duracao_ms INTEGER,
  eventos_encontrados INTEGER DEFAULT 0,
  eventos_processados INTEGER DEFAULT 0,
  eventos_enviados INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'em_progresso', -- em_progresso, sucesso, erro
  erro TEXT,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- Tabela de configurações (para armazenar última execução, etc)
CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(100) PRIMARY KEY,
  valor JSONB NOT NULL,
  descricao TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração inicial
INSERT INTO configuracoes (chave, valor, descricao) 
VALUES 
  ('ultima_execucao_cron', '{"timestamp": null, "status": null}'::jsonb, 'Última execução do cron automático'),
  ('estatisticas', '{"total_eventos": 0, "total_envios": 0}'::jsonb, 'Estatísticas gerais do sistema')
ON CONFLICT (chave) DO NOTHING;

-- Função para limpar eventos antigos (mais de 30 dias)
CREATE OR REPLACE FUNCTION limpar_eventos_antigos()
RETURNS INTEGER AS $$
DECLARE
  eventos_deletados INTEGER;
BEGIN
  DELETE FROM eventos_processados 
  WHERE processado_em < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS eventos_deletados = ROW_COUNT;
  
  RETURN eventos_deletados;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar logs antigos (mais de 7 dias)
CREATE OR REPLACE FUNCTION limpar_logs_antigos()
RETURNS INTEGER AS $$
DECLARE
  logs_deletados INTEGER;
BEGIN
  DELETE FROM sync_logs 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS logs_deletados = ROW_COUNT;
  
  RETURN logs_deletados;
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas rápidas
CREATE OR REPLACE VIEW estatisticas_sync AS
SELECT 
  COUNT(*) FILTER (WHERE processado_em > NOW() - INTERVAL '1 hour') as eventos_ultima_hora,
  COUNT(*) FILTER (WHERE processado_em > NOW() - INTERVAL '24 hours') as eventos_ultimo_dia,
  COUNT(*) FILTER (WHERE processado_em > NOW() - INTERVAL '7 days') as eventos_ultima_semana,
  COUNT(*) FILTER (WHERE enviado_ghl = true) as total_enviados_ghl,
  COUNT(*) FILTER (WHERE enviado_ghl = false) as total_pendentes_ghl,
  COUNT(DISTINCT tipo_evento) as tipos_eventos_unicos
FROM eventos_processados;

-- Comentários para documentação
COMMENT ON TABLE eventos_processados IS 'Rastreamento de eventos processados do Magazord para evitar duplicatas';
COMMENT ON TABLE sync_logs IS 'Logs de execução das sincronizações automáticas e manuais';
COMMENT ON TABLE configuracoes IS 'Configurações gerais do sistema';
COMMENT ON FUNCTION limpar_eventos_antigos() IS 'Remove eventos processados com mais de 30 dias';
COMMENT ON FUNCTION limpar_logs_antigos() IS 'Remove logs com mais de 7 dias';

-- ============================================
-- PERMISSÕES (ajustar conforme necessário)
-- ============================================

-- Para permitir que a edge function acesse as tabelas
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
