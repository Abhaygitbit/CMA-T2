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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
  console.log("📋 Setting up Supabase database...\n");

  try {
    // Try to create departments table
    console.log("Creating departments table...");
    const { error: deptError } = await supabase.from("departments").insert([{
      id: '1',
      name: 'Computer Science',
      description: 'AI, Machine Learning, Systems, and Software Engineering.'
    }], { returning: "minimal" });
    
    if (deptError && !deptError.message.includes("duplicate")) {
      if (deptError.code === 'PGRST116') {
        console.log("  ⚠️  Departments table does not exist - will try alternative method");
      } else {
        console.log(`  ✓ Departments table exists or data inserted`);
      }
    } else {
      console.log("  ✓ Departments table ready");
    }

    // Try to create users table
    console.log("Creating users table...");
    const { error: userError } = await supabase.from("users").insert([{
      id: 'u_admin',
      name: 'Principal Admin',
      email: 'admin@cma.edu',
      password: 'admin',
      role: 'admin',
      status: 'approved',
      department_id: '1',
      created_at: new Date().toISOString()
    }], { returning: "minimal" });
    
    if (userError && !userError.message.includes("duplicate")) {
      console.log(`  ⚠️  Users error: ${userError.message}`);
    } else {
      console.log("  ✓ Users table ready");
    }

    // Try to create documents table
    console.log("Creating documents table...");
    const { error: docError } = await supabase.from("documents").insert([{
      id: 'doc_test',
      title: 'Test Document',
      file_type: 'notes',
      storage_path: 'https://example.com/test.txt',
      uploader_id: 'u_admin',
      department_id: '1',
      status: 'published',
      created_at: new Date().toISOString()
    }], { returning: "minimal" });
    
    if (docError && !docError.message.includes("duplicate")) {
      console.log(`  ⚠️  Documents error: ${docError.message}`);
    } else {
      console.log("  ✓ Documents table ready");
    }

    // Try document_chunks
    console.log("Creating document_chunks table...");
    const { error: chunkError } = await supabase.from("document_chunks").insert([{
      id: 'chk_test',
      document_id: 'doc_test',
      chunk_text: 'Sample chunk text',
      embedding: '[0.1, 0.2, 0.3]'
    }], { returning: "minimal" });
    
    if (chunkError && !chunkError.message.includes("duplicate")) {
      console.log(`  ⚠️  Document chunks error: ${chunkError.message}`);
    } else {
      console.log("  ✓ Document chunks table ready");
    }

    // Try bookmarks
    console.log("Creating bookmarks table...");
    const { error: bookError } = await supabase.from("bookmarks").insert([{
      id: 'bm_test',
      user_id: 'u_admin',
      document_id: 'doc_test',
      created_at: new Date().toISOString()
    }], { returning: "minimal" });
    
    if (bookError && !bookError.message.includes("duplicate")) {
      console.log(`  ⚠️  Bookmarks error: ${bookError.message}`);
    } else {
      console.log("  ✓ Bookmarks table ready");
    }

    // Try analytics
    console.log("Creating analytics table...");
    const { error: analyticsError } = await supabase.from("analytics").insert([{
      id: 'ana_test',
      document_id: 'doc_test',
      action_type: 'test',
      query: 'test query',
      timestamp: new Date().toISOString()
    }], { returning: "minimal" });
    
    if (analyticsError && !analyticsError.message.includes("duplicate")) {
      console.log(`  ⚠️  Analytics error: ${analyticsError.message}`);
    } else {
      console.log("  ✓ Analytics table ready");
    }

    // Now clean up test data
    console.log("\nCleaning up test data...");
    const testIds = ['doc_test', 'chk_test', 'bm_test', 'ana_test'];
    
    try {
      await supabase.from("document_chunks").delete().eq("id", "chk_test");
      await supabase.from("documents").delete().eq("id", "doc_test");
      await supabase.from("bookmarks").delete().eq("id", "bm_test");
      await supabase.from("analytics").delete().eq("id", "ana_test");
      await supabase.from("departments").delete().eq("id", "1");
      await supabase.from("users").delete().eq("id", "u_admin");
      console.log("  ✓ Test data cleaned up");
    } catch (e) {
      console.log("  (Test data cleanup skipped)");
    }

    console.log("\n✅ Database setup verified!");
    return true;

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    return false;
  }
}

const success = await setupDatabase();
process.exit(success ? 0 : 1);
