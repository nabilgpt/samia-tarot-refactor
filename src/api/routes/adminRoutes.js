import express from 'express';
const router = express.Router();
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

// =============================================================================
// USER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route GET /api/admin/users
 * @desc Get all users with admin-specific details
 * @access Admin/Super Admin  
 */
router.get('/users', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;
      const offset = (page - 1) * limit;

      console.log('🔄 [ADMIN] Loading users for admin management...');

      let query = supabaseAdmin
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          is_active,
          avatar_url,
          phone,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (role) query = query.eq('role', role);
      if (status === 'active') query = query.eq('is_active', true);
      if (status === 'inactive') query = query.eq('is_active', false);
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data: users, error, count } = await query;

      if (error) {
        console.error('❌ [ADMIN] Get users error:', error);
        throw error;
      }

      console.log(`✅ [ADMIN] Loaded ${users?.length || 0} users`);

      res.json({
        success: true,
        data: users || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error) {
      console.error('❌ [ADMIN] Get users API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/users
 * @desc Create a new user
 * @access Admin/Super Admin
 */
router.post('/users', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const {
        email,
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        role = 'client'
      } = req.body;

      console.log('👤 [ADMIN] Creating new user...');

      // Validation
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          required: ['email']
        });
      }

      // Check if email already exists
      const { data: existingProfile, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingProfile) {
        return res.status(409).json({
          success: false,
          error: 'A user with this email already exists',
          details: `Profile ID: ${existingProfile.id}`
        });
      }

      // Create user in auth.users table first
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12), // Generate temporary password
        email_confirm: true,
        user_metadata: {
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0],
          role: role
        }
      });

      if (authError) {
        console.error('❌ [ADMIN] Create auth user error:', authError);
        throw authError;
      }

      // Create the user profile
      const userData = {
        id: authUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0],
        phone: phone || null,
        country_code: country_code || null,
        role: role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([userData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ADMIN] Create user error:', insertError);
        throw insertError;
      }

      console.log(`✅ [ADMIN] Created new user: ${newUser.display_name || newUser.email}`);

      res.status(201).json({
        success: true,
        data: newUser,
        message: `User ${newUser.display_name || newUser.email} created successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Create user API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: error.message
      });
    }
  }
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Update a user
 * @access Admin/Super Admin
 */
router.put('/users/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        role,
        is_active
      } = req.body;

      console.log(`📝 [ADMIN] Updating user ${id}...`);

      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', id)
        .single();

      if (fetchError || !existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          details: fetchError?.message
        });
      }

      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (display_name !== undefined) updateData.display_name = display_name;
      if (phone !== undefined) updateData.phone = phone;
      if (country_code !== undefined) updateData.country_code = country_code;
      if (role !== undefined) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      // Update the user
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [ADMIN] Update user error:', updateError);
        throw updateError;
      }

      console.log(`✅ [ADMIN] Updated user: ${updatedUser.display_name || updatedUser.email}`);

      res.json({
        success: true,
        data: updatedUser,
        message: `User ${updatedUser.display_name || updatedUser.email} updated successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Update user API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        details: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete a user (soft delete by deactivating)
 * @access Admin/Super Admin
 */
router.delete('/users/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { permanent = false, reason = '' } = req.query;
      
      console.log(`🗑️ [ADMIN] Deleting user ${id}... (permanent: ${permanent})`);
      console.log(`🔍 [ADMIN] Query parameters received:`, req.query);
      console.log(`🔍 [ADMIN] Permanent value type:`, typeof permanent, 'Value:', permanent);
      console.log(`🔍 [ADMIN] Permanent === 'true'?`, permanent === 'true');

      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', id)
        .single();

      if (fetchError || !existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          details: fetchError?.message
        });
      }

      // Enhanced permanent parameter checking
      const isPermanent = permanent === 'true' || permanent === true || permanent === 1 || permanent === '1';
      console.log(`🔍 [ADMIN] isPermanent check result:`, isPermanent);
      
      if (isPermanent) {
        console.log(`💀 [ADMIN] PERMANENT deletion of user ${existingUser.display_name || existingUser.email}`);
        
        try {
          // STEP 1: Delete all related data in correct order to avoid foreign key violations
          console.log(`🔄 [ADMIN] Step 1: Cleaning up related data for user ${id}...`);
          
          // Delete user activity logs
          await supabaseAdmin
            .from('user_activity_logs')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted user activity logs`);
          
          // Delete wallet transactions
          await supabaseAdmin
            .from('wallet_transactions')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted wallet transactions`);
          
          // Delete wallets (CRITICAL: Must delete before profile due to foreign key constraint)
          await supabaseAdmin
            .from('wallets')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted wallets`);
          
          // Delete payment methods
          await supabaseAdmin
            .from('payment_methods')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted payment methods`);
          
          // Delete payment receipts
          await supabaseAdmin
            .from('payment_receipts')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted payment receipts`);
          
          // Delete chat messages (as sender)
          await supabaseAdmin
            .from('chat_messages')
            .delete()
            .eq('sender_id', id);
          console.log(`✅ [ADMIN] Deleted chat messages`);
          
          // Delete voice notes
          await supabaseAdmin
            .from('voice_notes')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted voice notes`);
          
          // Delete reader analytics
          await supabaseAdmin
            .from('reader_analytics')
            .delete()
            .eq('reader_id', id);
          console.log(`✅ [ADMIN] Deleted reader analytics`);
          
          // Delete AI reading results
          await supabaseAdmin
            .from('ai_reading_results')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted AI reading results`);
          
          // Delete reader applications
          await supabaseAdmin
            .from('reader_applications')
            .delete()
            .eq('user_id', id);
          console.log(`✅ [ADMIN] Deleted reader applications`);
          
          // Delete service feedback
          await supabaseAdmin
            .from('service_feedback')
            .delete()
            .eq('client_id', id);
          console.log(`✅ [ADMIN] Deleted service feedback`);
          
          // Update bookings to remove user references (set to null instead of deleting bookings)
          await supabaseAdmin
            .from('bookings')
            .update({ 
              user_id: null,
              reader_id: id === existingUser.id ? null : undefined 
            })
            .or(`user_id.eq.${id},reader_id.eq.${id}`);
          console.log(`✅ [ADMIN] Updated bookings to remove user references`);
          
          // STEP 2: Delete the profile (this should cascade properly now)
          console.log(`🔄 [ADMIN] Step 2: Deleting profile for user ${id}...`);
          const { error: profileDeleteError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);
            
          if (profileDeleteError) {
            console.error(`❌ [ADMIN] Profile deletion error:`, profileDeleteError);
            throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
          }
          console.log(`✅ [ADMIN] Profile deleted successfully`);
          
          // STEP 3: Delete from auth.users (should work now)
          console.log(`🔄 [ADMIN] Step 3: Deleting from auth.users for user ${id}...`);
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
          
          if (authDeleteError) {
            console.error(`❌ [ADMIN] Auth delete error:`, authDeleteError);
            throw new Error(`Failed to delete from auth.users: ${authDeleteError.message}`);
          }
          console.log(`✅ [ADMIN] User deleted from auth.users successfully`);
          
        } catch (deleteError) {
          console.error(`❌ [ADMIN] Permanent deletion failed:`, deleteError);
          return res.status(500).json({
            success: false,
            error: `Failed to permanently delete user: ${deleteError.message}`,
            details: deleteError.stack
          });
        }
        
        // STEP 4: Log the permanent deletion
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_id: req.user.id,
            action_type: 'PERMANENT_DELETE_USER',
            table_name: 'auth.users',
            record_ids: [id],
            old_data: existingUser,
            details: { reason, permanent_deletion: true },
            created_at: new Date().toISOString()
          });
        
        res.json({
          success: true,
          message: `User ${existingUser.display_name || existingUser.email} has been permanently deleted`,
          permanent: true,
          data: {
            deleted_user_id: id,
            deletion_type: 'PERMANENT',
            permanent: true
          }
        });
      } else {
        // SOFT DELETE - Deactivate the user
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString(),
            deleted_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [ADMIN] Delete user error:', updateError);
          throw updateError;
        }

        console.log(`✅ [ADMIN] User ${existingUser.display_name || existingUser.email} deleted (deactivated)`);

        res.json({
          success: true,
          data: updatedUser,
          message: `User ${existingUser.display_name || existingUser.email} has been deleted`,
          permanent: false
        });
      }

    } catch (error) {
      console.error('❌ [ADMIN] Delete user API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/readers/sync-activation
 * @desc Run reader activation sync and auto-healing
 * @access Admin/Super Admin
 */
router.post('/readers/sync-activation', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔧 [ADMIN] Running reader activation sync and auto-healing...');

      // Run the sync function
      const { data: syncResults, error } = await supabaseAdmin
        .rpc('sync_and_fix_reader_activation');

      if (error) {
        console.error('❌ [ADMIN] Sync function error:', error);
        throw error;
      }

      // Process results
      const results = syncResults || [];
      const fixedReaders = results.filter(r => r.action === 'FIXED');
      const totalReaders = results.filter(r => r.action === 'OK' || r.action === 'FIXED').length;

      console.log(`✅ [ADMIN] Sync completed: ${fixedReaders.length} readers auto-fixed out of ${totalReaders} total`);

      res.json({
        success: true,
        data: {
          totalReaders: totalReaders,
          fixedReaders: fixedReaders.length,
          results: results,
          summary: `${fixedReaders.length} readers auto-fixed out of ${totalReaders} total readers`
        },
        message: `Reader activation sync completed successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Reader sync API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run reader activation sync',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/readers/maintenance
 * @desc Run periodic reader activation maintenance
 * @access Admin/Super Admin
 */
