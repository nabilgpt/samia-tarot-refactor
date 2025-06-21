const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// =====================================================
// USER REWARDS ENDPOINTS
// =====================================================

// Get user's current points balance and stats
router.get('/points', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get points balance
    const { data: pointsData, error: pointsError } = await supabase
      .from('rewards_points')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') {
      throw pointsError;
    }

    // Get recent transactions
    const { data: transactions, error: transError } = await supabase
      .from('rewards_transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transError) throw transError;

    const balance = pointsData?.balance || 0;
    const lifetimeEarned = pointsData?.lifetime_earned || 0;
    const lifetimeRedeemed = pointsData?.lifetime_redeemed || 0;

    res.json({
      success: true,
      data: {
        balance,
        lifetime_earned: lifetimeEarned,
        lifetime_redeemed: lifetimeRedeemed,
        recent_transactions: transactions || []
      }
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch points balance'
    });
  }
});

// Get user's transaction history with pagination
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('rewards_transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Get total count for pagination
    let countQuery = supabase
      .from('rewards_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    if (type) {
      countQuery = countQuery.eq('type', type);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: {
        transactions: transactions || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
});

// Award points (internal use - called after booking/payment)
router.post('/earn', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { points, source, description, type = 'earn', metadata = {} } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid points amount'
      });
    }

    // Insert transaction (trigger will update balance)
    const { data, error } = await supabase
      .from('rewards_transactions')
      .insert({
        user_id,
        type,
        points,
        source,
        description,
        metadata
      })
      .select()
      .single();

    if (error) throw error;

    // Get updated balance
    const { data: pointsData } = await supabase
      .from('rewards_points')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    res.json({
      success: true,
      message: `${points} points earned successfully!`,
      data: {
        transaction: data,
        new_balance: pointsData?.balance || 0
      }
    });
  } catch (error) {
    console.error('Error earning points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to award points'
    });
  }
});

// =====================================================
// REDEMPTION ENDPOINTS
// =====================================================

// Get available redemption options
router.get('/redemption-options', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('redemption_options')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('points_required');

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching redemption options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch redemption options'
    });
  }
});

// Redeem points
router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { option_id, booking_id } = req.body;

    // Get redemption option
    const { data: option, error: optionError } = await supabase
      .from('redemption_options')
      .select('*')
      .eq('id', option_id)
      .eq('is_active', true)
      .single();

    if (optionError || !option) {
      return res.status(400).json({
        success: false,
        error: 'Invalid redemption option'
      });
    }

    // Check if user has enough points
    const { data: pointsData } = await supabase
      .from('rewards_points')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    const currentBalance = pointsData?.balance || 0;
    if (currentBalance < option.points_required) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient points balance'
      });
    }

    // Check usage limits
    if (option.max_uses_per_user) {
      const { count } = await supabase
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('option_id', option_id)
        .eq('status', 'completed');

      if (count >= option.max_uses_per_user) {
        return res.status(400).json({
          success: false,
          error: 'Maximum redemptions reached for this option'
        });
      }
    }

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        user_id,
        option_id,
        points_used: option.points_required,
        value_received: option.value_amount,
        booking_id,
        status: 'completed',
        redeemed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (redemptionError) throw redemptionError;

    // Deduct points (create negative transaction)
    const { error: transactionError } = await supabase
      .from('rewards_transactions')
      .insert({
        user_id,
        type: 'redeem',
        points: -option.points_required,
        source: redemption.id,
        description: `Redeemed: ${option.name}`,
        metadata: { redemption_id: redemption.id, option_name: option.name }
      });

    if (transactionError) throw transactionError;

    // Get updated balance
    const { data: updatedPoints } = await supabase
      .from('rewards_points')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    res.json({
      success: true,
      message: `Successfully redeemed ${option.name}!`,
      data: {
        redemption,
        points_used: option.points_required,
        new_balance: updatedPoints?.balance || 0
      }
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to redeem points'
    });
  }
});

