// System Fix Routes - SAMIA TAROT
// Routes for fixing system-level database issues

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import { roleCheck } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * @route POST /api/system-fix/secrets-access-log-constraint
 * @desc Fix the secrets_access_log constraint to include missing access types
 * @access Super Admin Only
 */
router.post('/secrets-access-log-constraint', 
  authenticateToken, 
  roleCheck(['super_admin']), 
  async (req, res) => {
    try {
      console.log('🔧 [SYSTEM FIX] Starting secrets_access_log constraint fix...');
      
      // Step 1: Drop the existing constraint
      console.log('📝 [CONSTRAINT FIX] Dropping existing constraint...');
      const dropResult = await supabaseAdmin.rpc('sql', {
        query: `
          ALTER TABLE secrets_access_log 
          DROP CONSTRAINT IF EXISTS secrets_access_log_access_type_check;
        `
      });
      
      if (dropResult.error) {
        console.error('❌ [CONSTRAINT FIX] Error dropping constraint:', dropResult.error);
      } else {
        console.log('✅ [CONSTRAINT FIX] Existing constraint dropped successfully');
      }
      
      // Step 2: Add the updated constraint
      console.log('📝 [CONSTRAINT FIX] Adding updated constraint...');
      const addResult = await supabaseAdmin.rpc('sql', {
        query: `
          ALTER TABLE secrets_access_log 
          ADD CONSTRAINT secrets_access_log_access_type_check 
          CHECK (access_type IN (
              'read', 'decrypt', 'update', 'delete', 'test', 'export', 'import',
              'create', 'view', 'list', 'bulk_update', 'bulk_delete', 'system_decrypt'
          ));
        `
      });
      
      if (addResult.error) {
        console.error('❌ [CONSTRAINT FIX] Error adding constraint:', addResult.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to add updated constraint',
          details: addResult.error
        });
      }
      
      console.log('✅ [CONSTRAINT FIX] Updated constraint added successfully');
      
      // Step 3: Verify the constraint
      console.log('📝 [CONSTRAINT FIX] Verifying constraint...');
      const verifyResult = await supabaseAdmin.rpc('sql', {
        query: `
          SELECT constraint_name, check_clause 
          FROM information_schema.check_constraints 
          WHERE constraint_name = 'secrets_access_log_access_type_check';
        `
      });
      
      if (verifyResult.error) {
        console.error('❌ [CONSTRAINT FIX] Error verifying constraint:', verifyResult.error);
      } else {
        console.log('✅ [CONSTRAINT FIX] Constraint verification:', verifyResult.data);
      }
      
      res.json({
        success: true,
        message: 'Secrets access log constraint fixed successfully',
        details: {
          constraint_dropped: !dropResult.error,
          constraint_added: !addResult.error,
          verification: verifyResult.data
        }
      });
      
    } catch (error) {
      console.error('❌ [SYSTEM FIX] Fatal error:', error);
      res.status(500).json({
        success: false,
        error: 'System fix failed',
        details: error.message
      });
    }
  }
);

export default router; 