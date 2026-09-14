const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { authMiddleware: requireAuth, adminMiddleware: requireAdmin } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

// Configure Multer in-memory storage (5 MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Allowed MIME types
const ACHIEVEMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ANNOUNCEMENT_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validate actual file signature (magic bytes) from raw buffer.
 * Rejects HTML, JS, ZIP, or disguised files.
 */
function detectFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // WEBP: RIFF at 0..3 and WEBP at 8..11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D
  ) {
    return 'application/pdf';
  }

  return null;
}

/**
 * Generate safe, non-guessable storage object key.
 * Format: <userId>/<timestamp>-<randomUUID>.<safeExt>
 * Prevents path traversal (../, ..\) and raw user filename execution.
 */
function generateSecureStoragePath(userId, originalName, detectedMime) {
  const mimeToExt = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
  };
  const safeExt = mimeToExt[detectedMime] || 'bin';
  const safeUserId = String(userId || 'anonymous').replace(/[^a-zA-Z0-9-]/g, '');
  const timestamp = Date.now();
  const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
  
  return `${safeUserId}/${timestamp}-${uuid}.${safeExt}`;
}

/**
 * Helper to upload file buffer to Supabase Storage and return URL.
 * Supports private bucket signed URLs (for achievement proofs) and public URLs (for announcement posts).
 */
async function uploadToSupabaseBucket(bucketName, storagePath, fileBuffer, mimeType, isPrivate = false) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.warn(`Supabase Storage upload error [bucket: ${bucketName}]:`, error.message || error);
      return { success: false, error: 'File upload is not configured yet. You can paste a public URL instead.' };
    }

    if (isPrivate) {
      // Generate signed URL valid for 7 days
      const { data: signedData, error: signedErr } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      if (signedErr || !signedData?.signedUrl) {
        console.warn(`Supabase Storage signed URL error [bucket: ${bucketName}]:`, signedErr);
        return { success: false, error: 'File upload is not configured yet. You can paste a public URL instead.' };
      }
      return { success: true, url: signedData.signedUrl, storagePath };
    } else {
      // Public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        return { success: false, error: 'File upload is not configured yet. You can paste a public URL instead.' };
      }
      return { success: true, url: publicUrlData.publicUrl, storagePath };
    }
  } catch (err) {
    console.warn(`Supabase Storage exception [bucket: ${bucketName}]:`, err.message || err);
    return { success: false, error: 'File upload is not configured yet. You can paste a public URL instead.' };
  }
}

/**
 * Helper function to delete an uploaded file from Supabase Storage if form submission fails.
 */
async function deleteUploadedFileFromUrl(bucketName, fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== 'string') return;
  try {
    let objectPath = fileUrlOrPath;
    if (fileUrlOrPath.includes(`/${bucketName}/`)) {
      const parts = fileUrlOrPath.split(`/${bucketName}/`)[1];
      if (parts) {
        objectPath = parts.split('?')[0]; // strip query parameters / tokens
      }
    }
    if (objectPath) {
      await supabase.storage.from(bucketName).remove([objectPath]);
    }
  } catch (err) {
    console.warn(`Failed to cleanup orphan storage file [${bucketName} - ${fileUrlOrPath}]:`, err);
  }
}

// Multer error handling wrapper middleware
function parseSingleFile(fieldName) {
  return (req, res, next) => {
    const middleware = upload.single(fieldName);
    middleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB.' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      next();
    });
  };
}

// ─── POST /api/uploads/achievement-proof ─────────────────────────────────────
router.post('/achievement-proof', requireAuth, parseSingleFile('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file selected.' });
    }

    // Size limit verification
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB.' });
    }

    // MAGIC BYTE CONTENT VALIDATION
    const detectedMime = detectFileType(file.buffer);
    if (!detectedMime || !ACHIEVEMENT_MIMES.includes(detectedMime)) {
      return res.status(400).json({ error: 'Invalid file type. Supported formats: JPG, PNG, WEBP, PDF.' });
    }

    // Cross-verify header MIME and extension mismatch (e.g. HTML renamed to .jpg)
    const headerMime = (file.mimetype || '').toLowerCase();
    if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== detectedMime) {
      // allow jpeg/jpg alias
      const isJpegAlias = (headerMime.includes('jpg') || headerMime.includes('jpeg')) && (detectedMime === 'image/jpeg');
      if (!isJpegAlias) {
        return res.status(400).json({ error: 'File extension/type mismatch. File header does not match actual contents.' });
      }
    }

    const storagePath = generateSecureStoragePath(req.user.id, file.originalname, detectedMime);
    // Achievement proofs use private bucket mode with 7-day signed URL
    const result = await uploadToSupabaseBucket('achievement-proofs', storagePath, file.buffer, detectedMime, true);

    if (!result.success) {
      return res.status(400).json({ error: result.error, storage_available: false });
    }

    return res.json({ url: result.url, storagePath, storage_available: true });
  } catch (err) {
    console.error('Achievement proof upload failure:', err);
    return res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

// ─── POST /api/uploads/announcement-image ──────────────────────────────────
router.post('/announcement-image', requireAuth, requireAdmin, parseSingleFile('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file selected.' });
    }

    // Size limit verification
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB.' });
    }

    // MAGIC BYTE CONTENT VALIDATION (Images only! PDF/HTML/ZIP strictly rejected)
    const detectedMime = detectFileType(file.buffer);
    if (!detectedMime || !ANNOUNCEMENT_MIMES.includes(detectedMime)) {
      return res.status(400).json({ error: 'Invalid file type. Supported image formats: JPG, PNG, WEBP.' });
    }

    // Cross-verify header MIME and extension mismatch
    const headerMime = (file.mimetype || '').toLowerCase();
    if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== detectedMime) {
      const isJpegAlias = (headerMime.includes('jpg') || headerMime.includes('jpeg')) && (detectedMime === 'image/jpeg');
      if (!isJpegAlias) {
        return res.status(400).json({ error: 'File extension/type mismatch. File header does not match actual contents.' });
      }
    }

    const storagePath = generateSecureStoragePath(req.user.id, file.originalname, detectedMime);
    // Announcement images use public bucket mode
    const result = await uploadToSupabaseBucket('department-posts', storagePath, file.buffer, detectedMime, false);

    if (!result.success) {
      return res.status(400).json({ error: result.error, storage_available: false });
    }

    return res.json({ url: result.url, storagePath, storage_available: true });
  } catch (err) {
    console.error('Announcement image upload failure:', err);
    return res.status(500).json({ error: 'Failed to process image upload.' });
  }
});

// ─── POST /api/uploads/cleanup ──────────────────────────────────────────────
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const { bucket, url } = req.body;
    if (!bucket || !url) return res.status(400).json({ error: 'Bucket and URL required.' });
    
    // Only allow cleaning up supported buckets
    if (!['achievement-proofs', 'department-posts'].includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket.' });
    }

    await deleteUploadedFileFromUrl(bucket, url);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Cleanup failed.' });
  }
});

module.exports = router;
module.exports.deleteUploadedFileFromUrl = deleteUploadedFileFromUrl;
