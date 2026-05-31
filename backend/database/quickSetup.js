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
  console.error("❌ Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeSQL(sql) {
  try {
    // Try using the REST API with a direct POST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function setupTables() {
  console.log("🔍 Attempting to create database tables...\n");

  const tables = [
    {
      name: "users",
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT,
        status TEXT,
        department_id TEXT REFERENCES departments(id),
        avatar TEXT,
        created_at TEXT
      );`
    },
    {
      name: "documents",
      sql: `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_type TEXT,
        storage_path TEXT,
        uploader_id TEXT REFERENCES users(id),
        department_id TEXT REFERENCES departments(id),
        status TEXT,
        created_at TEXT
      );`
    },
    {
      name: "document_chunks",
      sql: `CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        embedding TEXT
      );`
    },
    {
      name: "bookmarks",
      sql: `CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        created_at TEXT
      );`
    },
    {
      name: "analytics",
      sql: `CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY,
        document_id TEXT REFERENCES documents(id),
        action_type TEXT,
        query TEXT,
        timestamp TEXT
      );`
    }
  ];

  for (const table of tables) {
    const executed = await executeSQL(table.sql);
    if (executed) {
      console.log(`✅ ${table.name}`);
    } else {
      console.log(`⚠️  ${table.name} - RPC not available`);
    }
  }

  console.log("\n📌 Note: If tables couldn't be created via this method,");
  console.log("please use the Supabase Dashboard SQL Editor:");
  console.log("1. Go to https://app.supabase.com");
  console.log("2. Select CMA-2 project");
  console.log("3. Go to SQL Editor → New Query");
  console.log("4. Paste content from SUPABASE_SCHEMA.sql");
  console.log("5. Click Run\n");
}

setupTables();
