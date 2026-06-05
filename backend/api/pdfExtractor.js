import pdf from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Extracts raw text from a document buffer (PDF, DOCX, or TXT)
 * @param {Buffer} buffer 
 * @param {string} filename 
 * @returns {Promise<string>} Raw text content
 */
export async function extractTextFromBuffer(buffer, filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  if (extension === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || '';
      
      // Validate extraction
      if (!text || text.trim().length < 10) {
        throw new Error('DOCX extraction produced empty or too short result');
      }
      return text;
    } catch (err) {
      console.error('Error parsing DOCX via Mammoth:', err);
      throw new Error(`DOCX text extraction failed: ${err.message}`);
    }
  } else if (extension === 'pdf') {
    try {
      const data = await pdf(buffer);
      const text = data.text || '';
      
      // Validate PDF extraction
      if (!text || text.trim().length < 10) {
        throw new Error('PDF extraction produced empty or too short result');
      }
      
      // Check if text looks valid (not mostly garbage characters)
      const validChars = text.match(/[a-zA-Z0-9\s:.,;'"()\-]/g) || [];
      const validRatio = validChars.length / text.length;
      
      if (validRatio < 0.5) {
        console.warn(`PDF text quality is low (${(validRatio*100).toFixed(1)}% valid chars), using fallback extraction`);
        throw new Error('PDF text appears corrupted or encrypted');
      }
      
      return text;
    } catch (err) {
      console.warn('PDF parse failed, attempting ASCII-recovery fallback:', err.message);

      // Fallback: try to heuristically recover readable ASCII sequences from the PDF binary
      try {
        const latin = buffer.toString('latin1');

        // 1) Extract obvious parenthesized PDF string literals like (Tuesday 10AM: Algorithms Lecture)
        const paren = [];
        try {
          for (const m of latin.matchAll(/\(([^)]{20,})\)/g)) {
            let s = m[1];
            // simple unescape for common sequences
            s = s.replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
            paren.push(s);
          }
        } catch (pmErr) {
          console.warn('paren extraction error', pmErr.message);
        }

        // 2) Also grab long readable ASCII runs as a secondary source
        const runs = latin.match(/[\x20-\x7E]{20,}/g) || [];

        // Merge, dedupe
        const combined = Array.from(new Set([...paren, ...runs]));

        // Cleaning helper: remove PDF operators/tokens and stray object syntax
        const clean = (s) => {
          let out = s;
          // Remove PDF dictionary markers and angle-bracket hex
          out = out.replace(/<<[^>]*>>/g, ' ');
          out = out.replace(/<[^>\s]+>/g, ' ');
          // Remove name objects like /Type /Page
          out = out.replace(/\/[A-Za-z0-9\_\-]+/g, ' ');
          // Remove common PDF operators (Tj TJ Tf BT ET etc.) and stray single-letter ops
          out = out.replace(/\b(Tj|TJ|Tf|BT|ET|Td|Tm|Do|q|Q|cm|re|m|l|S|s)\b/g, ' ');
          // Remove 'obj'/'endobj' and numeric object refs
          out = out.replace(/\bobj\b|\bendobj\b|\bstream\b|\bendstream\b/gi, ' ');
          out = out.replace(/\b\d+\s+\d+\s+R\b/g, ' ');
          // Collapse multiple non-word characters and whitespace
          out = out.replace(/[^\w\s\-:\.,\(\)\/]/g, ' ');
          out = out.replace(/\s{2,}/g, ' ').trim();
          return out;
        };

        const cleaned = combined.map(c => clean(c)).filter(s => s && s.length > 20 && !s.match(/^[\/<>\x00-\x1F]+$/));
        // Remove any entries that still contain PDF tokens
        const moreFiltered = cleaned.filter(s => !s.match(/\b(Type|Page|Contents|Resources|Font|Parent|MediaBox|Kids|Count)\b/gi));
        moreFiltered.sort((a, b) => b.length - a.length);
        const recovered = moreFiltered.slice(0, 40).join('\n\n').trim();
        
        if (recovered && recovered.length > 30) {
          console.log('Recovered text from PDF via improved fallback (length:', recovered.length, ')');
          return recovered;
        }
      } catch (recErr) {
        console.warn('PDF recovery attempt failed:', recErr.message);
      }

      // If recovery didn't produce anything useful, return an informative but non-throwing message
      return `[[PDF text extraction failed: ${err.message}. The file may be partially corrupted or encrypted. Please re-upload a valid PDF or provide a TXT/DOCX version.]]`;
    }
  } else if (extension === 'txt') {
    // Detect BOM for UTF-16 (LE/BE) or null-bytes indicating UTF-16 and decode accordingly
    try {
      if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return buffer.toString('utf16le');
      }
      if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return buffer.toString('utf16be');
      }

      // Quick heuristic: if UTF-8 decode shows many null chars, attempt utf16le
      const asUtf8 = buffer.toString('utf8');
      if ((asUtf8.match(/\u0000/g) || []).length > 0) {
        return buffer.toString('utf16le');
      }

      return asUtf8;
    } catch (err) {
      return buffer.toString('utf8');
    }
  } else {
    // Graceful fallback
    return buffer.toString('utf8');
  }
}