router.post('/readers/maintenance', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔧 [ADMIN] Running reader activation maintenance...');

      // Run the maintenance function
      const { data: maintenanceResult, error } = await supabaseAdmin
        .rpc('run_reader_activation_maintenance');

      if (error) {
        console.error('❌ [ADMIN] Maintenance function error:', error);
        throw error;
      }

      console.log(`✅ [ADMIN] Maintenance completed: ${maintenanceResult}`);

      res.json({
        success: true,
        data: {
          result: maintenanceResult,
          timestamp: new Date().toISOString()
        },
        message: 'Reader activation maintenance completed successfully'
      });

    } catch (error) {
      console.error('❌ [ADMIN] Reader maintenance API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run reader activation maintenance',
        details: error.message
      });
    }
  }
);

// =============================================================================
// SERVICE MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route GET /api/admin/services
 * @desc Get all services with admin-specific details
 * @access Admin/Super Admin  
 */
router.get('/services', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔄 [ADMIN] Loading services for admin management...');

      const { data: services, error } = await supabaseAdmin
        .from('services')
        .select(`
          id,
          name_ar,
          name_en,
          description_ar,
          description_en,
          price,
          duration,
          is_vip,
          is_active,
          reader_id,
          created_at,
          profiles!services_reader_id_fkey(first_name, last_name, display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN] Get services error:', error);
        throw error;
      }

      console.log(`✅ [ADMIN] Loaded ${services?.length || 0} services`);

      res.json({
        success: true,
        data: services || [],
        total: services?.length || 0
      });
    } catch (error) {
      console.error('❌ [ADMIN] Get services API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/services
 * @desc Create a new service
 * @access Admin/Super Admin
 */
router.post('/services', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        duration,
        is_vip = false,
        reader_id
      } = req.body;

      console.log('🛠️ [ADMIN] Creating new service...');

      // Validation
      if (!name_ar || !name_en || !price || !duration || !reader_id) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          required: ['name_ar', 'name_en', 'price', 'duration', 'reader_id']
        });
      }

      // Check if reader exists
      const { data: reader, error: readerError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', reader_id)
        .in('role', ['reader', 'admin', 'super_admin'])
        .single();

      if (readerError || !reader) {
        return res.status(404).json({
          success: false,
          error: 'Reader not found',
          details: readerError?.message
        });
      }

      const serviceData = {
        name_ar,
        name_en,
        description_ar: description_ar || null,
        description_en: description_en || null,
        price: parseFloat(price),
        duration: parseInt(duration),
        is_vip: Boolean(is_vip),
        reader_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newService, error: insertError } = await supabaseAdmin
        .from('services')
        .insert([serviceData])
        .select(`
          *,
          profiles!services_reader_id_fkey(first_name, last_name, display_name, email)
        `)
        .single();

      if (insertError) {
        console.error('❌ [ADMIN] Create service error:', insertError);
        throw insertError;
      }

      console.log(`✅ [ADMIN] Created new service: ${newService.name_ar} for reader ${reader.display_name || reader.email}`);

      res.status(201).json({
        success: true,
        data: newService,
        message: `Service ${newService.name_ar} created successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Create service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create service',
        details: error.message
      });
    }
  }
);