// Get user's redemption history
router.get('/redemptions', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('redemptions')
      .select(`
        *,
        redemption_options (
          name,
          description,
          type
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch redemption history'
    });
  }
});

// =====================================================
// REFERRAL ENDPOINTS
// =====================================================

// Get or generate user's referral code
router.get('/referral-code', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;

    // Check if user already has a referral code
    let { data: existingCode, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Generate new code if doesn't exist
    if (!existingCode) {
      // Call the database function to generate unique code
      const { data: generatedCode, error: genError } = await supabase
        .rpc('generate_referral_code', { p_user_id: user_id });

      if (genError) throw genError;

      // Insert the new code
      const { data: newCode, error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id,
          code: generatedCode
        })
        .select()
        .single();

      if (insertError) throw insertError;
      existingCode = newCode;
    }

    // Get referral stats
    const { data: referralStats, error: statsError } = await supabase
      .from('referral_uses')
      .select('*')
      .eq('referrer_user_id', user_id);

    if (statsError) throw statsError;

    res.json({
      success: true,
      data: {
        code: existingCode.code,
        usage_count: existingCode.usage_count,
        total_referrals: referralStats?.length || 0,
        referral_link: `${process.env.FRONTEND_URL}/signup?ref=${existingCode.code}`,
        created_at: existingCode.created_at
      }
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral code'
    });
  }
});

// Use a referral code (called during signup or by existing users)
router.post('/use-referral', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    // Get referral code details
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (codeError || !referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or inactive referral code'
      });
    }

    // Prevent self-referral
    if (referralCode.user_id === user_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use your own referral code'
      });
    }

    // Check if user already used this code
    const { data: existingUse } = await supabase
      .from('referral_uses')
      .select('id')
      .eq('code', code.toUpperCase())
      .eq('referred_user_id', user_id)
      .single();

    if (existingUse) {
      return res.status(400).json({
        success: false,
        error: 'You have already used this referral code'
      });
    }

    // Check usage limits
    if (referralCode.max_uses && referralCode.usage_count >= referralCode.max_uses) {
      return res.status(400).json({
        success: false,
        error: 'Referral code has reached its usage limit'
      });
    }

    // Get reward amounts from config
    const { data: config } = await supabase
      .from('rewards_config')
      .select('key, value')
      .in('key', ['referrer_bonus', 'referred_bonus']);

    const configMap = {};
    config?.forEach(item => {
      configMap[item.key] = parseInt(item.value);
    });

    const referrerBonus = configMap.referrer_bonus || 100;
    const referredBonus = configMap.referred_bonus || 50;

    // Record the referral use
    const { data: referralUse, error: useError } = await supabase
      .from('referral_uses')
      .insert({
        code: code.toUpperCase(),
        referrer_user_id: referralCode.user_id,
        referred_user_id: user_id,
        referrer_points: referrerBonus,
        referred_points: referredBonus
      })
      .select()
      .single();

    if (useError) throw useError;

    // Award points to referrer
    await supabase
      .from('rewards_transactions')
      .insert({
        user_id: referralCode.user_id,
        type: 'referral',
        points: referrerBonus,
        source: code.toUpperCase(),
        description: 'Referral bonus - someone used your code',
        metadata: { referred_user_id: user_id, referral_use_id: referralUse.id }
      });

    // Award points to referred user
    await supabase
      .from('rewards_transactions')
      .insert({
        user_id,
        type: 'referral',
        points: referredBonus,
        source: code.toUpperCase(),
        description: 'Welcome bonus for using referral code',
        metadata: { referrer_user_id: referralCode.user_id, referral_use_id: referralUse.id }
      });

    res.json({
      success: true,
      message: `Referral code applied! You earned ${referredBonus} points.`,
      data: {
        points_earned: referredBonus,
        referrer_bonus: referrerBonus
      }
    });
  } catch (error) {
    console.error('Error using referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply referral code'
    });
  }
});

// Get user's referral history and stats
router.get('/referral-stats', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get referrals made by this user
    const { data: referrals, error: referralsError } = await supabase
      .from('referral_uses')
      .select(`
        *,
        profiles!referral_uses_referred_user_id_fkey (
          username,
          email
        )
      `)
      .eq('referrer_user_id', user_id)
      .order('created_at', { ascending: false });

    if (referralsError) throw referralsError;

    // Get total points earned from referrals
    const { data: referralTransactions } = await supabase
      .from('rewards_transactions')
      .select('points')
      .eq('user_id', user_id)
      .eq('type', 'referral');

    const totalReferralPoints = referralTransactions?.reduce((sum, t) => sum + t.points, 0) || 0;

    res.json({
      success: true,
      data: {
        total_referrals: referrals?.length || 0,
        total_points_earned: totalReferralPoints,
        referrals: referrals || []
      }
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch referral statistics'
    });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

// Get all users' rewards data (Admin/Super Admin only)
router.get('/admin/all-users', [authenticateToken, requireRole('admin')], async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('rewards_points')
      .select(`
        *,
        profiles (
          username,
          email,
          full_name
        )
      `)
      .order('balance', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search functionality
    if (search) {
      query = query.or(`profiles.username.ilike.%${search}%,profiles.email.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching all users rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users rewards data'
    });
  }
});

