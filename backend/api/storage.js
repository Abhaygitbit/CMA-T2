// backend/api/storage.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[storage.js] SUPABASE_URL:', SUPABASE_URL || '❌ MISSING');
console.log('[storage.js] SERVICE KEY LOADED:', !!SERVICE_ROLE_KEY);

if (!SUPABASE_URL) {
  throw new Error('[storage.js] SUPABASE_URL is missing from .env');
}
if (!SERVICE_ROLE_KEY) {
  throw new Error(
    '[storage.js] SUPABASE_SERVICE_ROLE_KEY is missing — ' +
    'this causes "signature verification failed". ' +
    'You must use the service_role key, NOT the anon key.'
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = 'cmabucketsupabase';
const FOLDER = 'documents';

export async function uploadToSupabase(buffer, originalName, mimeType) {
  if (!buffer || buffer.length === 0) {
    throw new Error('[uploadToSupabase] Empty file buffer received.');
  }

  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${safeName}`;
  const filePath = `${FOLDER}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('[uploadToSupabase] Could not get public URL after upload.');
  }

  console.log(`[storage.js] ✓ Uploaded to Supabase: ${filePath}`);
  console.log(`[storage.js] ✓ Public URL: ${urlData.publicUrl}`);

  return {
    publicUrl: urlData.publicUrl,
    path: filePath,
  };
}