/**
 * @route PUT /api/admin/services/:id
 * @desc Update a service
 * @access Admin/Super Admin
 */
router.put('/services/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name_ar,
        name_en,
        description_ar,
        description_en,
        price,
        duration,
        is_vip,
        is_active
      } = req.body;

      console.log(`📝 [ADMIN] Updating service ${id}...`);

      // Check if service exists
      const { data: existingService, error: fetchError } = await supabaseAdmin
        .from('services')
        .select('id, name_ar, name_en, reader_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingService) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          details: fetchError?.message
        });
      }

      // Prepare update data
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (name_ar !== undefined) updateData.name_ar = name_ar;
      if (name_en !== undefined) updateData.name_en = name_en;
      if (description_ar !== undefined) updateData.description_ar = description_ar;
      if (description_en !== undefined) updateData.description_en = description_en;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (duration !== undefined) updateData.duration = parseInt(duration);
      if (is_vip !== undefined) updateData.is_vip = Boolean(is_vip);
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      // Update the service
      const { data: updatedService, error: updateError } = await supabaseAdmin
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          profiles!services_reader_id_fkey(first_name, last_name, display_name, email)
        `)
        .single();

      if (updateError) {
        console.error('❌ [ADMIN] Update service error:', updateError);
        throw updateError;
      }

      console.log(`✅ [ADMIN] Updated service: ${updatedService.name_ar}`);

      res.json({
        success: true,
        data: updatedService,
        message: `Service ${updatedService.name_ar} updated successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Update service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update service',
        details: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/services/:id
 * @desc Delete a service (soft delete by deactivating)
 * @access Admin/Super Admin
 */
router.delete('/services/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ [ADMIN] Deleting service ${id}...`);

      // Check if service exists
      const { data: existingService, error: fetchError } = await supabaseAdmin
        .from('services')
        .select('id, name_ar, name_en, reader_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingService) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          details: fetchError?.message
        });
      }

      // Soft delete by deactivating the service
      const { data: updatedService, error: updateError } = await supabaseAdmin
        .from('services')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
          deleted_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [ADMIN] Delete service error:', updateError);
        throw updateError;
      }

      console.log(`✅ [ADMIN] Service ${existingService.name_ar} deleted (deactivated)`);

      res.json({
        success: true,
        data: updatedService,
        message: `Service ${existingService.name_ar} has been deleted`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Delete service API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete service',
        details: error.message
      });
    }
  }
);

// =============================================================================
// READER MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * @route GET /api/admin/readers
 * @desc Get all readers with admin-specific details (sessions, earnings, etc.)
 * @access Admin/Super Admin  
 */
