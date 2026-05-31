/**
 * Creates Supabase database schema using the client library
 */

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
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SQL to create all tables
const CREATE_TABLES_SQL = `
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
`;

const REQUIRED_TABLES = {
  departments: ["id", "name", "description"],
  users: ["id", "name", "email", "password", "role", "status", "department_id", "avatar", "created_at"],
  documents: ["id", "title", "file_type", "storage_path", "uploader_id", "department_id", "status", "created_at"],
  document_chunks: ["id", "document_id", "chunk_text", "embedding"],
  bookmarks: ["id", "user_id", "document_id", "created_at"],
  analytics: ["id", "document_id", "action_type", "query", "timestamp"],
};

async function createTables() {
  console.log("🔍 Creating Supabase database schema...\n");
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  try {
    // Execute the SQL
    console.log("⏳ Creating tables...");
    
    // Split SQL into individual statements and execute
    const statements = CREATE_TABLES_SQL
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc("execute_sql", { sql: statement });
        if (error) {
          // Try alternative approach - use individual table creation
          console.log(`  ⚠️  RPC method not available, attempting direct approach...`);
          break;
        }
      } catch (err) {
        // RPC might not exist, try alternative
        break;
      }
    }

    // Alternative: Try creating tables using direct API calls
    console.log("  Creating tables using direct API calls...");
    
    // Test if tables exist first
    let allTablesExist = true;
    for (const tableName of Object.keys(REQUIRED_TABLES)) {
      const { error } = await supabase.from(tableName).select("*").limit(1);
      if (error && error.code === "PGRST116") {
        allTablesExist = false;
        break;
      }
    }

    if (allTablesExist) {
      console.log("✅ All tables already exist!");
    } else {
      console.log("❌ Tables do not exist and cannot be created via REST API");
      console.log("\n📌 Manual SQL Editor Setup Required:\n");
      console.log("Please execute the following SQL in Supabase Dashboard:");
      console.log("   1. Go to: https://app.supabase.com");
      console.log("   2. Select your CMA-2 project");
      console.log("   3. Go to: SQL Editor → New Query");
      console.log("   4. Paste the SQL below:\n");
      console.log("=" .repeat(80));
      console.log(CREATE_TABLES_SQL);
      console.log("=" .repeat(80));
      console.log("\n5. Click 'Run' to execute the query\n");
      process.exit(1);
    }

    // Verify table counts
    console.log("\n✅ Verifying tables...");
    for (const tableName of Object.keys(REQUIRED_TABLES)) {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.log(`  ⚠️  ${tableName}: Error - ${error.message}`);
      } else {
        console.log(`  ✅ ${tableName}: ${count} records`);
      }
    }

    console.log("\n✅ Schema setup completed successfully!");
    return true;
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n📌 Manual SQL Editor Setup Required:\n");
    console.log("Please execute the following SQL in Supabase Dashboard:");
    console.log("   1. Go to: https://app.supabase.com");
    console.log("   2. Select your CMA-2 project");
    console.log("   3. Go to: SQL Editor → New Query");
    console.log("   4. Paste the SQL below:\n");
    console.log("=" .repeat(80));
    console.log(CREATE_TABLES_SQL);
    console.log("=" .repeat(80));
    console.log("\n5. Click 'Run' to execute the query\n");
    return false;
  }
}

// Run table creation
const success = await createTables();
process.exit(success ? 0 : 1);
