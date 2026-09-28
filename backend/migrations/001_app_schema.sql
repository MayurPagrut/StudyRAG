-- Application schema. Kept separate from the RAG tables (public.documents / public.chunks).
-- Idempotent: safe to run more than once.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS app.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT        NOT NULL,
  title           TEXT,
  subject         TEXT,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'uploading'
                  CHECK (status IN ('uploading', 'processing', 'ready', 'failed', 'deleting')),
  file_size       BIGINT      NOT NULL DEFAULT 0,
  page_count      INTEGER,
  uploaded_by     UUID        REFERENCES app.users(id) ON DELETE SET NULL,
  rag_document_id TEXT,       -- id of this document inside the RAG system (public.documents.id), set by ingestDocument()
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS documents_status_idx ON app.documents(status);
CREATE INDEX IF NOT EXISTS documents_rag_id_idx ON app.documents(rag_document_id);

CREATE TABLE IF NOT EXISTS app.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS conversations_user_idx ON app.conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS app.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES app.conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  sources         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON app.messages(conversation_id, created_at);

DROP TRIGGER IF EXISTS users_updated_at ON app.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON app.users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS documents_updated_at ON app.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON app.documents
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

DROP TRIGGER IF EXISTS conversations_updated_at ON app.conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON app.conversations
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