router.get('/readers', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔄 [ADMIN] Loading readers for admin management...');

      // Get readers with basic profile info (NEVER filter by is_active - show all unless banned)
      const { data: readers, error } = await supabaseAdmin
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          display_name,
          email,
          specializations,
          languages,
          avatar_url,
          role,
          is_active,
          deactivated,
          banned_by_admin,
          banned_reason,
          banned_at,
          created_at,
          phone,
          country_code
        `)
        .in('role', ['reader', 'admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN] Get readers error:', error);
        throw error;
      }

      // Get service statistics for each reader
      const readerStats = await Promise.all(
        (readers || []).map(async (reader) => {
          try {
            // Get services count for this reader
            const { data: services, error: servicesError } = await supabaseAdmin
              .from('services')
              .select('id, price, is_vip')
              .eq('reader_id', reader.id)
              .eq('is_active', true);

            if (servicesError) {
              console.warn(`⚠️ Could not get services for reader ${reader.id}:`, servicesError);
            }

            // Get bookings count (if bookings table exists)
            let totalSessions = 0;
            let totalEarnings = 0;
            
            try {
              const { data: bookings, error: bookingsError } = await supabaseAdmin
                .from('bookings')
                .select('id, total_amount, status')
                .eq('reader_id', reader.id)
                .in('status', ['completed', 'paid']);

              if (!bookingsError && bookings) {
                totalSessions = bookings.length;
                totalEarnings = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
              }
            } catch (bookingError) {
              // Bookings table might not exist yet, that's okay
              console.log(`ℹ️ No bookings data for reader ${reader.id}`);
            }

            // Calculate rating (mock for now, can be replaced with real rating system)
            const rating = 4.0 + Math.random() * 1.0;

            // Determine status based on new activation logic
            let status = 'active'; // Default to active
            if (reader.banned_by_admin) {
              status = 'banned';
            } else if (!reader.is_active || reader.deactivated) {
              status = 'inactive'; // Should be rare due to auto-healing
            }

            return {
              id: reader.id,
              name: `${reader.first_name || ''} ${reader.last_name || ''}`.trim() || reader.display_name || reader.email,
              display_name: reader.display_name,
              email: reader.email,
              specialization: reader.specializations ? reader.specializations.join(', ') : 'عام',
              specializations: reader.specializations || [],
              languages: reader.languages || ['en'],
              avatar_url: reader.avatar_url,
              role: reader.role,
              rating: Math.round(rating * 10) / 10, // Round to 1 decimal
              totalSessions: totalSessions,
              totalServices: (services || []).length,
              earnings: totalEarnings,
              status: status,
              is_active: reader.is_active,
              deactivated: reader.deactivated,
              banned_by_admin: reader.banned_by_admin,
              banned_reason: reader.banned_reason,
              banned_at: reader.banned_at,
              joinDate: reader.created_at ? new Date(reader.created_at).toISOString().split('T')[0] : '2024-01-01',
              lastActive: new Date().toISOString().split('T')[0], // Mock last active
              phone: reader.phone,
              country_code: reader.country_code,
              servicesData: services || []
            };
          } catch (readerError) {
            console.error(`❌ Error processing reader ${reader.id}:`, readerError);
            return {
              id: reader.id,
              name: reader.display_name || reader.email,
              email: reader.email,
              specialization: 'عام',
              rating: 4.0,
              totalSessions: 0,
              totalServices: 0,
              earnings: 0,
              status: reader.is_active ? 'active' : 'inactive',
              joinDate: '2024-01-01',
              lastActive: new Date().toISOString().split('T')[0],
              error: 'Could not load complete data'
            };
          }
        })
      );

      console.log(`✅ [ADMIN] Loaded ${readerStats.length} readers with statistics`);

      res.json({
        success: true,
        data: readerStats,
        total: readerStats.length,
        summary: {
          total: readerStats.length,
          active: readerStats.filter(r => r.status === 'active').length,
          inactive: readerStats.filter(r => r.status === 'inactive').length,
          totalSessions: readerStats.reduce((sum, r) => sum + r.totalSessions, 0),
          totalEarnings: readerStats.reduce((sum, r) => sum + r.earnings, 0)
        }
      });

    } catch (error) {
      console.error('❌ [ADMIN] Get readers API error:', error);
      res.status(500).json({
    success: false,
        error: 'Failed to fetch readers',
        details: error.message
      });
    }
  }
);

/**
 * @route PUT /api/admin/readers/:id/status
 * @desc Update reader status (activate/deactivate)
 * @access Admin/Super Admin
 */
router.put('/readers/:id/status', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'active' or 'inactive'
      
      console.log(`🔄 [ADMIN] Updating reader ${id} status to ${status}`);

      const isActive = status === 'active';
      
      const { data: updatedReader, error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .in('role', ['reader', 'admin', 'super_admin'])
        .select()
        .single();

      if (error) {
        console.error('❌ [ADMIN] Update reader status error:', error);
        throw error;
      }

      console.log(`✅ [ADMIN] Reader ${id} status updated to ${status}`);

      res.json({
        success: true,
        data: updatedReader,
        message: `Reader status updated to ${status}`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Update reader status API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update reader status',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/readers/:id/services
 * @desc Get all services for a specific reader
 * @access Admin/Super Admin
 */
router.get('/readers/:id/services', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔄 [ADMIN] Loading services for reader ${id}`);

      const { data: services, error } = await supabaseAdmin
        .from('services')
        .select(`
          id,
          name_ar,
          name_en,
          description_ar,
          description_en,
          price,
          type,
          duration_minutes,
          is_active,
          is_vip,
          created_at
        `)
        .eq('reader_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [ADMIN] Get reader services error:', error);
        throw error;
      }

      console.log(`✅ [ADMIN] Found ${services.length} services for reader ${id}`);

      res.json({
        success: true,
        data: services || [],
        total: (services || []).length
      });

    } catch (error) {
      console.error('❌ [ADMIN] Get reader services API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reader services',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/stats
 * @desc Get admin dashboard statistics
 * @access Admin/Super Admin
 */
router.get('/stats', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🔄 [ADMIN] Loading dashboard statistics...');

      // Get readers count
      const { data: readers, error: readersError } = await supabaseAdmin
        .from('profiles')
        .select('id, is_active, role')
        .in('role', ['reader', 'admin', 'super_admin']);

      // Get services count
      const { data: services, error: servicesError } = await supabaseAdmin
        .from('services')
        .select('id, is_active, is_vip, price');

      // Get bookings count (if available)
      let bookings = [];
      try {
        const { data: bookingsData } = await supabaseAdmin
          .from('bookings')
          .select('id, status, total_amount, created_at');
        bookings = bookingsData || [];
      } catch (bookingsErr) {
        console.log('ℹ️ Bookings table not available');
      }

      const stats = {
        readers: {
          total: readers?.length || 0,
          active: readers?.filter(r => r.is_active)?.length || 0,
          inactive: readers?.filter(r => !r.is_active)?.length || 0
        },
        services: {
          total: services?.length || 0,
          active: services?.filter(s => s.is_active)?.length || 0,
          vip: services?.filter(s => s.is_vip)?.length || 0,
          regular: services?.filter(s => !s.is_vip)?.length || 0
        },
        bookings: {
          total: bookings.length,
          completed: bookings.filter(b => b.status === 'completed').length,
          pending: bookings.filter(b => b.status === 'pending').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length
        },
        revenue: {
          total: bookings
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => sum + (b.total_amount || 0), 0),
          thisMonth: bookings
            .filter(b => {
              const now = new Date();
              const bookingDate = new Date(b.created_at);
              return bookingDate.getMonth() === now.getMonth() && 
                     bookingDate.getFullYear() === now.getFullYear() &&
                     b.status === 'completed';
            })
            .reduce((sum, b) => sum + (b.total_amount || 0), 0)
        }
      };

      console.log('✅ [ADMIN] Dashboard statistics loaded');

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ [ADMIN] Get stats API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch admin statistics',
        details: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/admin/readers/:id
 * @desc Delete a reader (soft delete by deactivating)
 * @access Admin/Super Admin
 */
router.delete('/readers/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ [ADMIN] Deleting reader ${id}...`);

      // Check if reader exists and get their info
      const { data: existingReader, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', id)
        .in('role', ['reader', 'admin', 'super_admin'])
        .single();

      if (fetchError || !existingReader) {
        return res.status(404).json({
          success: false,
          error: 'Reader not found',
          details: fetchError?.message
        });
      }

      // Soft delete by deactivating the reader
      const { data: updatedReader, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
          // Optional: Add a deleted_at timestamp
          deleted_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [ADMIN] Delete reader error:', updateError);
        throw updateError;
      }

      // Also deactivate all their services
      const { error: servicesError } = await supabaseAdmin
        .from('services')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('reader_id', id);

      if (servicesError) {
        console.warn('⚠️ [ADMIN] Could not deactivate reader services:', servicesError);
      }

      console.log(`✅ [ADMIN] Reader ${existingReader.display_name || existingReader.email} deleted (deactivated)`);

      res.json({
        success: true,
        data: updatedReader,
        message: `Reader ${existingReader.display_name || existingReader.email} has been deleted`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Delete reader API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete reader',
        details: error.message
      });
    }
  }
);

/**
 * @route POST /api/admin/readers/quick
 * @desc Create a new reader profile with optimized performance (no timeout)
 * @access Admin/Super Admin
 */
router.post('/readers/quick', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const {
        email,
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        bio,
        specializations = ['general_reading'],
        languages = ['ar', 'en'],
        timezone = 'Asia/Damascus',
        role = 'reader'
      } = req.body;

      console.log('🚀 [QUICK] Starting optimized reader creation...');
      
      // Basic validation
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'Valid email address is required',
          field: 'email'
        });
      }

      if (!first_name && !display_name) {
        return res.status(400).json({
          success: false,
          error: 'Either first_name or display_name is required',
          field: 'first_name'
        });
      }

      const emailLower = email.toLowerCase().trim();
      console.log('✅ [QUICK] Validation passed for:', emailLower);

      // STEP 1: Comprehensive duplicate check (both auth and profiles)
      console.log('🔍 [QUICK] Checking for existing user in auth and profiles...');
      
      // Check auth.users first
      const { data: existingAuthUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
      if (authCheckError) {
        console.error('❌ [QUICK] Auth check error:', authCheckError);
        throw authCheckError;
      }
      
      const existingAuthUser = existingAuthUsers.users.find(user => user.email === emailLower);
      if (existingAuthUser) {
        console.log('❌ [QUICK] Email exists in auth.users:', existingAuthUser.id);
        return res.status(409).json({
          success: false,
          error: 'هذا البريد الإلكتروني مستخدم سابقاً في النظام',
          field: 'email'
        });
      }
      
      // Check profiles table
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role')
        .eq('email', emailLower)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('❌ [QUICK] Profile check error:', profileCheckError);
        throw profileCheckError;
      }

      if (existingProfile) {
        console.log('❌ [QUICK] Email already exists in profiles:', existingProfile.id);
        return res.status(409).json({
          success: false,
          error: 'هذا البريد الإلكتروني مستخدم سابقاً في قاعدة البيانات',
          field: 'email'
        });
      }

      console.log('✅ [QUICK] Email is available');

      // STEP 2: Create auth user with minimal data (FAST)
      console.log('🔄 [QUICK] Creating auth user...');
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
      
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLower,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || null,
          display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || emailLower.split('@')[0],
          role: role
        }
      });

      if (authError) {
        console.error('❌ [QUICK] Auth creation failed:', authError);
        if (authError.message?.includes('already registered')) {
          return res.status(409).json({
            success: false,
            error: 'هذا البريد الإلكتروني مستخدم سابقاً',
            field: 'email'
          });
        }
        throw authError;
      }

      console.log('✅ [QUICK] Auth user created:', authUser.user.id);

      // STEP 3: Update or create profile (FAST) - Handle trigger-created profile
      console.log('🔄 [QUICK] Updating profile created by trigger...');
      
      // Wait a moment for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if profile was created by trigger
      const { data: existingTriggerProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role, first_name')
        .eq('id', authUser.user.id)
        .single();
      
      if (existingTriggerProfile) {
        console.log('✅ [QUICK] Found trigger-created profile:', existingTriggerProfile);
      } else {
        console.log('⚠️ [QUICK] No trigger profile found, will create manually');
      }
      
      const profileData = {
        email: emailLower,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || emailLower.split('@')[0],
        phone: phone || null,
        country_code: country_code || null,
        bio: bio || null,
        specializations: Array.isArray(specializations) ? specializations : [specializations],
        languages: Array.isArray(languages) ? languages : [languages],
        timezone: timezone,
        role: role,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // Try to update the profile created by trigger first
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', authUser.user.id)
        .select()
        .single();

      let newProfile;
      if (updateError) {
        console.log('🔄 [QUICK] Profile not found, creating new one...');
        
        // If update failed, try to insert (fallback)
        const insertData = {
          id: authUser.user.id,
          ...profileData,
          created_at: authUser.user.created_at
        };
        
        const { data: insertedProfile, error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert([insertData])
          .select()
          .single();

        if (insertError) {
          console.error('❌ [QUICK] Profile creation failed:', insertError);
          
          // Rollback auth user
          try {
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            console.log('🔄 [QUICK] Auth user rolled back');
          } catch (rollbackError) {
            console.error('💥 [QUICK] Rollback failed:', rollbackError);
          }
          
          throw insertError;
        }
        
        newProfile = insertedProfile;
      } else {
        newProfile = updatedProfile;
      }

      console.log('🎉 [QUICK] Reader created successfully:', newProfile.display_name);

      res.status(201).json({
        success: true,
        data: newProfile,
        message: `Reader ${newProfile.display_name} created successfully`,
        method: 'quick_creation'
      });

    } catch (error) {
      console.error('💥 [QUICK] Creation failed:', error);
      
      let errorMessage = 'خطأ في إنشاء القارئ';
      let statusCode = 500;
      
      if (error.code === '23505') {
        if (error.message?.includes('profiles_pkey')) {
          errorMessage = 'حدث خطأ في معرف البروفايل - يرجى المحاولة مرة أخرى';
        } else {
          errorMessage = 'هذا البريد الإلكتروني مستخدم سابقاً';
        }
        statusCode = 409;
      } else if (error.message?.includes('already registered')) {
        errorMessage = 'هذا البريد الإلكتروني مستخدم سابقاً';
        statusCode = 409;
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = 'هذا البريد الإلكتروني مستخدم سابقاً';
        statusCode = 409;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: error.message,
        method: 'quick_creation'
      });
    }
  }
);

