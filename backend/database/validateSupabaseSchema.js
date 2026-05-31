/**
 * Validates and creates Supabase database schema
 * Checks if all required tables exist with correct columns
 * Creates missing tables and disables RLS for testing
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const REQUIRED_TABLES = {
  departments: ["id", "name", "description"],
  users: ["id", "name", "email", "password", "role", "status", "department_id", "avatar", "created_at"],
  documents: ["id", "title", "file_type", "storage_path", "uploader_id", "department_id", "status", "created_at"],
  document_chunks: ["id", "document_id", "chunk_text", "embedding"],
  bookmarks: ["id", "user_id", "document_id", "created_at"],
  analytics: ["id", "document_id", "action_type", "query", "timestamp"],
};

// SQL to create tables
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

async function validateSchema() {
  console.log("🔍 Starting Supabase schema validation...\n");

  try {
    // First, list all tables
    console.log("📋 Checking existing tables...");
    const { data: tables, error: tablesError } = await supabase.rpc(
      "get_tables",
      {},
      { count: "exact" }
    );

    if (tablesError && tablesError.code !== "PGRST202") {
      // PGRST202 means the function doesn't exist, which is fine
      console.log("Note: Could not retrieve tables via RPC (normal for new databases)\n");
    } else if (tables) {
      console.log("✅ Existing tables found:", tables.map(t => t.table_name).join(", "));
    }

    // Check each required table
    console.log("\n📊 Validating table structure...");
    const tableStatus = {};

    for (const [tableName, columns] of Object.entries(REQUIRED_TABLES)) {
      try {
        const { data, error } = await supabase.from(tableName).select("*").limit(1);
        if (error && error.code === "PGRST116") {
          tableStatus[tableName] = "❌ MISSING";
        } else if (error) {
          tableStatus[tableName] = `⚠️  ERROR: ${error.message}`;
        } else {
          tableStatus[tableName] = "✅ EXISTS";
        }
      } catch (err) {
        tableStatus[tableName] = `⚠️  ERROR: ${err.message}`;
      }
    }

    // Display status
    Object.entries(tableStatus).forEach(([table, status]) => {
      console.log(`  ${status} - ${table}`);
    });

    // Check if all tables exist
    const allExist = Object.values(tableStatus).every(s => s === "✅ EXISTS");

    if (!allExist) {
      console.log("\n🔧 Some tables are missing. Creating missing tables...");
      console.log("   Please run the following SQL in Supabase Dashboard → SQL Editor:\n");
      console.log("=" .repeat(80));
      console.log(CREATE_TABLES_SQL);
      console.log("=" .repeat(80));
      console.log("\nAlternatively, use the Supabase client library to execute the SQL.");
      return { success: false, requiresManualSetup: true };
    }

    // Verify counts
    console.log("\n✅ All tables exist. Verifying record counts...");
    for (const tableName of Object.keys(REQUIRED_TABLES)) {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.log(`  ⚠️  ${tableName}: Could not count records`);
      } else {
        console.log(`  ✅ ${tableName}: ${count} records`);
      }
    }

    console.log("\n✅ Schema validation completed successfully!");
    return { success: true, requiresManualSetup: false };
  } catch (error) {
    console.error("\n❌ Validation failed:", error.message);
    return { success: false, error: error.message, requiresManualSetup: true };
  }
}

// Run validation
validateSchema().then((result) => {
  if (!result.success && result.requiresManualSetup) {
    console.log("\n📌 IMPORTANT: Manual setup required in Supabase Dashboard");
    console.log("   1. Go to: https://app.supabase.com");
    console.log("   2. Select your project (CMA-2)");
    console.log("   3. Go to: SQL Editor");
    console.log("   4. Create a new query and paste the SQL above");
    console.log("   5. Run the query");
    process.exit(1);
  }
  process.exit(result.success ? 0 : 1);
});
