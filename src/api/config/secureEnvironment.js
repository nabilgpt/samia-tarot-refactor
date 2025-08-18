// ============================================================================
// 🔒 SECURE ENVIRONMENT VALIDATION SYSTEM
// ============================================================================
// This module enforces security requirements for SAMIA TAROT backend
// ONLY essential bootstrap credentials are allowed from .env
// All other configurations MUST be managed via SuperAdmin Dashboard
// ============================================================================

class EnvironmentValidator {
    constructor() {
        this.requiredBootstrapVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY', 
            'SUPABASE_SERVICE_ROLE_KEY',
            'NODE_ENV',
            'PORT'
        ];
        
        this.allowedBootstrapVars = [
            ...this.requiredBootstrapVars,
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY'
        ];
        
        this.forbiddenInProduction = [
            'STRIPE_SECRET_KEY',
            'OPENAI_API_KEY',
            'TWILIO_AUTH_TOKEN',
            'SMTP_PASS',
            'AGORA_APP_CERTIFICATE',
            'ELEVENLABS_API_KEY',
            'SENDGRID_API_KEY',
            'AWS_SECRET_ACCESS_KEY',
            'CLOUDINARY_API_SECRET'
        ];
    }

    /**
     * Validate that only essential bootstrap credentials are in environment
     * All other configurations must be managed via SuperAdmin Dashboard
     */
    validateEnvironment() {
        console.log('🔒 Validating secure environment configuration...');
        
        const errors = [];
        const warnings = [];
        
        // Check required bootstrap variables
        for (const varName of this.requiredBootstrapVars) {
            if (!process.env[varName]) {
                errors.push(`Missing required bootstrap variable: ${varName}`);
            }
        }
        
        // Validate Supabase URL format
        if (process.env.SUPABASE_URL && !this.isValidSupabaseUrl(process.env.SUPABASE_URL)) {
            errors.push('SUPABASE_URL must be a valid Supabase URL format');
        }
        
        // Validate JWT format for keys (only in production)
        if (process.env.NODE_ENV === 'production') {
            if (process.env.SUPABASE_ANON_KEY && !this.isValidJWT(process.env.SUPABASE_ANON_KEY)) {
                errors.push('SUPABASE_ANON_KEY must be a valid JWT token');
            }
            
            if (process.env.SUPABASE_SERVICE_ROLE_KEY && !this.isValidJWT(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
                errors.push('SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token');
            }
        }
        
        // Check for forbidden variables in production
        if (process.env.NODE_ENV === 'production') {
            for (const varName of this.forbiddenInProduction) {
                if (process.env[varName]) {
                    errors.push(`Security violation: ${varName} found in environment. This must be managed via SuperAdmin Dashboard only!`);
                }
            }
        } else {
            // In development, warn about non-bootstrap variables
            for (const varName of this.forbiddenInProduction) {
                if (process.env[varName]) {
                    warnings.push(`${varName} found in .env. Consider moving to SuperAdmin Dashboard for production.`);
                }
            }
        }
        
        // Check for any non-allowed environment variables
        const envVars = Object.keys(process.env);
        for (const varName of envVars) {
            if (varName.startsWith('npm_') || varName.startsWith('NODE_') || 
                varName === 'PATH' || varName === 'HOME' || varName === 'USER' ||
                varName.startsWith('VSCODE_') || varName.startsWith('TERM') ||
                varName.startsWith('SHELL') || varName.startsWith('PWD') ||
                varName.startsWith('LANG') || varName.startsWith('LC_') ||
                varName.startsWith('PROCESSOR_') || varName.startsWith('PROGRAMFILES') ||
                varName.startsWith('SYSTEM') || varName.startsWith('TEMP') ||
                varName.startsWith('USERPROFILE') || varName.startsWith('WINDIR')) {
                // System variables are OK
                continue;
            }
            
            if (!this.allowedBootstrapVars.includes(varName) && 
                !this.forbiddenInProduction.includes(varName)) {
                // Only warn about unknown variables in development
                if (process.env.NODE_ENV === 'development') {
                    warnings.push(`Unknown environment variable: ${varName}. Consider documenting or removing.`);
                }
            }
        }
        
        // Report results
        if (errors.length > 0) {
            console.error('❌ Environment validation failed:');
            errors.forEach(error => console.error(`   - ${error}`));
            throw new Error(`Environment validation failed: ${errors.join(', ')}`);
        }
        
        if (warnings.length > 0 && warnings.length <= 10) {
            console.warn('⚠️  Environment warnings:');
            warnings.slice(0, 5).forEach(warning => console.warn(`   - ${warning}`));
            if (warnings.length > 5) {
                console.warn(`   ... and ${warnings.length - 5} more warnings`);
            }
        }
        
        console.log('✅ Environment validation passed');
        return {
            isValid: true,
            warnings: warnings.length,
            supabaseUrl: process.env.SUPABASE_URL,
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT || 5001
        };
    }
    
    /**
     * Validate Supabase URL format
     */
    isValidSupabaseUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Allow development placeholder
        if (url.includes('your-project.supabase.co') && process.env.NODE_ENV === 'development') {
            return true;
        }
        
        // Production format: https://[project-id].supabase.co
        const supabaseUrlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
        return supabaseUrlPattern.test(url);
    }
    
    /**
     * Validate JWT token format
     */
    isValidJWT(token) {
        if (!token || typeof token !== 'string') return false;
        
        // Allow development placeholder
        if (token.includes('example') && process.env.NODE_ENV === 'development') {
            return true;
        }
        
        // JWT format: header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            // Validate base64 encoding
            Buffer.from(parts[0], 'base64');
            Buffer.from(parts[1], 'base64');
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get secure configuration summary (without exposing secrets)
     */
    getConfigSummary() {
        const summary = {
            supabaseUrl: process.env.SUPABASE_URL ? this.maskUrl(process.env.SUPABASE_URL) : 'NOT_SET',
            anonKey: process.env.SUPABASE_ANON_KEY ? this.maskToken(process.env.SUPABASE_ANON_KEY) : 'NOT_SET',
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? this.maskToken(process.env.SUPABASE_SERVICE_ROLE_KEY) : 'NOT_SET',
            nodeEnv: process.env.NODE_ENV || 'NOT_SET',
            port: process.env.PORT || '5001',
            isDevelopment: process.env.NODE_ENV === 'development'
        };
        
        return summary;
    }
    
    /**
     * Mask URL for logging (keep domain visible)
     */
    maskUrl(url) {
        if (!url) return 'NOT_SET';
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname.substring(0, 8)}****`;
        } catch {
            return 'INVALID_URL';
        }
    }
    
    /**
     * Mask JWT token for logging (keep first/last 8 chars)
     */
    maskToken(token) {
        if (!token) return 'NOT_SET';
        if (token.length < 16) return '****';
        return `${token.substring(0, 8)}****${token.substring(token.length - 8)}`;
    }
}

// Export singleton instance
const environmentValidator = new EnvironmentValidator();

export const validateEnvironment = () => environmentValidator.validateEnvironment();
export const getConfigSummary = () => environmentValidator.getConfigSummary();
export { EnvironmentValidator }; 