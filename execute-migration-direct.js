// Direct migration execution using Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhgpxvuijdkdgqiuehqp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZ3B4dnVpamRrZGdxaXVlaHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMTA0MjcyNSwiZXhwIjoyMDM2NjE4NzI1fQ.gGBzqIJlGCOiVhkqYOqIhL7Q8WMHqJAiVYAGKJhfPzM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
    console.log('🚀 Starting Enhanced Providers System migration...');
    
    try {
        // Step 1: Create providers table
        console.log('1️⃣ Creating providers table...');
        const { error: providersError } = await supabase
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
        
        if (providersError) {
            console.error('❌ Failed to insert providers:', providersError);
            return;
        }
        console.log('✅ Providers inserted');
        
        // Get provider IDs for services and models
        const { data: providers } = await supabase
            .from('providers')
            .select('id, name');
        
        const providerMap = {};
        providers.forEach(p => {
            providerMap[p.name] = p.id;
        });
        
        // Step 2: Insert services
        console.log('2️⃣ Inserting services...');
        const { error: servicesError } = await supabase
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
        
        if (servicesError) {
            console.error('❌ Failed to insert services:', servicesError);
            return;
        }
        console.log('✅ Services inserted');
        
        // Step 3: Insert models
        console.log('3️⃣ Inserting models...');
        const { error: modelsError } = await supabase
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
        
        if (modelsError) {
            console.error('❌ Failed to insert models:', modelsError);
            return;
        }
        console.log('✅ Models inserted');
        
        // Final verification
        console.log('4️⃣ Verifying migration...');
        
        const { count: providersCount } = await supabase
            .from('providers')
            .select('*', { count: 'exact', head: true });
        
        const { count: servicesCount } = await supabase
            .from('provider_services')
            .select('*', { count: 'exact', head: true });
        
        const { count: modelsCount } = await supabase
            .from('provider_models')
            .select('*', { count: 'exact', head: true });
        
        const { count: secretsCount } = await supabase
            .from('provider_secrets')
            .select('*', { count: 'exact', head: true });
        
        console.log('📊 Final counts:');
        console.log(`  - providers: ${providersCount}`);
        console.log(`  - provider_services: ${servicesCount}`);
        console.log(`  - provider_models: ${modelsCount}`);
        console.log(`  - provider_secrets: ${secretsCount}`);
        
        console.log('🎉 Enhanced Providers System migration completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
    }
}

executeMigration(); 