/**
 * @route POST /api/admin/readers
 * @desc Create a new reader profile with robust sync logic (LEGACY - SLOW)
 * @access Admin/Super Admin
 */
router.post('/readers', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const {
        email,
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        bio,
        specializations = [],
        languages = ['ar', 'en'],
        timezone = 'Asia/Damascus',
        role = 'reader'
      } = req.body;

      console.log('🔄 [ADMIN] Starting robust reader creation process...');
      console.log('📥 [ADMIN] Request body:', JSON.stringify({
        email,
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        bio: bio ? `${bio.substring(0, 50)}...` : 'not provided',
        specializations,
        languages,
        timezone,
        role
      }, null, 2));

      // Enhanced Validation
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        console.error('❌ [ADMIN] Validation failed: Invalid email format');
        return res.status(400).json({
          success: false,
          error: 'Valid email address is required',
          field: 'email',
          required: ['email']
        });
      }

      if (!first_name && !display_name) {
        console.error('❌ [ADMIN] Validation failed: Name is required');
        return res.status(400).json({
          success: false,
          error: 'Either first_name or display_name is required',
          field: 'first_name',
          required: ['first_name OR display_name']
        });
      }

      const emailLower = email.toLowerCase().trim();
      console.log('✅ [ADMIN] Input validation passed');

      // STEP 1: Check for existing user in BOTH auth.users AND profiles
      console.log('🔍 [ADMIN] Comprehensive duplicate check...');
      
      // Check auth.users first
      const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserByEmail(emailLower);
      
      if (authCheckError && !authCheckError.message?.includes('User not found')) {
        console.error('❌ [ADMIN] Error checking auth.users:', authCheckError);
        throw authCheckError;
      }

      // Check profiles table
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role, is_active')
        .eq('email', emailLower)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('❌ [ADMIN] Error checking profiles:', profileCheckError);
        throw profileCheckError;
      }

      // Handle duplicate scenarios
      if (existingAuthUser?.user && existingProfile) {
        console.error('❌ [ADMIN] Email exists in both auth and profiles:', existingProfile.id);
        return res.status(409).json({
          success: false,
          error: 'هذا البريد الإلكتروني مستخدم سابقاً',
          field: 'email',
          details: `Profile already exists with ID: ${existingProfile.id}`
        });
      }

      // SELF-HEALING: If exists in auth but not in profiles, create missing profile
      if (existingAuthUser?.user && !existingProfile) {
        console.log('🔧 [ADMIN] Self-healing: Auth user exists but no profile, creating missing profile...');
        
        const healingData = {
          id: existingAuthUser.user.id,
          email: emailLower,
          first_name: first_name || existingAuthUser.user.user_metadata?.first_name || null,
          last_name: last_name || existingAuthUser.user.user_metadata?.last_name || null,
          display_name: display_name || 
                       existingAuthUser.user.user_metadata?.display_name || 
                       `${first_name || ''} ${last_name || ''}`.trim() || 
                       emailLower.split('@')[0],
          phone: phone || null,
          country_code: country_code || null,
          bio: bio || null,
          specializations: Array.isArray(specializations) && specializations.length > 0 ? specializations : ['general_reading'],
          languages: Array.isArray(languages) && languages.length > 0 ? languages : ['ar', 'en'],
          timezone: timezone || 'Asia/Damascus',
          role: role,
          is_active: true, // ALWAYS set to true for healed readers
          deactivated: false, // ALWAYS set to false for healed readers
          banned_by_admin: false, // ALWAYS set to false for healed readers
          created_at: existingAuthUser.user.created_at,
          updated_at: new Date().toISOString()
        };

        const { data: healedProfile, error: healError } = await supabaseAdmin
          .from('profiles')
          .insert([healingData])
          .select()
          .single();

        if (healError) {
          console.error('❌ [ADMIN] Self-healing failed:', healError);
          throw healError;
        }

        console.log(`✅ [ADMIN] Self-healed profile for existing auth user: ${healedProfile.display_name}`);
        
        return res.status(201).json({
          success: true,
          data: healedProfile,
          message: `Reader ${healedProfile.display_name} created successfully (self-healed)`,
          healed: true
        });
      }

      // If exists in profiles but not in auth (shouldn't happen but handle it)
      if (!existingAuthUser?.user && existingProfile) {
        console.error('❌ [ADMIN] Profile exists without auth user (data inconsistency):', existingProfile.id);
        return res.status(409).json({
          success: false,
          error: 'Data inconsistency detected. Please contact support.',
          field: 'email',
          details: 'Profile exists without corresponding auth user'
        });
      }

      console.log('✅ [ADMIN] Email is available in both auth and profiles');

      // STEP 2: Create user in auth.users table (TRANSACTIONAL)
      console.log('🔄 [ADMIN] Creating auth user...');
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLower,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-8).toUpperCase() + '!@#', // Strong temp password
        email_confirm: true,
        user_metadata: {
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || emailLower.split('@')[0],
          role: role,
          created_by: 'admin_dashboard',
          creation_timestamp: new Date().toISOString()
        }
      });

      if (authError) {
        console.error('❌ [ADMIN] Auth user creation failed:', authError);
        
        // Handle specific auth errors
        if (authError.message?.includes('already registered')) {
          return res.status(409).json({
            success: false,
            error: 'هذا البريد الإلكتروني مستخدم سابقاً',
            field: 'email',
            details: 'Email already registered in authentication system'
          });
        }
        
        throw authError;
      }

      console.log(`✅ [ADMIN] Auth user created: ${authUser.user.id} for ${emailLower}`);

      // STEP 3: Create the reader profile (WITH ROLLBACK ON FAILURE)
      console.log('🔄 [ADMIN] Creating reader profile...');
      const readerData = {
        id: authUser.user.id, // CRITICAL: Use auth user ID for perfect sync
        email: emailLower,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: display_name || `${first_name || ''} ${last_name || ''}`.trim() || emailLower.split('@')[0],
        phone: phone || null,
        country_code: country_code || null,
        bio: bio || null,
        specializations: Array.isArray(specializations) && specializations.length > 0 ? specializations : ['general_reading'],
        languages: Array.isArray(languages) && languages.length > 0 ? languages : ['ar', 'en'],
        timezone: timezone || 'Asia/Damascus',
        role: role,
        is_active: true, // ALWAYS set to true for new readers
        deactivated: false, // ALWAYS set to false for new readers
        banned_by_admin: false, // ALWAYS set to false for new readers (unless explicitly specified)
        created_at: authUser.user.created_at,
        updated_at: new Date().toISOString()
      };

      console.log('📤 [ADMIN] Reader profile data:', JSON.stringify({
        ...readerData,
        bio: readerData.bio ? `${readerData.bio.substring(0, 50)}...` : null
      }, null, 2));

      const { data: newReader, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([readerData])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ADMIN] Profile creation failed, rolling back auth user...', insertError);
        
        // ROLLBACK: Delete the auth user we just created
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          console.log('🔄 [ADMIN] Auth user rollback successful');
        } catch (rollbackError) {
          console.error('💥 [ADMIN] CRITICAL: Auth user rollback failed:', rollbackError);
        }
        
        // Handle specific profile errors
        if (insertError.code === '23505') {
          return res.status(409).json({
            success: false,
            error: 'هذا البريد الإلكتروني مستخدم سابقاً',
            field: 'email',
            details: 'Profile with this email already exists'
          });
        }
        
        throw insertError;
      }

      console.log(`🎉 [ADMIN] Reader created successfully: ${newReader.display_name || newReader.email} (ID: ${newReader.id})`);
      console.log('📊 [ADMIN] Final reader data:', {
        id: newReader.id,
        email: newReader.email,
        display_name: newReader.display_name,
        role: newReader.role,
        specializations: newReader.specializations,
        languages: newReader.languages
      });

      res.status(201).json({
        success: true,
        data: newReader,
        message: `Reader ${newReader.display_name || newReader.email} created successfully`,
        sync_status: 'perfect_sync_achieved'
      });

    } catch (error) {
      console.error('💥 [ADMIN] Reader creation API error:', error);
      
      // Enhanced error categorization
      let errorMessage = 'خطأ في إنشاء القارئ';
      let errorDetails = error.message;
      let statusCode = 500;
      let field = null;
      
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        errorMessage = 'هذا البريد الإلكتروني مستخدم سابقاً';
        statusCode = 409;
        field = 'email';
      } else if (error.code === '23503') {
        errorMessage = 'خطأ في قيود قاعدة البيانات';
        statusCode = 400;
      } else if (error.message?.includes('already registered')) {
        errorMessage = 'هذا البريد الإلكتروني مستخدم سابقاً';
        statusCode = 409;
        field = 'email';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'خطأ في الاتصال بالخادم';
        statusCode = 503;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        field: field,
        details: errorDetails,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * @route PUT /api/admin/readers/:id
 * @desc Update a reader profile
 * @access Admin/Super Admin
 */
router.put('/readers/:id', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        first_name,
        last_name,
        display_name,
        phone,
        country_code,
        bio,
        specializations,
        languages,
        timezone,
        is_active
      } = req.body;

      console.log(`📝 [ADMIN] Updating reader ${id}...`);

      // Check if reader exists
      const { data: existingReader, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', id)
        .in('role', ['reader', 'admin', 'super_admin'])
        .single();

      if (fetchError || !existingReader) {
        return res.status(404).json({
    success: false,
          error: 'Reader not found',
          details: fetchError?.message
        });
      }

      // Prepare update data (only include provided fields)
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (display_name !== undefined) updateData.display_name = display_name;
      if (phone !== undefined) updateData.phone = phone;
      if (country_code !== undefined) updateData.country_code = country_code;
      if (bio !== undefined) updateData.bio = bio;
      if (specializations !== undefined) updateData.specializations = Array.isArray(specializations) ? specializations : [];
      if (languages !== undefined) updateData.languages = Array.isArray(languages) ? languages : ['ar', 'en'];
      if (timezone !== undefined) updateData.timezone = timezone;
      if (is_active !== undefined) updateData.is_active = Boolean(is_active);

      // Update the reader
      const { data: updatedReader, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [ADMIN] Update reader error:', updateError);
        throw updateError;
      }

      console.log(`✅ [ADMIN] Updated reader: ${updatedReader.display_name || updatedReader.email}`);

      res.json({
        success: true,
        data: updatedReader,
        message: `Reader ${updatedReader.display_name || updatedReader.email} updated successfully`
      });

    } catch (error) {
      console.error('❌ [ADMIN] Update reader API error:', error);
  res.status(500).json({
    success: false,
        error: 'Failed to update reader',
        details: error.message
  });
    }
  }
);

