/**
 * Creates Supabase database schema using SQL API
 */

const https = require("https");
const path = require("path");

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

async function createTables() {
  console.log("🔍 Creating Supabase database schema...\n");
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  try {
    // Try to use the SQL API endpoint
    const sqlPayload = {
      query: CREATE_TABLES_SQL,
    };

    const options = {
      hostname: host,
      path: `/rest/v1/rpc/sql`,
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    };

    console.log("⏳ Attempting to create tables via SQL API...");
    const response = await makeRequest(options, sqlPayload);

    console.log(`Response Status: ${response.status}`);
    console.log("Response:", response.data);

    if (response.status >= 200 && response.status < 300) {
      console.log("\n✅ Tables created successfully!");
      return true;
    } else if (response.status === 404) {
      console.log("\n⚠️  SQL API endpoint not available via REST.");
      console.log("📌 MANUAL SETUP REQUIRED:\n");
      console.log("Please use the Supabase Dashboard SQL Editor:");
      console.log("   1. Go to: https://app.supabase.com");
      console.log("   2. Select your CMA-2 project");
      console.log("   3. Go to: SQL Editor → New Query");
      console.log("   4. Copy and paste the SQL below:");
      console.log("\n" + "=" .repeat(80));
      console.log(CREATE_TABLES_SQL);
      console.log("=" .repeat(80));
      console.log("\n5. Click 'Run' to execute the query");
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\n📌 MANUAL SETUP REQUIRED:\n");
    console.log("Please use the Supabase Dashboard SQL Editor:");
    console.log("   1. Go to: https://app.supabase.com");
    console.log("   2. Select your CMA-2 project");
    console.log("   3. Go to: SQL Editor → New Query");
    console.log("   4. Copy and paste the SQL below:");
    console.log("\n" + "=" .repeat(80));
    console.log(CREATE_TABLES_SQL);
    console.log("=" .repeat(80));
    console.log("\n5. Click 'Run' to execute the query");
    return false;
  }
}

// Run table creation
createTables().then((success) => {
  process.exit(success ? 0 : 1);
});
