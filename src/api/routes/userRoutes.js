import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/user/profile/:userId
 * @desc Get user profile by ID
 * @access Private (requires authentication)
 */
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`👤 [USER] Fetching profile for user: ${userId}`);

    // Get user profile from profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ [USER] Error fetching profile:', error);
      return res.status(404).json({ 
        success: false,
        error: 'User profile not found',
        message: error.message 
      });
    }

    if (!profile) {
      console.error('❌ [USER] Profile not found for user:', userId);
      return res.status(404).json({ 
        success: false,
        error: 'User profile not found',
        message: 'No profile found for this user ID' 
      });
    }

    console.log(`✅ [USER] Profile found for: ${profile.display_name || profile.email}`);
    
    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ [USER] Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * @route PUT /api/user/profile/:userId
 * @desc Update user profile
 * @access Private (requires authentication)
 */
router.put('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    console.log(`👤 [USER] Updating profile for user: ${userId}`);

    // Update user profile in profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ [USER] Error updating profile:', error);
      return res.status(400).json({ 
        success: false,
        error: 'Failed to update profile',
        message: error.message 
      });
    }

    console.log(`✅ [USER] Profile updated for: ${profile.display_name || profile.email}`);
    
    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ [USER] Profile update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/user/profile
 * @desc Create new user profile
 * @access Private (requires authentication)
 */
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const profileData = req.body;
    console.log(`👤 [USER] Creating new profile for user: ${profileData.id}`);

    // Create new user profile in profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert([profileData])
      .select('*')
      .single();

    if (error) {
      console.error('❌ [USER] Error creating profile:', error);
      return res.status(400).json({ 
        success: false,
        error: 'Failed to create profile',
        message: error.message 
      });
    }

    console.log(`✅ [USER] Profile created for: ${profile.display_name || profile.email}`);
    
    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ [USER] Profile creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router; 