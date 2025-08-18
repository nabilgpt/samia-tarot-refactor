// =============================================================================
// AUTHENTICATION HELPERS - SAMIA TAROT
// Reusable, secure authentication functions
// =============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRY = '24h';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// =============================================================================
// PASSWORD UTILITIES
// =============================================================================

/**
 * Generate secure temporary password with all required character types
 * @returns {string} Secure password meeting all requirements
 */
export function generateSecurePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += chars.charAt(Math.floor(Math.random() * 26)); // Uppercase
    password += chars.charAt(Math.floor(Math.random() * 26) + 26); // Lowercase  
    password += chars.charAt(Math.floor(Math.random() * 10) + 52); // Number
    password += chars.charAt(Math.floor(Math.random() * 8) + 62); // Special
    
    // Fill remaining characters randomly
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Shuffle to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash password using bcrypt with secure salt rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches hash
 */
export async function verifyPassword(password, hash) {
    if (!password || !hash) {
        return false;
    }
    
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('❌ Password verification error:', error);
        return false;
    }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with success flag and messages
 */
export function validatePasswordStrength(password) {
    const result = {
        valid: false,
        messages: []
    };
    
    if (!password || typeof password !== 'string') {
        result.messages.push('Password is required');
        return result;
    }
    
    if (password.length < 8) {
        result.messages.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        result.messages.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        result.messages.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
        result.messages.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
        result.messages.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    result.valid = result.messages.length === 0;
    return result;
}

// =============================================================================
// JWT TOKEN UTILITIES
// =============================================================================

/**
 * Generate JWT token for authenticated user
 * @param {object} user - User object with id, email, role
 * @returns {string} JWT token
 */
export function generateJWTToken(user) {
    if (!user || !user.id || !user.email || !user.role) {
        throw new Error('User object must contain id, email, and role');
    }
    
    const payload = {
        user_id: user.id,
        email: user.email,
        role: user.role
    };
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token and return decoded payload
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export function verifyJWTToken(token) {
    if (!token) {
        throw new Error('Token is required');
    }
    
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return jwt.verify(token, secret);
}

// =============================================================================
// USER AUTHENTICATION
// =============================================================================

/**
 * Get user by email with active status check
 * @param {string} email - User email
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function getUserByEmail(email) {
    if (!email) {
        return null;
    }
    
    try {
        const { data: user, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error fetching user by email:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('❌ Error in getUserByEmail:', error);
        return null;
    }
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User object or null if not found
 */
export async function getUserById(userId) {
    if (!userId) {
        return null;
    }
    
    try {
        const { data: user, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error fetching user by ID:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('❌ Error in getUserById:', error);
        return null;
    }
}

/**
 * Check if user account is locked
 * @param {object} user - User object
 * @returns {boolean} True if account is locked
 */
export function isAccountLocked(user) {
    if (!user || !user.locked_until) {
        return false;
    }
    
    return new Date(user.locked_until) > new Date();
}

/**
 * Update user login attempts and handle account locking
 * @param {string} userId - User ID
 * @param {boolean} loginSuccessful - Whether login was successful
 * @returns {Promise<object>} Update result
 */
export async function updateLoginAttempts(userId, loginSuccessful) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    try {
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        let updateData = {
            last_login_at: new Date().toISOString()
        };
        
        if (loginSuccessful) {
            // Reset failed attempts on successful login
            updateData.failed_login_attempts = 0;
            updateData.locked_until = null;
        } else {
            // Increment failed attempts
            const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
            updateData.failed_login_attempts = newFailedAttempts;
            
            // Lock account if max attempts reached
            if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
                updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION).toISOString();
            }
        }
        
        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
        
        if (error) {
            console.error('❌ Error updating login attempts:', error);
            throw error;
        }
        
        return { success: true, lockoutTime: updateData.locked_until };
    } catch (error) {
        console.error('❌ Error in updateLoginAttempts:', error);
        throw error;
    }
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log authentication event for audit trail
 * @param {object} params - Audit log parameters
 * @returns {Promise<void>}
 */
export async function logAuthEvent(params) {
    const {
        userId,
        email,
        action,
        ipAddress,
        userAgent,
        success,
        failureReason,
        sessionId
    } = params;
    
    try {
        await supabaseAdmin
            .from('auth_audit_log')
            .insert([{
                user_id: userId,
                email: email,
                action: action,
                ip_address: ipAddress,
                user_agent: userAgent,
                success: success,
                failure_reason: failureReason,
                session_id: sessionId
            }]);
    } catch (error) {
        console.error('❌ Error logging auth event:', error);
        // Don't throw error for audit logging failures
    }
}

// =============================================================================
// USER VALIDATION
// =============================================================================

/**
 * Validate user data before creation or update
 * @param {object} userData - User data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {object} Validation result
 */
export function validateUserData(userData, isUpdate = false) {
    const result = {
        valid: false,
        messages: []
    };
    
    if (!userData || typeof userData !== 'object') {
        result.messages.push('User data is required');
        return result;
    }
    
    // Email validation
    if (!isUpdate || userData.email) {
        if (!userData.email) {
            result.messages.push('Email is required');
        } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(userData.email)) {
            result.messages.push('Invalid email format');
        }
    }
    
    // Role validation
    if (!isUpdate || userData.role) {
        const validRoles = ['client', 'reader', 'admin', 'monitor', 'super_admin'];
        if (!userData.role) {
            result.messages.push('Role is required');
        } else if (!validRoles.includes(userData.role)) {
            result.messages.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
    }
    
    // Password validation for new users
    if (!isUpdate && userData.password) {
        const passwordValidation = validatePasswordStrength(userData.password);
        if (!passwordValidation.valid) {
            result.messages.push(...passwordValidation.messages);
        }
    }
    
    result.valid = result.messages.length === 0;
    return result;
}

/**
 * Validate that user has required encrypted password
 * @param {object} user - User object
 * @returns {boolean} True if user has valid encrypted password
 */
export function hasValidEncryptedPassword(user) {
    if (!user || !user.encrypted_password) {
        return false;
    }
    
    // Check if password looks like a bcrypt hash
    const bcryptPattern = /^\$2[abyxz]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;
    return bcryptPattern.test(user.encrypted_password);
}

// =============================================================================
// SECURITY UTILITIES
// =============================================================================

/**
 * Generate secure random token for password reset
 * @returns {string} Secure random token
 */
export function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if password reset token is valid and not expired
 * @param {object} user - User object
 * @param {string} token - Reset token
 * @returns {boolean} True if token is valid
 */
export function isResetTokenValid(user, token) {
    if (!user || !token || !user.password_reset_token || !user.password_reset_expires) {
        return false;
    }
    
    if (user.password_reset_token !== token) {
        return false;
    }
    
    return new Date(user.password_reset_expires) > new Date();
}

/**
 * Extract IP address from request
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
export function getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           '127.0.0.1';
}

/**
 * Generate unique session ID
 * @returns {string} Unique session ID
 */
export function generateSessionId() {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
}

// =============================================================================
// EXPORT ALL FUNCTIONS
// =============================================================================

export default {
    // Password utilities
    generateSecurePassword,
    hashPassword,
    verifyPassword,
    validatePasswordStrength,
    
    // JWT utilities
    generateJWTToken,
    verifyJWTToken,
    
    // User authentication
    getUserByEmail,
    getUserById,
    isAccountLocked,
    updateLoginAttempts,
    
    // Audit logging
    logAuthEvent,
    
    // User validation
    validateUserData,
    hasValidEncryptedPassword,
    
    // Security utilities
    generateResetToken,
    isResetTokenValid,
    getClientIP,
    generateSessionId
}; 