/**
 * Splits text into overlapping semantic chunks using sentence boundaries
 * @param {string} text 
 * @param {number} targetChunkSize 
 * @param {number} overlap 
 * @returns {Array<string>} Array of text chunks
 */
export function generateChunks(text, targetChunkSize = 350, overlap = 50) {
  // Clean double spaces/returns to preserve space
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  if (cleanedText.length <= targetChunkSize) {
    return [cleanedText];
  }

  // Split into sentences for better semantic boundaries
  const sentences = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (sentences.length === 0) {
    // Fallback to character-based chunking if no sentences detected
    return generateCharacterChunks(cleanedText, targetChunkSize, overlap);
  }

  // Build chunks by accumulating sentences until we approach target size
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    
    if (potentialChunk.length <= targetChunkSize) {
      currentChunk = potentialChunk;
    } else {
      // Current chunk is full, save it and start a new one
      if (currentChunk.length > 50) { // Minimum chunk size
        chunks.push(currentChunk);
        
        // Start new chunk with overlap from previous chunk
        const sentenceCount = currentChunk.split(/(?<=[.!?])\s+/).length;
        const overlapSentences = Math.max(1, Math.ceil(sentenceCount * (overlap / targetChunkSize)));
        const overlapText = currentChunk
          .split(/(?<=[.!?])\s+/)
          .slice(-overlapSentences)
          .join(' ');
        
        currentChunk = overlapText ? `${overlapText} ${sentence}` : sentence;
      } else {
        currentChunk = sentence;
      }
    }
  }

  // Add final chunk
  if (currentChunk.length > 50) {
    chunks.push(currentChunk);
  }

  return chunks.filter(c => c.trim().length > 10);
}

/**
 * Fallback: Splits text into overlapping character-based chunks
 * @param {string} text 
 * @param {number} chunkSize 
 * @param {number} overlap 
 * @returns {Array<string>} Array of text chunks
 */
function generateCharacterChunks(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let index = 0;

  while (index < text.length) {
    const chunk = text.substring(index, index + chunkSize);
    chunks.push(chunk);
    index += (chunkSize - overlap);

    if (chunkSize - overlap <= 0) break;
  }

  return chunks.filter(c => c.trim().length > 10);
}

/**
 * High-level parser that takes a file upload buffer and compiles RAG-ready structures.
 * @param {Buffer} buffer 
 * @param {string} filename 
 * @returns {Promise<object>} Title, raw text, and list of overlapping chunks
 */
export async function processDocumentUpload(buffer, filename) {
  const text = await extractTextFromBuffer(buffer, filename);
  if (!text.trim()) {
    throw new Error('This document contains no readable text content.');
  }

  // Parse title from filename or first line
  let title = filename.replace(/\.[^/.]+$/, ""); // Strip file extension
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length > 0 && lines[0].length > 4 && lines[0].length < 100) {
    // If first line of document text looks like a title, adopt it
    title = lines[0].replace(/[\#\=\-\*]/g, '').trim();
  }

  const chunks = generateChunks(text, 800, 150);

  return {
    title,
    rawText: text,
    chunks
  };
}

/**
 * Sanitize text that may contain leftover PDF tokens or operators.
 * This is safe to run on previously-stored `chunk_text` values.
 */
export function sanitizeExtractedText(text) {
  if (!text || typeof text !== 'string') return '';
  let out = text;
  out = out.replace(/<<[^>]*>>/g, ' ');
  out = out.replace(/<[^>\s]+>/g, ' ');
  out = out.replace(/\/[A-Za-z0-9\_\-]+/g, ' ');
  out = out.replace(/\b(Tj|TJ|Tf|BT|ET|Td|Tm|Do|q|Q|cm|re|m|l|S|s)\b/g, ' ');
  out = out.replace(/\bobj\b|\bendobj\b|\bstream\b|\bendstream\b/gi, ' ');
  out = out.replace(/\b\d+\s+\d+\s+R\b/g, ' ');
  out = out.replace(/[^\w\s\-:\.,\(\)\/]/g, ' ');
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}
