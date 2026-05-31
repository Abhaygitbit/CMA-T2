#!/usr/bin/env python3
"""
Supabase Database Schema Setup
Connects directly to Supabase PostgreSQL and creates all required tables
"""

import os
import sys
import getpass
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("❌ Missing SUPABASE_URL in .env")
    sys.exit(1)

# Extract database connection info from Supabase URL
project_id = urlparse(SUPABASE_URL).netloc.split('.')[0]
db_host = f"{project_id}.db.supabase.co"
db_port = 5432
db_name = "postgres"
db_user = os.getenv("SUPABASE_DB_USER", "postgres")

# Try to get password from environment, otherwise prompt
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD")
if not DB_PASSWORD:
    print("📝 Supabase Database Password Required")
    print(f"   Host: {db_host}")
    print(f"   Database: {db_name}")
    print(f"   User: {db_user}")
    print()
    DB_PASSWORD = getpass.getpass("Enter your Supabase database password: ")
    
    if not DB_PASSWORD:
        print("❌ Password required to proceed")
        sys.exit(1)

# SQL to create all tables
CREATE_TABLES_SQL = """
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
  created_at TEXT
);

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

-- Create document_chunks table
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding TEXT
);

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

-- Disable RLS for testing
ALTER TABLE IF EXISTS departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS analytics DISABLE ROW LEVEL SECURITY;
"""

def create_tables():
    print("🔍 Setting up Supabase database schema...\n")
    print(f"📡 Connecting to: {db_host}\n")
    
    try:
        # Connect to Supabase PostgreSQL database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=DB_PASSWORD,
            sslmode="require"
        )
        
        cursor = conn.cursor()
        
        # Execute all SQL statements
        print("⏳ Creating tables...\n")
        
        # Split and execute each statement
        statements = CREATE_TABLES_SQL.split(';')
        table_count = 0
        for i, statement in enumerate(statements):
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.split('CREATE TABLE IF NOT EXISTS')[1].split('(')[0].strip()
                        print(f"  ✅ Created table: {table_name}")
                        table_count += 1
                    elif 'ALTER TABLE' in statement.upper() and 'DISABLE' in statement.upper():
                        table_name = statement.split('ALTER TABLE IF EXISTS')[1].split('DISABLE')[0].strip()
                        print(f"  ✅ Disabled RLS on: {table_name}")
                except psycopg2.Error as e:
                    print(f"  ⚠️  Error in statement: {e}")
        
        conn.commit()
        
        # Verify tables were created
        print("\n📊 Verifying tables...\n")
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        if tables:
            print(f"  Found {len(tables)} tables:")
            for table in tables:
                print(f"    ✅ {table[0]}")
        
        cursor.close()
        conn.close()
        
        print(f"\n✅ Schema setup completed! {table_count} tables created.")
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Connection error: {e}")
        print("\n📌 Could not connect to Supabase database directly.")
        print("   This is normal if you don't have the admin credentials.")
        print("\n   ALTERNATIVE: Use the Supabase Dashboard:")
        print("   1. Go to: https://app.supabase.com")
        print("   2. Select your CMA-2 project")
        print("   3. Go to: SQL Editor → New Query")
        print("   4. Open and copy SUPABASE_SCHEMA.sql")
        print("   5. Paste and run in the SQL Editor")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1)
