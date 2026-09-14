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
 * Generate safe storage path in format: <userId>/<timestamp>-<uuid>.<ext>
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
 * Resolves a stored proof_url value.
 * If proofUrl starts with "storage://achievement-proofs/", generates a 1-hour signed URL.
 * If proofUrl is a normal external URL (http/https), returns it unchanged.
 */
async function resolveProofUrl(proofUrl) {
  if (!proofUrl || typeof proofUrl !== 'string') return proofUrl;

  const prefix = 'storage://achievement-proofs/';
  if (proofUrl.startsWith(prefix)) {
    const objectPath = proofUrl.slice(prefix.length);
    try {
      const { data, error } = await supabase.storage
        .from('achievement-proofs')
        .createSignedUrl(objectPath, 3600); // 1 hour expiry (3600s)

      if (data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('Failed to resolve signed URL for proof:', err);
    }
  }

  return proofUrl;
}

/**
 * Formats a single achievement or array of achievements with fresh on-demand 1-hour signed URLs.
 */
async function formatAchievementWithSignedUrl(achievement) {
  if (!achievement) return achievement;
  if (Array.isArray(achievement)) {
    return Promise.all(achievement.map(a => formatAchievementWithSignedUrl(a)));
  }

  if (achievement.proof_url) {
    const resolvedUrl = await resolveProofUrl(achievement.proof_url);
    return {
      ...achievement,
      proof_url: resolvedUrl
    };
  }

  return achievement;
}

/**
 * Extract storage object path from a storage_ref or URL.
 */
function extractObjectPath(bucketName, rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;

  const storagePrefix = `storage://${bucketName}/`;
  if (rawInput.startsWith(storagePrefix)) {
    return rawInput.slice(storagePrefix.length);
  }

  if (rawInput.includes(`/${bucketName}/`)) {
    const parts = rawInput.split(`/${bucketName}/`)[1];
    if (parts) {
      return parts.split('?')[0]; // Strip query tokens
    }
  }

  return rawInput;
}

/**
 * Helper to delete storage object from bucket safely.
 */
async function deleteUploadedFileFromUrl(bucketName, fileUrlOrPath) {
  if (!fileUrlOrPath) return;
  try {
    const objectPath = extractObjectPath(bucketName, fileUrlOrPath);
    if (objectPath) {
      await supabase.storage.from(bucketName).remove([objectPath]);
    }
  } catch (err) {
    console.warn(`Failed to cleanup storage object [${bucketName} - ${fileUrlOrPath}]:`, err);
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

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB.' });
    }

    const detectedMime = detectFileType(file.buffer);
    if (!detectedMime || !ACHIEVEMENT_MIMES.includes(detectedMime)) {
      return res.status(400).json({ error: 'Invalid file type. Supported formats: JPG, PNG, WEBP, PDF.' });
    }

    const headerMime = (file.mimetype || '').toLowerCase();
    if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== detectedMime) {
      const isJpegAlias = (headerMime.includes('jpg') || headerMime.includes('jpeg')) && (detectedMime === 'image/jpeg');
      if (!isJpegAlias) {
        return res.status(400).json({ error: 'File extension/type mismatch. File header does not match actual contents.' });
      }
    }

    const storagePath = generateSecureStoragePath(req.user.id, file.originalname, detectedMime);
    
    // Upload to private bucket achievement-proofs
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('achievement-proofs')
      .upload(storagePath, file.buffer, {
        contentType: detectedMime,
        upsert: true
      });

    if (uploadErr || !uploadData) {
      console.warn('Supabase Storage achievement-proof upload error:', uploadErr);
      return res.status(400).json({ error: 'File upload is not configured yet. You can paste a public URL instead.', storage_available: false });
    }

    const storageRef = `storage://achievement-proofs/${storagePath}`;

    // Create 1-hour preview URL for immediate frontend display
    const { data: signedData } = await supabase.storage
      .from('achievement-proofs')
      .createSignedUrl(storagePath, 3600);

    return res.json({
      url: storageRef,
      storage_ref: storageRef,
      preview_url: signedData?.signedUrl || storageRef,
      storage_available: true
    });
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

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 5MB.' });
    }

    const detectedMime = detectFileType(file.buffer);
    if (!detectedMime || !ANNOUNCEMENT_MIMES.includes(detectedMime)) {
      return res.status(400).json({ error: 'Invalid file type. Supported image formats: JPG, PNG, WEBP.' });
    }

    const headerMime = (file.mimetype || '').toLowerCase();
    if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== detectedMime) {
      const isJpegAlias = (headerMime.includes('jpg') || headerMime.includes('jpeg')) && (detectedMime === 'image/jpeg');
      if (!isJpegAlias) {
        return res.status(400).json({ error: 'File extension/type mismatch. File header does not match actual contents.' });
      }
    }

    const storagePath = generateSecureStoragePath(req.user.id, file.originalname, detectedMime);

    // Upload to public bucket department-posts
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('department-posts')
      .upload(storagePath, file.buffer, {
        contentType: detectedMime,
        upsert: true
      });

    if (uploadErr || !uploadData) {
      console.warn('Supabase Storage department-posts upload error:', uploadErr);
      return res.status(400).json({ error: 'File upload is not configured yet. You can paste a public URL instead.', storage_available: false });
    }

    const { data: publicUrlData } = supabase.storage
      .from('department-posts')
      .getPublicUrl(storagePath);

    return res.json({
      url: publicUrlData?.publicUrl || storagePath,
      storagePath,
      storage_available: true
    });
  } catch (err) {
    console.error('Announcement image upload failure:', err);
    return res.status(500).json({ error: 'Failed to process image upload.' });
  }
});

// ─── POST /api/uploads/cleanup ──────────────────────────────────────────────
router.post('/cleanup', requireAuth, async (req, res) => {
  try {
    const { bucket, url, storage_ref } = req.body;
    const inputRef = storage_ref || url;

    if (!bucket || !inputRef) {
      return res.status(400).json({ error: 'Bucket and file reference are required.' });
    }

    if (!['achievement-proofs', 'department-posts'].includes(bucket)) {
      return res.status(400).json({ error: 'Invalid storage bucket specified.' });
    }

    const objectPath = extractObjectPath(bucket, inputRef);
    if (!objectPath) {
      return res.status(400).json({ error: 'Invalid object reference.' });
    }

    // Path traversal protection (prevent ../ or ..\ or leading slashes)
    if (objectPath.includes('..') || objectPath.includes('\\') || objectPath.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid object path syntax.' });
    }

    // Authorization checks
    if (bucket === 'achievement-proofs') {
      if (req.user.role === 'student') {
        const expectedPrefix = `${req.user.id}/`;
        if (!objectPath.startsWith(expectedPrefix)) {
          return res.status(403).json({ error: 'Forbidden: You can only cleanup your own storage files.' });
        }
      }
    } else if (bucket === 'department-posts') {
      if (req.user.role === 'student') {
        return res.status(403).json({ error: 'Forbidden: Students cannot cleanup department post storage.' });
      }
    }

    await supabase.storage.from(bucket).remove([objectPath]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Storage cleanup failure:', err);
    return res.status(500).json({ error: 'Cleanup failed.' });
  }
});

module.exports = router;
module.exports.resolveProofUrl = resolveProofUrl;
module.exports.formatAchievementWithSignedUrl = formatAchievementWithSignedUrl;
module.exports.deleteUploadedFileFromUrl = deleteUploadedFileFromUrl;