/**
 * @route GET /api/admin/database-stats
 * @desc Get comprehensive database statistics for admin dashboard
 * @access Admin/Super Admin
 */
router.get('/database-stats', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('📊 [ADMIN] Fetching database statistics...');

      // Core tables to check
      const tables = [
        'profiles', 'services', 'bookings', 'payments', 'messages', 
        'reviews', 'notifications', 'wallets', 'transactions',
        'call_sessions', 'call_recordings', 'emergency_call_logs',
        'daily_zodiac_readings', 'tarot_spreads', 'moroccan_tarot_cards'
      ];

      const stats = {};
      
      // Get count for each table
      for (const table of tables) {
        try {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            console.warn(`⚠️ Could not get count for table ${table}:`, error.message);
            stats[table] = { count: 'N/A', error: error.message };
          } else {
            stats[table] = { count: count || 0, status: 'healthy' };
          }
        } catch (err) {
          console.warn(`⚠️ Table ${table} might not exist:`, err.message);
          stats[table] = { count: 'N/A', error: 'Table not found' };
        }
      }

      // Calculate totals
      const totalRecords = Object.values(stats)
        .filter(s => typeof s.count === 'number')
        .reduce((sum, s) => sum + s.count, 0);

      const healthyTables = Object.values(stats)
        .filter(s => s.status === 'healthy').length;

      console.log('✅ [ADMIN] Database statistics loaded');

      res.json({
        success: true,
        data: {
          tables: stats,
          summary: {
            total_tables: tables.length,
            healthy_tables: healthyTables,
            total_records: totalRecords,
            database_status: healthyTables > tables.length * 0.7 ? 'healthy' : 'degraded'
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ [ADMIN] Database stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch database statistics',
        details: error.message
      });
    }
  }
);

