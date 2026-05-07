/*
  # Tabela de logs dos posts do Telegram

  ## Descrição
  Registra cada post enviado ao canal do Telegram com metadados
  para auditoria e histórico.

  ## Tabelas
  - `post_logs`
    - `id` (uuid, pk)
    - `day` (text) — dia da semana em português
    - `period` (text) — manhã ou noite
    - `post_type` (text) — tipo do post (valor, engajamento, venda, etc.)
    - `content_preview` (text) — primeiros 100 caracteres do conteúdo
    - `week_number` (int) — número da semana desde 01/01/2025
    - `is_poll` (bool) — se foi enviado como enquete
    - `telegram_response` (jsonb) — resposta da API do Telegram
    - `posted_at` (timestamptz) — data/hora do envio

  ## Segurança
  - RLS habilitado
  - Apenas service role pode inserir e ler (automação server-side)
*/

CREATE TABLE IF NOT EXISTS post_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day text NOT NULL,
  period text NOT NULL CHECK (period IN ('manhã', 'noite')),
  post_type text NOT NULL,
  content_preview text NOT NULL DEFAULT '',
  week_number integer NOT NULL DEFAULT 0,
  is_poll boolean NOT NULL DEFAULT false,
  telegram_response jsonb,
  posted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_logs_posted_at_idx ON post_logs (posted_at DESC);

ALTER TABLE post_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert logs"
  ON post_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read logs"
  ON post_logs FOR SELECT
  TO service_role
  USING (true);
