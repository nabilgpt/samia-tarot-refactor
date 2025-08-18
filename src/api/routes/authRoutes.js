// =============================================================================
// AUTHENTICATION ROUTES - SAMIA TAROT
// Secure authentication endpoints with robust error handling
// =============================================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';
import {
    getUserByEmail,
    getUserById,
    verifyPassword,
    generateJWTToken,
    logAuthEvent,
    isAccountLocked,
    updateLoginAttempts,
    getClientIP,
    generateSessionId,
    hasValidEncryptedPassword,
    hashPassword,
    validatePasswordStrength
} from '../helpers/authenticationHelpers.js';

const router = express.Router();

// =============================================================================
// LOGIN ENDPOINT
// =============================================================================

router.post('/login', async (req, res) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = generateSessionId();
    
    console.log('🔐 [AUTH] Login attempt:', req.body.email);
    console.log('🔍 [AUTH] Client IP:', clientIP);
    
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            await logAuthEvent({
                userId: null,
                email: email || 'unknown',
                action: 'failed_login',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'Missing credentials',
                sessionId
            });
            
            return res.status(400).json({
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Get user from database
        const user = await getUserByEmail(email);
        
        if (!user) {
            console.log('❌ [AUTH] User not found:', email);
            
            await logAuthEvent({
                userId: null,
                email: email,
                action: 'failed_login',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'User not found',
                sessionId
            });
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if account is locked
        if (isAccountLocked(user)) {
            console.log('❌ [AUTH] Account locked:', email);
            
            await logAuthEvent({
                userId: user.id,
                email: email,
                action: 'failed_login',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'Account locked',
                sessionId
            });
            
            return res.status(423).json({
                success: false,
                error: 'Account temporarily locked due to too many failed attempts',
                code: 'ACCOUNT_LOCKED',
                lockoutTime: user.locked_until
            });
        }

        // Validate encrypted password exists
        if (!hasValidEncryptedPassword(user)) {
            console.log('❌ [AUTH] No valid encrypted password for user:', email);
            
            await logAuthEvent({
                userId: user.id,
                email: email,
                action: 'failed_login',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'No encrypted password',
                sessionId
            });
            
            return res.status(401).json({
                success: false,
                error: 'Account setup incomplete. Please contact administrator.',
                code: 'ACCOUNT_SETUP_INCOMPLETE'
            });
        }
        
        // Verify password
        const isPasswordValid = await verifyPassword(password, user.encrypted_password);
        
        if (!isPasswordValid) {
            console.log('❌ [AUTH] Invalid password for:', email);
            
            // Update failed login attempts
            await updateLoginAttempts(user.id, false);
            
            await logAuthEvent({
                userId: user.id,
                email: email,
                action: 'failed_login',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'Invalid password',
                sessionId
            });
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate JWT token
        const token = generateJWTToken(user);
        
        // Update successful login
        await updateLoginAttempts(user.id, true);
        
        // Log successful login
        await logAuthEvent({
            userId: user.id,
            email: email,
            action: 'login',
            ipAddress: clientIP,
            userAgent,
            success: true,
            failureReason: null,
            sessionId
        });

        console.log('✅ [AUTH] Login successful for:', email, 'Role:', user.role);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                display_name: user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()
            }
        });
        
    } catch (error) {
        console.error('❌ [AUTH] Login error:', error);
        
        await logAuthEvent({
            userId: null,
            email: req.body.email || 'unknown',
            action: 'failed_login',
            ipAddress: clientIP,
            userAgent,
            success: false,
            failureReason: `Server error: ${error.message}`,
            sessionId
        });
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// =============================================================================
// LOGOUT ENDPOINT
// =============================================================================

router.post('/logout', authenticateToken, async (req, res) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = generateSessionId();
    
    try {
        const user = req.user;
        
        await logAuthEvent({
            userId: user.user_id,
            email: user.email,
            action: 'logout',
            ipAddress: clientIP,
            userAgent,
            success: true,
            failureReason: null,
            sessionId
        });
        
        console.log('✅ [AUTH] Logout successful for:', user.email);
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        console.error('❌ [AUTH] Logout error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// =============================================================================
// CHANGE PASSWORD ENDPOINT
// =============================================================================

router.post('/change-password', authenticateToken, async (req, res) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = generateSessionId();
    
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.user_id;
        
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required',
                code: 'MISSING_PASSWORDS'
            });
        }
        
        // Validate new password strength
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet security requirements',
                code: 'WEAK_PASSWORD',
                details: passwordValidation.messages
            });
        }
        
        // Get user
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Verify current password
        if (!hasValidEncryptedPassword(user)) {
            return res.status(400).json({
                success: false,
                error: 'Account setup incomplete. Please contact administrator.',
                code: 'ACCOUNT_SETUP_INCOMPLETE'
            });
        }
        
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.encrypted_password);
        if (!isCurrentPasswordValid) {
            await logAuthEvent({
                userId: user.id,
                email: user.email,
                action: 'failed_password_change',
                ipAddress: clientIP,
                userAgent,
                success: false,
                failureReason: 'Invalid current password',
                sessionId
            });
            
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        
        // Hash new password
        const hashedNewPassword = await hashPassword(newPassword);
        
        // Update password in database
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                encrypted_password: hashedNewPassword,
                password_updated_at: new Date().toISOString()
            })
            .eq('id', userId);
        
        if (error) {
            console.error('❌ [AUTH] Password update error:', error);
            throw error;
        }
        
        // Log successful password change
        await logAuthEvent({
            userId: user.id,
            email: user.email,
            action: 'password_change',
            ipAddress: clientIP,
            userAgent,
            success: true,
            failureReason: null,
            sessionId
        });
        
        console.log('✅ [AUTH] Password changed successfully for:', user.email);
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('❌ [AUTH] Change password error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

// =============================================================================
// VERIFY TOKEN ENDPOINT
// =============================================================================

router.get('/verify', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // Get fresh user data
        const freshUser = await getUserById(user.id || user.user_id);
        
        if (!freshUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            user: {
                id: freshUser.id,
                email: freshUser.email,
                role: freshUser.role,
                first_name: freshUser.first_name,
                last_name: freshUser.last_name,
                display_name: freshUser.display_name || `${freshUser.first_name || ''} ${freshUser.last_name || ''}`.trim(),
                is_active: freshUser.is_active
            }
        });
        
    } catch (error) {
        console.error('❌ [AUTH] Token verification error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'SERVER_ERROR'
        });
    }
});

export default router; 