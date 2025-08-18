import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ===================================
// MULTER CONFIGURATION FOR IMAGE UPLOAD
// ===================================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/tarot-decks');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 100 // Allow up to 100 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// ===================================
// SPREADS MANAGEMENT ROUTES
// ===================================

// GET /api/admin/tarot/spreads - Get all spreads with admin data
router.get('/spreads', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🎯 [ADMIN TAROT] Fetching spreads for admin dashboard');

    const { data: spreads, error } = await supabaseAdmin
      .from('tarot_spreads')
      .select(`
        *,
        admin_created_by:profiles!admin_created_by(id, name, email),
        spread_assignments:tarot_spread_reader_assignments(
          id,
          reader_id,
          assigned_by,
          assigned_at,
          is_active,
          reader:profiles!reader_id(id, name, email)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ADMIN TAROT] Error fetching spreads:', error);
      return res.status(500).json({ error: 'Failed to fetch spreads' });
    }

    console.log(`✅ [ADMIN TAROT] Fetched ${spreads?.length || 0} spreads`);
    res.json({ spreads: spreads || [] });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Spreads fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/tarot/spreads - Create new spread with admin controls
router.post('/spreads', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      name,
      name_ar,
      description,
      description_ar,
      card_count,
      positions,
      difficulty_level,
      category,
      visibility_type = 'public',
      is_featured = false,
      admin_notes,
      admin_tags = []
    } = req.body;

    console.log('🎯 [ADMIN TAROT] Creating new spread:', { name, visibility_type });

    // Validate required fields
    if (!name || !description || !card_count || !positions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const spreadData = {
      name,
      name_ar,
      description,
      description_ar,
      card_count: parseInt(card_count),
      positions,
      difficulty_level: difficulty_level || 'beginner',
      category,
      visibility_type,
      is_featured,
      admin_notes,
      admin_tags,
      admin_created_by: req.user.profileId,
      approval_status: 'approved', // Admin-created spreads are auto-approved
      created_by: req.user.profileId,
      is_active: true
    };

    const { data: spread, error } = await supabaseAdmin
      .from('tarot_spreads')
      .insert([spreadData])
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error creating spread:', error);
      return res.status(500).json({ error: 'Failed to create spread' });
    }

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'spread_created',
      'spread',
      spread.id,
      { name, visibility_type },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Spread created successfully:', spread.id);
    res.status(201).json({ spread });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Spread creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/tarot/spreads/:id - Update spread with admin controls
router.put('/spreads/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    console.log('🎯 [ADMIN TAROT] Updating spread:', id);

    const { data: spread, error } = await supabaseAdmin
      .from('tarot_spreads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error updating spread:', error);
      return res.status(500).json({ error: 'Failed to update spread' });
    }

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'spread_updated',
      'spread',
      id,
      updateData,
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Spread updated successfully:', id);
    res.json({ spread });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Spread update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/tarot/spreads/:id/assign-readers - Assign spread to specific readers
router.post('/spreads/:id/assign-readers', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: spreadId } = req.params;
    const { readerIds, notes } = req.body;

    console.log('🎯 [ADMIN TAROT] Assigning spread to readers:', { spreadId, readerIds });

    if (!Array.isArray(readerIds) || readerIds.length === 0) {
      return res.status(400).json({ error: 'Reader IDs are required' });
    }

    // First, deactivate existing assignments
    await supabaseAdmin
      .from('tarot_spread_reader_assignments')
      .update({ is_active: false })
      .eq('spread_id', spreadId);

    // Create new assignments
    const assignments = readerIds.map(readerId => ({
      spread_id: spreadId,
      reader_id: readerId,
      assigned_by: req.user.profileId,
      notes,
      is_active: true
    }));

    const { data: createdAssignments, error } = await supabaseAdmin
      .from('tarot_spread_reader_assignments')
      .insert(assignments)
      .select();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error creating assignments:', error);
      return res.status(500).json({ error: 'Failed to assign readers' });
    }

    // Update spread visibility to 'assigned' if needed
    await supabaseAdmin
      .from('tarot_spreads')
      .update({ visibility_type: 'assigned' })
      .eq('id', spreadId);

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'spread_assigned',
      'spread',
      spreadId,
      { readerIds, count: readerIds.length },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Spread assigned successfully:', spreadId);
    res.json({ assignments: createdAssignments });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================================
// DECKS MANAGEMENT ROUTES
// ===================================

// GET /api/admin/tarot/decks - Get all decks with admin data
router.get('/decks', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🎯 [ADMIN TAROT] Fetching decks for admin dashboard');

    const { data: decks, error } = await supabaseAdmin
      .from('tarot_decks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ADMIN TAROT] Error fetching decks:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch decks' });
    }

    console.log(`✅ [ADMIN TAROT] Fetched ${decks?.length || 0} decks`);
    res.json({ success: true, data: decks || [] });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Decks fetch error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/tarot/decks - Create new deck
router.post('/decks', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      name,
      name_ar,
      name_en,
      description,
      description_ar,
      description_en,
      total_cards,
      deck_type,
      visibility_type = 'public',
      admin_notes
    } = req.body;

    console.log('🎯 [ADMIN TAROT] Creating new deck with bilingual enforcement:', { 
      name_en: name_en || name, 
      name_ar, 
      total_cards, 
      deck_type 
    });

    // ===================================
    // BILINGUAL VALIDATION - CRITICAL
    // ===================================
    // Both name_en and name_ar must be populated
    const finalNameEn = name_en || name;
    const finalNameAr = name_ar;
    const finalDescEn = description_en || description;
    const finalDescAr = description_ar;

    if (!finalNameEn || !finalNameAr) {
      return res.status(400).json({ 
        success: false,
        error: 'Both English and Arabic names are required',
        details: 'Deck names must be provided in both languages'
      });
    }

    // Validate other required fields
    if (!total_cards || !deck_type) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
    }

    const deckData = {
      name: finalNameEn,  // Use English name as primary name
      name_en: finalNameEn,
      name_ar: finalNameAr,
      description: finalDescEn,
      description_en: finalDescEn,
      description_ar: finalDescAr,
      total_cards: parseInt(total_cards),
      deck_type,
      visibility_type,
      admin_notes,
      admin_created_by: req.user.profileId,
      upload_status: 'pending',
      total_images_uploaded: 0,
      card_back_uploaded: false,
      is_admin_managed: true,
      is_active: true
    };

    const { data: deck, error } = await supabaseAdmin
      .from('tarot_decks')
      .insert([deckData])
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error creating deck:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create deck',
        details: error.message
      });
    }

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'deck_created',
      'deck',
      deck.id,
      { name, total_cards, deck_type },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Deck created successfully:', deck.id);
    res.status(201).json({ 
      success: true, 
      deck,
      message: 'Deck created successfully with bilingual support'
    });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Deck creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// POST /api/admin/tarot/decks/:id/upload-images - Upload card images with validation
router.post('/decks/:id/upload-images', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  upload.array('images', 100),
  async (req, res) => {
    try {
      const { id: deckId } = req.params;
      const { imageType = 'card_front' } = req.body; // 'card_front' or 'card_back'
      const files = req.files;

      console.log('🎯 [ADMIN TAROT] Uploading images for deck:', { deckId, imageType, fileCount: files?.length });

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      // Get deck details
      const { data: deck, error: deckError } = await supabaseAdmin
        .from('tarot_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      if (deckError || !deck) {
        console.error('❌ [ADMIN TAROT] Deck not found:', deckError);
        return res.status(404).json({ error: 'Deck not found' });
      }

      // Validate file count for card fronts
      if (imageType === 'card_front' && files.length !== deck.total_cards) {
        return res.status(400).json({ 
          error: `Must upload exactly ${deck.total_cards} card images. Got ${files.length}.` 
        });
      }

      // Validate file count for card back
      if (imageType === 'card_back' && files.length !== 1) {
        return res.status(400).json({ 
          error: 'Must upload exactly 1 card back image.' 
        });
      }

      // Create image records
      const imageRecords = files.map((file, index) => ({
        deck_id: deckId,
        image_type: imageType,
        image_url: `/uploads/tarot-decks/${file.filename}`,
        image_filename: file.filename,
        image_size_bytes: file.size,
        upload_order: imageType === 'card_front' ? index + 1 : 0,
        uploaded_by: req.user.profileId,
        is_active: true
      }));

      // Insert image records
      const { data: images, error: imagesError } = await supabaseAdmin
        .from('tarot_deck_card_images')
        .insert(imageRecords)
        .select();

      if (imagesError) {
        console.error('❌ [ADMIN TAROT] Error saving image records:', imagesError);
        // Clean up uploaded files
        for (const file of files) {
          try {
            await fs.unlink(file.path);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
        return res.status(500).json({ error: 'Failed to save image records' });
      }

      // The trigger will automatically update the deck's upload status

      // Log admin activity
      await logAdminActivity(
        req.user.profileId,
        'deck_images_uploaded',
        'deck',
        deckId,
        { imageType, count: files.length },
        req.ip,
        req.get('User-Agent')
      );

      console.log('✅ [ADMIN TAROT] Images uploaded successfully:', deckId);
      res.json({ 
        images, 
        message: `Successfully uploaded ${files.length} ${imageType} images` 
      });
    } catch (error) {
      console.error('❌ [ADMIN TAROT] Image upload error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/admin/tarot/decks/:id/assign-readers - Assign deck to specific readers
router.post('/decks/:id/assign-readers', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: deckId } = req.params;
    const { readerIds, notes } = req.body;

    console.log('🎯 [ADMIN TAROT] Assigning deck to readers:', { deckId, readerIds });

    if (!Array.isArray(readerIds) || readerIds.length === 0) {
      return res.status(400).json({ error: 'Reader IDs are required' });
    }

    // First, deactivate existing assignments
    await supabaseAdmin
      .from('tarot_deck_reader_assignments')
      .update({ is_active: false })
      .eq('deck_id', deckId);

    // Create new assignments
    const assignments = readerIds.map(readerId => ({
      deck_id: deckId,
      reader_id: readerId,
      assigned_by: req.user.profileId,
      notes,
      is_active: true
    }));

    const { data: createdAssignments, error } = await supabaseAdmin
      .from('tarot_deck_reader_assignments')
      .insert(assignments)
      .select();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error creating deck assignments:', error);
      return res.status(500).json({ error: 'Failed to assign readers' });
    }

    // Update deck visibility to 'assigned' if needed
    await supabaseAdmin
      .from('tarot_decks')
      .update({ visibility_type: 'assigned' })
      .eq('id', deckId);

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'deck_assigned',
      'deck',
      deckId,
      { readerIds, count: readerIds.length },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Deck assigned successfully:', deckId);
    res.json({ assignments: createdAssignments });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Deck assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/tarot/decks/:id - Update existing deck
router.put('/decks/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: deckId } = req.params;
    const {
      name,
      name_ar,
      description,
      description_ar,
      total_cards,
      deck_type,
      visibility_type,
      admin_notes
    } = req.body;

    console.log('🎯 [ADMIN TAROT] Updating deck:', { deckId, name });

    // Validate required fields
    if (!name || !total_cards || !deck_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if deck exists
    const { data: existingDeck, error: checkError } = await supabaseAdmin
      .from('tarot_decks')
      .select('id')
      .eq('id', deckId)
      .eq('is_active', true)
      .single();

    if (checkError || !existingDeck) {
      console.error('❌ [ADMIN TAROT] Deck not found:', checkError);
      return res.status(404).json({ error: 'Deck not found' });
    }

    const updateData = {
      name,
      name_ar,
      description,
      description_ar,
      total_cards: parseInt(total_cards),
      deck_type,
      visibility_type,
      admin_notes,
      updated_at: new Date().toISOString()
    };

    const { data: deck, error } = await supabaseAdmin
      .from('tarot_decks')
      .update(updateData)
      .eq('id', deckId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error updating deck:', error);
      return res.status(500).json({ error: 'Failed to update deck' });
    }

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'deck_updated',
      'deck',
      deckId,
      { name, total_cards, deck_type },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Deck updated successfully:', deckId);
    res.json({ deck });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Deck update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/tarot/decks/:id - Soft delete existing deck
router.delete('/decks/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id: deckId } = req.params;

    console.log('🎯 [ADMIN TAROT] Deleting deck:', deckId);

    // Check if deck exists
    const { data: existingDeck, error: checkError } = await supabaseAdmin
      .from('tarot_decks')
      .select('id, name, name_ar')
      .eq('id', deckId)
      .eq('is_active', true)
      .single();

    if (checkError || !existingDeck) {
      console.error('❌ [ADMIN TAROT] Deck not found:', checkError);
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Soft delete deck
    const { data: deck, error } = await supabaseAdmin
      .from('tarot_decks')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', deckId)
      .select()
      .single();

    if (error) {
      console.error('❌ [ADMIN TAROT] Error deleting deck:', error);
      return res.status(500).json({ error: 'Failed to delete deck' });
    }

    // Deactivate all reader assignments for this deck
    await supabaseAdmin
      .from('tarot_deck_reader_assignments')
      .update({ is_active: false })
      .eq('deck_id', deckId);

    // Log admin activity
    await logAdminActivity(
      req.user.profileId,
      'deck_deleted',
      'deck',
      deckId,
      { name: existingDeck.name },
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ [ADMIN TAROT] Deck deleted successfully:', deckId);
    res.json({ 
      success: true, 
      message: 'Deck deleted successfully',
      deck: deck 
    });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Deck deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================================
// READERS MANAGEMENT ROUTES
// ===================================

// GET /api/admin/tarot/readers - Get all readers for assignment
router.get('/readers', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('🎯 [ADMIN TAROT] Fetching readers for assignment');

    const { data: readers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, is_active')
      .eq('role', 'reader')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ [ADMIN TAROT] Error fetching readers:', error);
      return res.status(500).json({ error: 'Failed to fetch readers' });
    }

    console.log(`✅ [ADMIN TAROT] Fetched ${readers?.length || 0} readers`);
    res.json({ readers: readers || [] });
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Readers fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

async function logAdminActivity(adminId, actionType, targetType, targetId, details, ipAddress, userAgent) {
  try {
    await supabaseAdmin
      .from('tarot_admin_activity_log')
      .insert([{
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent
      }]);
  } catch (error) {
    console.error('❌ [ADMIN TAROT] Error logging activity:', error);
  }
}

export default router; 