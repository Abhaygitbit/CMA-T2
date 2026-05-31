-- Supabase Database Schema for Campus Memory Assistant (CMA-2)
-- This SQL file creates all required tables for the application
-- 
-- SETUP INSTRUCTIONS:
-- 1. Go to: https://app.supabase.com
-- 2. Select your CMA-2 project
-- 3. Go to: SQL Editor → New Query
-- 4. Copy and paste this entire SQL file
-- 5. Click "Run" to execute all statements
-- 6. Verify all tables are created successfully
--
-- EXPECTED TABLES:
-- - departments
-- - users
-- - documents
-- - document_chunks
-- - bookmarks
-- - analytics
--

-- Create departments table
-- Stores department information for the university
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Create users table
-- Stores user profile information including authentication details
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT,
  status TEXT,
  department_id TEXT REFERENCES departments(id),
  avatar TEXT,
  created_at TEXT
);

-- Create documents table
-- Stores metadata about uploaded documents
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

-- Create document_chunks table
-- Stores text chunks extracted from documents for RAG/searching
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding TEXT
);

-- Create bookmarks table
-- Stores user bookmarks for quick access to documents
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  created_at TEXT
);

-- Create analytics table
-- Stores analytics data about user interactions
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  action_type TEXT,
  query TEXT,
  timestamp TEXT
);

-- Disable Row Level Security (RLS) for testing
-- NOTE: In production, enable RLS with appropriate policies
ALTER TABLE IF EXISTS departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics DISABLE ROW LEVEL SECURITY;