// Manually adjust user points (Admin/Super Admin only)
router.post('/admin/adjust-points', [authenticateToken, requireRole('admin')], async (req, res) => {
  try {
    const { target_user_id, points, reason } = req.body;
    const { user_id: admin_user_id } = req.user;

    if (!target_user_id || !points || !reason) {
      return res.status(400).json({
        success: false,
        error: 'User ID, points amount, and reason are required'
      });
    }

    // Insert adjustment transaction
    const { data, error } = await supabase
      .from('rewards_transactions')
      .insert({
        user_id: target_user_id,
        type: 'admin_adjust',
        points: parseInt(points),
        source: 'admin',
        description: reason,
        metadata: { admin_user_id, adjustment_reason: reason }
      })
      .select()
      .single();

    if (error) throw error;

    // Get updated balance
    const { data: pointsData } = await supabase
      .from('rewards_points')
      .select('balance')
      .eq('user_id', target_user_id)
      .single();

    res.json({
      success: true,
      message: `Points ${points > 0 ? 'added' : 'deducted'} successfully`,
      data: {
        transaction: data,
        new_balance: pointsData?.balance || 0
      }
    });
  } catch (error) {
    console.error('Error adjusting points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust user points'
    });
  }
});

// Get rewards system statistics (Admin/Super Admin only)
router.get('/admin/stats', [authenticateToken, requireRole('admin')], async (req, res) => {
  try {
    // Get total users with points
    const { count: totalUsers } = await supabase
      .from('rewards_points')
      .select('*', { count: 'exact', head: true });

    // Get total points in circulation
    const { data: totalPointsData } = await supabase
      .from('rewards_points')
      .select('balance.sum()');

    // Get transaction stats by type
    const { data: transactionStats } = await supabase
      .from('rewards_transactions')
      .select('type, points.sum(), count()')
      .group('type');

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('rewards_transactions')
      .select(`
        *,
        profiles (
          username,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    res.json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        total_points_in_circulation: totalPointsData?.[0]?.sum || 0,
        transaction_stats: transactionStats || [],
        recent_activity: recentActivity || []
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards statistics'
    });
  }
});

// Get/Update rewards configuration (Super Admin only)
router.get('/admin/config', [authenticateToken, requireRole('admin')], async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rewards_config')
      .select('*')
      .eq('is_active', true)
      .order('key');

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards configuration'
    });
  }
});

router.put('/admin/config', [authenticateToken, requireRole('super_admin')], async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        error: 'Configs must be an array'
      });
    }

    // Update each configuration
    for (const config of configs) {
      await supabase
        .from('rewards_config')
        .update({
          value: config.value,
          updated_at: new Date().toISOString()
        })
        .eq('key', config.key);
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rewards configuration'
    });
  }
});

module.exports = router; 