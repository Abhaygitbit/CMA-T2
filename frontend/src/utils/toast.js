// Simple toast notifications (no external library)
export function showToast(message, type = 'info') {
  // Console log for debugging
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Show in browser alert for now
  if (type === 'error') {
    alert(`❌ Error: ${message}`);
  } else if (type === 'success') {
    alert(`✅ Success: ${message}`);
  } else if (type === 'warning') {
    alert(`⚠️ Warning: ${message}`);
  } else {
    alert(`ℹ️ Info: ${message}`);
  }
}
