import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Execute Enhanced Providers System Migration
router.post('/execute-enhanced-providers', authenticateToken, async (req, res) => {
    try {
        console.log('🚀 Starting Enhanced Providers System migration...');
        
        // Check if user is super admin
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Super admin access required'
            });
        }
        
        const migrationSteps = [];
        
        // Step 1: Create providers table
        console.log('1️⃣ Creating providers table...');
        const { error: providersError } = await supabaseAdmin
            .rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS providers (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(64) UNIQUE NOT NULL,
                        provider_type VARCHAR(32) NOT NULL CHECK (provider_type IN ('AI', 'payments', 'tts', 'storage', 'analytics', 'communication', 'security', 'other')),
                        logo_url VARCHAR(256),
                        description TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT now(),
                        updated_at TIMESTAMP DEFAULT now()
                    );
                `
            });
        
        if (providersError) {
            console.error('❌ Failed to create providers table:', providersError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create providers table',
                details: providersError
            });
        }
        
        migrationSteps.push('✅ Providers table created');
        console.log('✅ Providers table created');
        
        // Step 2: Create provider_services table
        console.log('2️⃣ Creating provider_services table...');
        const { error: servicesError } = await supabaseAdmin
            .rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS provider_services (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
                        name VARCHAR(64) NOT NULL,
                        description TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT now(),
                        updated_at TIMESTAMP DEFAULT now(),
                        UNIQUE(provider_id, name)
                    );
                `
            });
        
        if (servicesError) {
            console.error('❌ Failed to create provider_services table:', servicesError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create provider_services table',
                details: servicesError
            });
        }
        
        migrationSteps.push('✅ Provider_services table created');
        console.log('✅ Provider_services table created');
        
        // Step 3: Create provider_models table
        console.log('3️⃣ Creating provider_models table...');
        const { error: modelsError } = await supabaseAdmin
            .rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS provider_models (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
                        name VARCHAR(64) NOT NULL,
                        description TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT now(),
                        updated_at TIMESTAMP DEFAULT now(),
                        UNIQUE(provider_id, name)
                    );
                `
            });
        
        if (modelsError) {
            console.error('❌ Failed to create provider_models table:', modelsError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create provider_models table',
                details: modelsError
            });
        }
        
        migrationSteps.push('✅ Provider_models table created');
        console.log('✅ Provider_models table created');
        
        // Step 4: Create provider_secrets table
        console.log('4️⃣ Creating provider_secrets table...');
        const { error: secretsError } = await supabaseAdmin
            .rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS provider_secrets (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
                        model_id UUID REFERENCES provider_models(id) ON DELETE SET NULL,
                        secret_key VARCHAR(128) NOT NULL,
                        secret_value_encrypted TEXT NOT NULL,
                        usage_scope VARCHAR(32)[] DEFAULT ARRAY['backend'],
                        services UUID[] DEFAULT ARRAY[]::UUID[],
                        region VARCHAR(32),
                        expiration_date TIMESTAMP,
                        tags VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR[],
                        description TEXT,
                        active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT now(),
                        updated_at TIMESTAMP DEFAULT now(),
                        CONSTRAINT unique_secret_per_provider_key UNIQUE(provider_id, secret_key, region)
                    );
                `
            });
        
        if (secretsError) {
            console.error('❌ Failed to create provider_secrets table:', secretsError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create provider_secrets table',
                details: secretsError
            });
        }
        
        migrationSteps.push('✅ Provider_secrets table created');
        console.log('✅ Provider_secrets table created');
        
        // Step 5: Create indexes
        console.log('5️⃣ Creating indexes...');
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);',
            'CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(active);',
            'CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);',
            'CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(active);',
            'CREATE INDEX IF NOT EXISTS idx_provider_models_provider_id ON provider_models(provider_id);',
            'CREATE INDEX IF NOT EXISTS idx_provider_models_active ON provider_models(active);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_provider_id ON provider_secrets(provider_id);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_model_id ON provider_secrets(model_id);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_active ON provider_secrets(active);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_usage_scope ON provider_secrets USING GIN(usage_scope);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_services ON provider_secrets USING GIN(services);',
            'CREATE INDEX IF NOT EXISTS idx_provider_secrets_tags ON provider_secrets USING GIN(tags);'
        ];
        
        const indexResults = [];
        for (const query of indexQueries) {
            const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query });
            if (error) {
                console.warn('⚠️ Index creation warning:', error.message);
                indexResults.push(`⚠️ ${error.message}`);
            } else {
                indexResults.push('✅ Index created');
            }
        }
        
        migrationSteps.push('✅ Indexes created');
        console.log('✅ Indexes created');
        
        // Step 6: Insert sample data
        console.log('6️⃣ Inserting sample data...');
        
        // Insert providers
        const { error: providersInsertError } = await supabaseAdmin
            .from('providers')
            .upsert([
                { name: 'OpenAI', provider_type: 'AI', description: 'Advanced AI language models and services', logo_url: 'https://openai.com/favicon.ico' },
                { name: 'Anthropic', provider_type: 'AI', description: 'Claude AI assistant and language models', logo_url: 'https://anthropic.com/favicon.ico' },
                { name: 'Google Cloud', provider_type: 'AI', description: 'Google Cloud AI and machine learning services', logo_url: 'https://cloud.google.com/favicon.ico' },
                { name: 'Microsoft Azure', provider_type: 'AI', description: 'Azure AI and cognitive services', logo_url: 'https://azure.microsoft.com/favicon.ico' },
                { name: 'Stripe', provider_type: 'payments', description: 'Online payment processing platform', logo_url: 'https://stripe.com/favicon.ico' },
                { name: 'PayPal', provider_type: 'payments', description: 'Digital payment and money transfer service', logo_url: 'https://paypal.com/favicon.ico' },
                { name: 'ElevenLabs', provider_type: 'tts', description: 'AI voice synthesis and text-to-speech', logo_url: 'https://elevenlabs.io/favicon.ico' },
                { name: 'Amazon S3', provider_type: 'storage', description: 'Cloud storage and content delivery', logo_url: 'https://aws.amazon.com/favicon.ico' }
            ], { onConflict: 'name' });
        
        if (providersInsertError) {
            console.error('❌ Failed to insert providers:', providersInsertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to insert providers',
                details: providersInsertError
            });
        }
        
        migrationSteps.push('✅ Providers inserted');
        console.log('✅ Providers inserted');
        
        // Get provider IDs for services and models
        const { data: providers } = await supabaseAdmin
            .from('providers')
            .select('id, name');
        
        const providerMap = {};
        providers.forEach(p => {
            providerMap[p.name] = p.id;
        });
        
        // Insert services
        const { error: servicesInsertError } = await supabaseAdmin
            .from('provider_services')
            .upsert([
                { provider_id: providerMap['OpenAI'], name: 'chat', description: 'Chat completion API' },
                { provider_id: providerMap['OpenAI'], name: 'completion', description: 'Text completion API' },
                { provider_id: providerMap['OpenAI'], name: 'embedding', description: 'Text embedding API' },
                { provider_id: providerMap['OpenAI'], name: 'image', description: 'Image generation API' },
                { provider_id: providerMap['Anthropic'], name: 'chat', description: 'Claude chat API' },
                { provider_id: providerMap['Anthropic'], name: 'completion', description: 'Claude completion API' },
                { provider_id: providerMap['Google Cloud'], name: 'translation', description: 'Google Translate API' },
                { provider_id: providerMap['Google Cloud'], name: 'vision', description: 'Google Vision API' },
                { provider_id: providerMap['Stripe'], name: 'payment', description: 'Payment processing' },
                { provider_id: providerMap['PayPal'], name: 'payment', description: 'PayPal payment processing' },
                { provider_id: providerMap['ElevenLabs'], name: 'tts', description: 'Text-to-speech conversion' },
                { provider_id: providerMap['Amazon S3'], name: 'storage', description: 'File storage and retrieval' }
            ], { onConflict: 'provider_id,name' });
        
        if (servicesInsertError) {
            console.error('❌ Failed to insert services:', servicesInsertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to insert services',
                details: servicesInsertError
            });
        }
        
        migrationSteps.push('✅ Services inserted');
        console.log('✅ Services inserted');
        
        // Insert models
        const { error: modelsInsertError } = await supabaseAdmin
            .from('provider_models')
            .upsert([
                { provider_id: providerMap['OpenAI'], name: 'gpt-4', description: 'Most capable GPT-4 model' },
                { provider_id: providerMap['OpenAI'], name: 'gpt-3.5-turbo', description: 'Fast and efficient GPT-3.5 model' },
                { provider_id: providerMap['OpenAI'], name: 'text-embedding-ada-002', description: 'Text embedding model' },
                { provider_id: providerMap['OpenAI'], name: 'dall-e-3', description: 'Image generation model' },
                { provider_id: providerMap['Anthropic'], name: 'claude-3-opus', description: 'Most capable Claude model' },
                { provider_id: providerMap['Anthropic'], name: 'claude-3-sonnet', description: 'Balanced Claude model' },
                { provider_id: providerMap['Anthropic'], name: 'claude-3-haiku', description: 'Fastest Claude model' },
                { provider_id: providerMap['Google Cloud'], name: 'translate-v3', description: 'Google Translate v3 API' },
                { provider_id: providerMap['ElevenLabs'], name: 'eleven-multilingual-v2', description: 'Multilingual voice model' },
                { provider_id: providerMap['ElevenLabs'], name: 'eleven-turbo-v2', description: 'Fast voice synthesis model' }
            ], { onConflict: 'provider_id,name' });
        
        if (modelsInsertError) {
            console.error('❌ Failed to insert models:', modelsInsertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to insert models',
                details: modelsInsertError
            });
        }
        
        migrationSteps.push('✅ Models inserted');
        console.log('✅ Models inserted');
        
        // Final verification
        console.log('7️⃣ Verifying migration...');
        
        const { count: providersCount } = await supabaseAdmin
            .from('providers')
            .select('*', { count: 'exact', head: true });
        
        const { count: servicesCount } = await supabaseAdmin
            .from('provider_services')
            .select('*', { count: 'exact', head: true });
        
        const { count: modelsCount } = await supabaseAdmin
            .from('provider_models')
            .select('*', { count: 'exact', head: true });
        
        const { count: secretsCount } = await supabaseAdmin
            .from('provider_secrets')
            .select('*', { count: 'exact', head: true });
        
        const finalCounts = {
            providers: providersCount,
            provider_services: servicesCount,
            provider_models: modelsCount,
            provider_secrets: secretsCount
        };
        
        console.log('📊 Final counts:', finalCounts);
        console.log('🎉 Enhanced Providers System migration completed successfully!');
        
        migrationSteps.push('✅ Migration completed successfully');
        
        res.json({
            success: true,
            message: 'Enhanced Providers System migration completed successfully',
            steps: migrationSteps,
            counts: finalCounts
        });
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            details: error.message
        });
    }
});

export default router; 