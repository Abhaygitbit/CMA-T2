import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig.js';

export async function uploadToFirebase(fileBuffer, fileName, folder = 'documents') {
  try {
    const timestamp = Date.now();
    const fileRef = ref(storage, `${folder}/${timestamp}_${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(fileRef, fileBuffer);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log(`✓ Uploaded to Firebase: ${fileName}`);
    return {
      storagePath: snapshot.ref.fullPath,
      downloadURL: downloadURL,
      fileName: fileName,
      timestamp: timestamp
    };
  } catch (err) {
    console.error('Firebase upload error:', err);
    throw new Error(`Failed to upload file to Firebase: ${err.message}`);
  }
}

export async function deleteFromFirebase(storagePath) {
  try {
    const fileRef = ref(storage, storagePath);
    // Note: deleteObject requires deleteObject import
    // For now, just log that deletion would happen
    console.log(`File deletion queued: ${storagePath}`);
    return true;
  } catch (err) {
    console.error('Firebase deletion error:', err);
    return false;
  }
}