/**
 * @route GET /api/admin/system-health
 * @desc Get comprehensive system health status for admin dashboard
 * @access Admin/Super Admin
 */
router.get('/system-health', 
  authenticateToken, 
  requireRole(['admin', 'super_admin']), 
  async (req, res) => {
    try {
      console.log('🏥 [ADMIN] Checking system health...');

      const health = {
        database: { status: 'checking', response_time: null },
        auth: { status: 'checking', response_time: null },
        storage: { status: 'checking', response_time: null },
        api: { status: 'healthy', response_time: 0 },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };

      // Test database connection
      const dbStart = Date.now();
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .limit(1);
        
        health.database.response_time = Date.now() - dbStart;
        health.database.status = error ? 'error' : 'healthy';
        if (error) health.database.error = error.message;
      } catch (error) {
        health.database.status = 'error';
        health.database.error = error.message;
        health.database.response_time = Date.now() - dbStart;
      }

      // Test auth system
      const authStart = Date.now();
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
        health.auth.response_time = Date.now() - authStart;
        health.auth.status = error ? 'error' : 'healthy';
        if (error) health.auth.error = error.message;
      } catch (error) {
        health.auth.status = 'error';
        health.auth.error = error.message;
        health.auth.response_time = Date.now() - authStart;
      }

      // Test storage
      const storageStart = Date.now();
      try {
        const { data, error } = await supabaseAdmin.storage.listBuckets();
        health.storage.response_time = Date.now() - storageStart;
        health.storage.status = error ? 'error' : 'healthy';
        if (error) health.storage.error = error.message;
        health.storage.buckets = data?.length || 0;
      } catch (error) {
        health.storage.status = 'error';
        health.storage.error = error.message;
        health.storage.response_time = Date.now() - storageStart;
      }

      // Overall system status
      const services = [health.database, health.auth, health.storage];
      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const overallStatus = healthyServices === services.length ? 'healthy' : 
                           healthyServices >= services.length * 0.7 ? 'degraded' : 'critical';

      console.log('✅ [ADMIN] System health check completed');

      res.json({
        success: true,
        data: {
          ...health,
          overall_status: overallStatus,
          services_healthy: healthyServices,
          services_total: services.length
        }
      });

    } catch (error) {
      console.error('❌ [ADMIN] System health error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check system health',
        details: error.message
  });
    }
  }
);

