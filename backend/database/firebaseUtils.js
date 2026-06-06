// backend/database/firebaseUtils.js
// Firebase completely removed. Function name kept for compatibility.
import { uploadToSupabase } from '../api/storage.js';

export async function uploadToFirebase(buffer, originalName, mimeType) {
  // Routes directly to Supabase — no Firebase, no local fallback
  const result = await uploadToSupabase(buffer, originalName, mimeType);
  return result;
}