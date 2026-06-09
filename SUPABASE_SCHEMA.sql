-- Supabase Database Schema for Campus Memory Assistant (CMA-2)
-- Now with pgvector for Semantic Search!

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT,
  status TEXT,
  department_id TEXT REFERENCES departments(id),
  avatar TEXT,
  phone TEXT,
  created_at TEXT
);

-- Add phone column to existing users table if it doesn't exist yet
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT,
  uploader_id TEXT REFERENCES users(id),
  department_id TEXT REFERENCES departments(id),
  status TEXT,
  created_at TEXT
);

-- Create document_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(384) -- BAAI/bge-small-en-v1.5 has 384 dimensions
);

-- Create HNSW index for fast vector search
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Create match_document_chunks RPC function
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  department_filter text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  document_id text,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_text,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  JOIN documents ON documents.id = document_chunks.document_id
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    AND (department_filter IS NULL OR documents.department_id = department_filter)
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  created_at TEXT
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  action_type TEXT,
  query TEXT,
  timestamp TEXT
);

-- Disable Row Level Security (RLS) for testing
ALTER TABLE IF EXISTS departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics DISABLE ROW LEVEL SECURITY;
