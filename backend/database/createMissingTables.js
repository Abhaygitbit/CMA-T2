import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try using fetch to execute SQL via Supabase's internal endpoints
async function createAllTables() {
  console.log("🔍 Creating missing tables in Supabase...\n");
  
  // First, try to check which tables exist
  const checkTables = async (tableNames) => {
    const existing = [];
    for (const table of tableNames) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      
      if (!error || error.code !== 'PGRST116') {
        existing.push(table);
      }
    }
    return existing;
  };

  const allTables = ["departments", "users", "documents", "document_chunks", "bookmarks", "analytics"];
  const existingTables = await checkTables(allTables);
  const missingTables = allTables.filter(t => !existingTables.includes(t));

  console.log(`✅ Existing tables: ${existingTables.join(", ") || "none"}`);
  console.log(`❌ Missing tables: ${missingTables.join(", ") || "none"}\n`);

  if (missingTables.length === 0) {
    console.log("✅ All tables exist!");
    return true;
  }

  console.log("📝 To create the missing tables, please:");
  console.log("1. Go to https://app.supabase.com");
  console.log("2. Select the CMA-2 project");
  console.log("3. Go to SQL Editor → New Query");
  console.log("4. Copy and paste the SQL from SUPABASE_SCHEMA.sql");
  console.log("5. Click Run\n");
  
  console.log("Or run this SQL directly:\n");
  
  const SQL = `
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
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
  ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
  ALTER TABLE analytics DISABLE ROW LEVEL SECURITY;
  `;

  console.log(SQL);
  return false;
}

createAllTables();
