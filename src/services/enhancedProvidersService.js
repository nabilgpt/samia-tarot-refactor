// Enhanced Providers Service
// SAMIA TAROT - Enhanced Providers & Secrets Management System
import { supabaseAdmin } from '../lib/supabase.js';
import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

class EnhancedProvidersService {
    // Encryption utilities
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
        cipher.setAAD(Buffer.from('enhanced-providers', 'utf8'));
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encryptedData) {
        const { encrypted, iv, authTag } = encryptedData;
        
        const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
        decipher.setAAD(Buffer.from('enhanced-providers', 'utf8'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Providers CRUD operations
    async getAllProviders(filters = {}) {
        try {
            let query = supabaseAdmin
                .from('providers')
                .select('*');

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
            }

            if (filters.type) {
                query = query.eq('provider_type', filters.type);
            }

            if (filters.active !== undefined) {
                query = query.eq('active', filters.active);
            }

            if (filters.sortBy) {
                query = query.order(filters.sortBy, { 
                    ascending: filters.sortOrder === 'asc' 
                });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching providers:', error);
            return { success: false, error: error.message };
        }
    }

    async createProvider(providerData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('providers')
                .insert([providerData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error creating provider:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProvider(id, providerData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('providers')
                .update(providerData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error updating provider:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProvider(id) {
        try {
            const { error } = await supabaseAdmin
                .from('providers')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting provider:', error);
            return { success: false, error: error.message };
        }
    }

    // Services CRUD operations
    async getProviderServices(providerId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('provider_services')
                .select('*')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching provider services:', error);
            return { success: false, error: error.message };
        }
    }

    async createProviderService(serviceData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('provider_services')
                .insert([serviceData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error creating provider service:', error);
            return { success: false, error: error.message };
        }
    }

    // Models CRUD operations
    async getProviderModels(providerId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('provider_models')
                .select('*')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching provider models:', error);
            return { success: false, error: error.message };
        }
    }

    async createProviderModel(modelData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('provider_models')
                .insert([modelData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error creating provider model:', error);
            return { success: false, error: error.message };
        }
    }

    // Secrets CRUD operations
    async getProviderSecrets(providerId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('provider_secrets')
                .select('*')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error fetching provider secrets:', error);
            return { success: false, error: error.message };
        }
    }

    async createProviderSecret(secretData) {
        try {
            // Encrypt the secret value
            const encryptedValue = this.encrypt(secretData.secret_value);
            
            const dataToInsert = {
                ...secretData,
                secret_value_encrypted: JSON.stringify(encryptedValue)
            };

            delete dataToInsert.secret_value; // Remove plain text value

            const { data, error } = await supabaseAdmin
                .from('provider_secrets')
                .insert([dataToInsert])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error creating provider secret:', error);
            return { success: false, error: error.message };
        }
    }

    // Statistics and analytics
    async getProviderStats() {
        try {
            const { data: providers, error: providersError } = await supabaseAdmin
                .from('providers')
                .select('*', { count: 'exact' });

            const { data: services, error: servicesError } = await supabaseAdmin
                .from('provider_services')
                .select('*', { count: 'exact' });

            const { data: models, error: modelsError } = await supabaseAdmin
                .from('provider_models')
                .select('*', { count: 'exact' });

            const { data: secrets, error: secretsError } = await supabaseAdmin
                .from('provider_secrets')
                .select('*', { count: 'exact' });

            if (providersError || servicesError || modelsError || secretsError) {
                throw new Error('Error fetching statistics');
            }

            return {
                success: true,
                data: {
                    providers: providers?.length || 0,
                    services: services?.length || 0,
                    models: models?.length || 0,
                    secrets: secrets?.length || 0
                }
            };
        } catch (error) {
            console.error('Error fetching provider stats:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new EnhancedProvidersService(); 