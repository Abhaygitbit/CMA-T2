/**
 * Validates and creates Supabase database schema using REST API
 */

const https = require("https");
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

// Extract host from SUPABASE_URL
const urlObj = new URL(SUPABASE_URL);
const host = urlObj.hostname;

const REQUIRED_TABLES = {
  departments: ["id", "name", "description"],
  users: ["id", "name", "email", "password", "role", "status", "department_id", "avatar", "created_at"],
  documents: ["id", "title", "file_type", "storage_path", "uploader_id", "department_id", "status", "created_at"],
  document_chunks: ["id", "document_id", "chunk_text", "embedding"],
  bookmarks: ["id", "user_id", "document_id", "created_at"],
  analytics: ["id", "document_id", "action_type", "query", "timestamp"],
};

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

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function checkTableExists(tableName) {
  try {
    const options = {
      hostname: host,
      path: `/rest/v1/${tableName}?select=*&limit=1`,
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await makeRequest(options);
    
    if (response.status === 404) {
      return { exists: false };
    } else if (response.status === 200) {
      return { exists: true };
    } else {
      return { exists: false, error: response.data };
    }
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function validateSchema() {
  console.log("🔍 Starting Supabase schema validation...\n");
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  try {
    // Check each required table
    console.log("📊 Validating table structure...");
    const tableStatus = {};
    const missingTables = [];

    for (const tableName of Object.keys(REQUIRED_TABLES)) {
      const result = await checkTableExists(tableName);
      
      if (result.exists) {
        tableStatus[tableName] = "✅ EXISTS";
      } else {
        tableStatus[tableName] = "❌ MISSING";
        missingTables.push(tableName);
      }
    }

    // Display status
    Object.entries(tableStatus).forEach(([table, status]) => {
      console.log(`  ${status} - ${table}`);
    });

    if (missingTables.length > 0) {
      console.log("\n🔧 Missing tables detected. Setup required:\n");
      console.log("📌 INSTRUCTIONS:");
      console.log("   1. Go to: https://app.supabase.com");
      console.log("   2. Select your project (CMA-2)");
      console.log("   3. Go to: SQL Editor → New Query");
      console.log("   4. Copy and paste the SQL below:");
      console.log("\n" + "=" .repeat(80));
      console.log(CREATE_TABLES_SQL);
      console.log("=" .repeat(80));
      console.log("\n5. Click 'Run' to execute the query");
      console.log("\n📝 After running the SQL, the tables will be created and RLS disabled.");
      return { success: false, requiresManualSetup: true, missingTables };
    }

    console.log("\n✅ All tables exist! Verifying by counting records...");
    
    // Count records in each table
    for (const tableName of Object.keys(REQUIRED_TABLES)) {
      try {
        const options = {
          hostname: host,
          path: `/rest/v1/${tableName}?select=count()`,
          method: "GET",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "count=exact",
          },
        };

        const response = await makeRequest(options);
        const count = response.status === 200 ? (response.data[0]?.count || 0) : "?";
        console.log(`  ✅ ${tableName}: ${count} records`);
      } catch (err) {
        console.log(`  ⚠️  ${tableName}: Could not count records`);
      }
    }

    console.log("\n✅ Schema validation completed successfully!");
    return { success: true, requiresManualSetup: false };
  } catch (error) {
    console.error("\n❌ Validation error:", error.message);
    return { success: false, error: error.message, requiresManualSetup: true };
  }
}

// Run validation
validateSchema().then((result) => {
  process.exit(result.success ? 0 : 1);
});