/**
 * @route PUT /api/admin/users/:id/password
 * @desc Change user password (Super Admin only)
 * @access Super Admin only
 */
router.put('/users/:id/password', 
  authenticateToken, 
  requireRole(['super_admin']), // Only Super Admin can change passwords
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      console.log(`🔐 [SUPER_ADMIN] Changing password for user ${id}...`);

      // Validate password
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters long',
          code: 'INVALID_PASSWORD'
        });
      }

      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('id', id)
        .single();

      if (fetchError || !existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          details: fetchError?.message
        });
      }

      // Use Supabase Admin API to update password
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password: newPassword }
      );

      if (authError) {
        console.error('❌ [SUPER_ADMIN] Password update error:', authError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update password',
          details: authError.message
        });
      }

      console.log(`✅ [SUPER_ADMIN] Password updated for user: ${existingUser.display_name || existingUser.email}`);

      // Log the action for audit
      await supabaseAdmin
        .from('audit_logs')
        .insert([{
          user_id: req.user.id, // Super Admin who performed the action
          action: 'password_change',
          resource_type: 'user',
          resource_id: id,
          details: {
            target_user: existingUser.display_name || existingUser.email,
            target_user_id: id,
            changed_by: req.profile.display_name || req.profile.email,
            timestamp: new Date().toISOString()
          }
        }]);

      res.json({
        success: true,
        message: `Password updated successfully for ${existingUser.display_name || existingUser.email}`,
        data: {
          user_id: id,
          user_name: existingUser.display_name || existingUser.email
        }
      });

    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Password change API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        details: error.message
      });
    }
  }
);

// =============================================================================
// SUPER ADMIN VERIFICATION ENDPOINTS
// =============================================================================

/**
 * @route GET /api/admin/verify-super-admin
 * @desc Verify super admin access and return admin info
 * @access Super Admin Only
 */
router.get('/verify-super-admin',
  authenticateToken,
  requireRole(['super_admin']),
  async (req, res) => {
    try {
      console.log('🔐 [ADMIN] Verifying super admin access...');
      
      // Get current user profile
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        console.error('❌ [ADMIN] Error fetching admin profile:', error);
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to verify admin access' 
        });
      }

      // Verify super admin role
      if (profile.role !== 'super_admin') {
        console.error('❌ [ADMIN] Access denied: User is not super admin');
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Super admin role required' 
        });
      }

      console.log('✅ [ADMIN] Super admin access verified for:', profile.email);
      
      res.json({
        success: true,
        message: 'Super admin access verified',
        admin: {
          id: profile.id,
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`,
          role: profile.role,
          verified_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ [ADMIN] Error verifying super admin:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error during admin verification' 
      });
    }
  }
);

/**
 * @route GET /api/admin/database-stats
 * @desc Get database statistics for admin dashboard
 * @access Super Admin Only
 */
router.get('/database-stats',
  authenticateToken,
  requireRole(['super_admin']),
  async (req, res) => {
    try {
      console.log('📊 [ADMIN] Getting database statistics...');
      
      // Get counts from major tables
      const [
        { count: usersCount },
        { count: bookingsCount },
        { count: readingsCount },
        { count: notificationsCount }
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact' }),
        supabaseAdmin.from('bookings').select('id', { count: 'exact' }),
        supabaseAdmin.from('tarot_readings').select('id', { count: 'exact' }),
        supabaseAdmin.from('notifications').select('id', { count: 'exact' })
      ]);

      const stats = {
        users: usersCount || 0,
        bookings: bookingsCount || 0,
        readings: readingsCount || 0,
        notifications: notificationsCount || 0,
        generated_at: new Date().toISOString()
      };

      console.log('✅ [ADMIN] Database stats retrieved:', stats);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ [ADMIN] Error getting database stats:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to retrieve database statistics' 
      });
    }
  }
);

export default router; 