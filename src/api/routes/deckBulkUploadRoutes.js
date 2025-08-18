const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { supabase } = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only WebP, JPEG, and PNG files are allowed'), false);
    }
  }
});

// Create new deck upload session
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const { deck_name, description } = req.body;
    const user_id = req.user.id;

    // Check user role (admin or reader)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (!userProfile || !['admin', 'reader'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { data: session, error } = await supabase
      .from('deck_upload_sessions')
      .insert({
        deck_name,
        description,
        created_by: user_id,
        status: 'initiated'
      })
      .select()
      .single();

    if (error) throw error;

    res.json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload cards for session
router.post('/sessions/:sessionId/upload', authMiddleware, upload.array('cards', 79), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Validate session ownership
    const { data: session, error: sessionError } = await supabase
      .from('deck_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', req.user.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update session status
    await supabase
      .from('deck_upload_sessions')
      .update({ status: 'uploading' })
      .eq('id', sessionId);

    const uploadResults = [];
    const validationErrors = [];

    // Validate filenames
    const requiredFiles = [
      ...Array.from({ length: 78 }, (_, i) => `Card_${i.toString().padStart(2, '0')}.webp`),
      'back.webp'
    ];

    const fileMap = new Map();
    files.forEach(file => {
      fileMap.set(file.originalname, file);
    });

    // Check all required files present
    const missingFiles = requiredFiles.filter(filename => !fileMap.has(filename));
    if (missingFiles.length > 0) {
      validationErrors.push(`Missing files: ${missingFiles.join(', ')}`);
    }

    // Check for extra files
    const extraFiles = files.filter(file => !requiredFiles.includes(file.originalname));
    if (extraFiles.length > 0) {
      validationErrors.push(`Unexpected files: ${extraFiles.map(f => f.originalname).join(', ')}`);
    }

    if (validationErrors.length > 0) {
      await supabase
        .from('deck_upload_sessions')
        .update({ 
          status: 'failed',
          error_details: { validation_errors: validationErrors }
        })
        .eq('id', sessionId);

      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    // Upload files to Supabase storage
    for (const file of files) {
      try {
        const fileName = `decks/${sessionId}/${file.originalname}`;
        
        const { data, error } = await supabase.storage
          .from('tarot-assets')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('tarot-assets')
          .getPublicUrl(fileName);

        // Save card record
        const cardNumber = file.originalname === 'back.webp' ? null : 
          parseInt(file.originalname.match(/Card_(\d+)\.webp/)[1]);

        const { error: cardError } = await supabase
          .from('deck_cards')
          .insert({
            session_id: sessionId,
            card_number: cardNumber,
            file_name: file.originalname,
            file_path: fileName,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.mimetype,
            is_back_card: file.originalname === 'back.webp'
          });

        if (cardError) throw cardError;

        uploadResults.push({
          fileName: file.originalname,
          cardNumber,
          url: urlData.publicUrl,
          status: 'success'
        });

      } catch (error) {
        console.error(`Upload error for ${file.originalname}:`, error);
        uploadResults.push({
          fileName: file.originalname,
          status: 'error',
          error: error.message
        });
      }
    }

    // Update session with results
    const successCount = uploadResults.filter(r => r.status === 'success').length;
    const finalStatus = successCount === files.length ? 'completed' : 'partial';

    await supabase
      .from('deck_upload_sessions')
      .update({ 
        status: finalStatus,
        cards_uploaded: successCount,
        completed_at: finalStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', sessionId);

    res.json({
      sessionId,
      status: finalStatus,
      uploadResults,
      totalFiles: files.length,
      successCount,
      errorCount: files.length - successCount
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Update session status to failed
    await supabase
      .from('deck_upload_sessions')
      .update({ 
        status: 'failed',
        error_details: { error: error.message }
      })
      .eq('id', req.params.sessionId);

    res.status(500).json({ error: error.message });
  }
});

// Get session status
router.get('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error } = await supabase
      .from('deck_upload_sessions')
      .select(`
        *,
        deck_cards (
          id,
          card_number,
          file_name,
          file_url,
          is_back_card
        )
      `)
      .eq('id', sessionId)
      .eq('created_by', req.user.id)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's upload sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('deck_upload_sessions')
      .select(`
        id,
        deck_name,
        description,
        status,
        cards_uploaded,
        created_at,
        completed_at
      `)
      .eq('created_by', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete session and associated files
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check ownership
    const { data: session, error: sessionError } = await supabase
      .from('deck_upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('created_by', req.user.id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all cards for cleanup
    const { data: cards } = await supabase
      .from('deck_cards')
      .select('file_path')
      .eq('session_id', sessionId);

    // Delete files from storage
    if (cards && cards.length > 0) {
      const filePaths = cards.map(card => card.file_path);
      await supabase.storage
        .from('tarot-assets')
        .remove(filePaths);
    }

    // Delete session (cascades to cards)
    const { error: deleteError } = await supabase
      .from('deck_upload_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate card files endpoint
router.post('/validate', authMiddleware, upload.array('cards', 79), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const validationResults = [];
    const requiredFiles = [
      ...Array.from({ length: 78 }, (_, i) => `Card_${i.toString().padStart(2, '0')}.webp`),
      'back.webp'
    ];

    // Check filename compliance
    const fileMap = new Map();
    files.forEach(file => {
      fileMap.set(file.originalname, file);
    });

    const missingFiles = requiredFiles.filter(filename => !fileMap.has(filename));
    const extraFiles = files.filter(file => !requiredFiles.includes(file.originalname));

    for (const file of files) {
      const result = {
        fileName: file.originalname,
        size: file.size,
        type: file.mimetype,
        valid: true,
        issues: []
      };

      // Check filename format
      if (!requiredFiles.includes(file.originalname)) {
        result.valid = false;
        result.issues.push('Invalid filename format');
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        result.valid = false;
        result.issues.push('File too large (max 10MB)');
      }

      // Check file type
      if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.mimetype)) {
        result.valid = false;
        result.issues.push('Invalid file type');
      }

      validationResults.push(result);
    }

    const overallValid = missingFiles.length === 0 && extraFiles.length === 0 && 
      validationResults.every(r => r.valid);

    res.json({
      valid: overallValid,
      totalFiles: files.length,
      validFiles: validationResults.filter(r => r.valid).length,
      missingFiles,
      extraFiles: extraFiles.map(f => f.originalname),
      results: validationResults
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;