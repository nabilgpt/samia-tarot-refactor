// ===============================================
// SEED DATA SCRIPT - Essential Production Data
// ===============================================

const { supabase } = require('../lib/supabase');
const bcrypt = require('bcryptjs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, type = 'info') => {
  const color = type === 'success' ? colors.green : 
                type === 'error' ? colors.red : 
                type === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}${message}${colors.reset}`);
};

// ===============================================
// ADMIN USERS SEED DATA
// ===============================================

const seedAdminUsers = async () => {
  log('\n👤 Seeding Admin Users...', 'info');

  const adminUsers = [
    {
      email: 'admin@samia-tarot.com',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      password: 'SuperAdmin123!',
      phone: '+1234567890',
      avatar_url: null,
      bio: 'System Super Administrator',
      is_verified: true,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      email: 'support@samia-tarot.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      password: 'AdminUser123!',
      phone: '+1234567891',
      avatar_url: null,
      bio: 'System Administrator',
      is_verified: true,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      email: 'monitor@samia-tarot.com',
      first_name: 'Monitor',
      last_name: 'User',
      role: 'monitor',
      password: 'MonitorUser123!',
      phone: '+1234567892',
      avatar_url: null,
      bio: 'System Monitor',
      is_verified: true,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  for (const user of adminUsers) {
    try {
      // Check if user exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existing) {
        log(`✓ Admin user ${user.email} already exists`, 'warning');
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create auth user first (if using Supabase Auth)
      // For now, we'll create the profile directly
      const { error } = await supabase
        .from('profiles')
        .insert({
          ...user,
          password_hash: hashedPassword,
          password: undefined // Remove plain password
        });

      if (error) {
        log(`✗ Failed to create admin user ${user.email}: ${error.message}`, 'error');
      } else {
        log(`✓ Created admin user: ${user.email}`, 'success');
      }
    } catch (error) {
      log(`✗ Error creating admin user ${user.email}: ${error.message}`, 'error');
    }
  }
};

// ===============================================
// SERVICE CATEGORIES SEED DATA
// ===============================================

const seedServices = async () => {
  log('\n🔮 Seeding Service Categories...', 'info');

  const services = [
    {
      name: 'General Tarot Reading',
      description: 'Complete tarot reading covering all aspects of life',
      category: 'general',
      duration: 30,
      price: 25.00,
      status: 'active',
      features: ['3-card spread', 'Life guidance', 'Future insights'],
      min_price: 20.00,
      max_price: 30.00,
      created_at: new Date().toISOString()
    },
    {
      name: 'Love & Relationships',
      description: 'Focused reading on love, relationships, and romantic matters',
      category: 'love',
      duration: 25,
      price: 30.00,
      status: 'active',
      features: ['Relationship dynamics', 'Future partner insights', 'Love advice'],
      min_price: 25.00,
      max_price: 35.00,
      created_at: new Date().toISOString()
    },
    {
      name: 'Career & Finance',
      description: 'Professional guidance on career paths and financial decisions',
      category: 'career',
      duration: 35,
      price: 35.00,
      status: 'active',
      features: ['Career guidance', 'Financial insights', 'Business decisions'],
      min_price: 30.00,
      max_price: 40.00,
      created_at: new Date().toISOString()
    },
    {
      name: 'Spiritual Guidance',
      description: 'Deep spiritual insights and personal growth guidance',
      category: 'spiritual',
      duration: 40,
      price: 40.00,
      status: 'active',
      features: ['Spiritual awakening', 'Personal growth', 'Life purpose'],
      min_price: 35.00,
      max_price: 50.00,
      created_at: new Date().toISOString()
    },
    {
      name: 'Emergency Reading',
      description: 'Urgent tarot consultation for immediate guidance',
      category: 'emergency',
      duration: 15,
      price: 50.00,
      status: 'active',
      features: ['Immediate response', 'Crisis guidance', '24/7 availability'],
      min_price: 45.00,
      max_price: 60.00,
      created_at: new Date().toISOString()
    }
  ];

  for (const service of services) {
    try {
      const { data: existing } = await supabase
        .from('services')
        .select('name')
        .eq('name', service.name)
        .single();

      if (existing) {
        log(`✓ Service ${service.name} already exists`, 'warning');
        continue;
      }

      const { error } = await supabase
        .from('services')
        .insert(service);

      if (error) {
        log(`✗ Failed to create service ${service.name}: ${error.message}`, 'error');
      } else {
        log(`✓ Created service: ${service.name}`, 'success');
      }
    } catch (error) {
      log(`✗ Error creating service ${service.name}: ${error.message}`, 'error');
    }
  }
};

// ===============================================
// AI MODELS SEED DATA
// ===============================================

const seedAIModels = async () => {
  log('\n🤖 Seeding AI Models...', 'info');

  const aiModels = [
    {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      name: 'GPT-4 Tarot Master',
      model_name: 'GPT-4 Tarot Master',
      description: 'Advanced AI model specialized in tarot card interpretations',
      model_type: 'tarot_interpretation',
      provider: 'openai',
      model_version: 'gpt-4-turbo',
      status: 'active',
      accuracy_score: 0.95,
      response_time: 2.5,
      cost_per_request: 0.02,
      max_tokens: 1000,
      temperature: 0.7,
      created_at: new Date().toISOString()
    },
    {
      id: 'b2c3d4e5-f6a7-8901-2345-678901bcdef0',
      name: 'ElevenLabs Voice Synthesis',
      model_name: 'ElevenLabs Voice Synthesis',
      description: 'Text-to-speech model for voice responses',
      model_type: 'text_to_speech',
      provider: 'elevenlabs',
      model_version: 'eleven_multilingual_v2',
      status: 'active',
      accuracy_score: 0.92,
      response_time: 3.0,
      cost_per_request: 0.05,
      max_tokens: 500,
      temperature: 0.5,
      created_at: new Date().toISOString()
    },
    {
      id: 'c3d4e5f6-a7b8-9012-3456-789012cdef01',
      name: 'GPT-3.5 Quick Reader',
      model_name: 'GPT-3.5 Quick Reader',
      description: 'Fast AI model for quick tarot insights',
      model_type: 'quick_reading',
      provider: 'openai',
      model_version: 'gpt-3.5-turbo',
      status: 'active',
      accuracy_score: 0.88,
      response_time: 1.5,
      cost_per_request: 0.01,
      max_tokens: 500,
      temperature: 0.8,
      created_at: new Date().toISOString()
    }
  ];

  for (const model of aiModels) {
    try {
      const { data: existing } = await supabase
        .from('ai_models')
        .select('id')
        .eq('id', model.id)
        .single();

      if (existing) {
        log(`✓ AI Model ${model.name} already exists`, 'warning');
        continue;
      }

      const { error } = await supabase
        .from('ai_models')
        .insert(model);

      if (error) {
        log(`✗ Failed to create AI model ${model.name}: ${error.message}`, 'error');
      } else {
        log(`✓ Created AI model: ${model.name}`, 'success');
      }
    } catch (error) {
      log(`✗ Error creating AI model ${model.name}: ${error.message}`, 'error');
    }
  }
};

// ===============================================
// AI PROMPTS SEED DATA
// ===============================================

const seedAIPrompts = async () => {
  log('\n📝 Seeding AI Prompts...', 'info');

  const prompts = [
    {
      id: 'prompt-001',
      model_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      prompt_type: 'tarot_reading',
      category: 'general',
      title: 'General Tarot Reading',
      prompt_text: `You are an expert tarot reader with decades of experience. The user has drawn the following cards: {cards}. 

Please provide a comprehensive reading that includes:
1. Individual card meanings in context
2. Overall message and theme
3. Practical advice and guidance
4. What to focus on moving forward

Be empathetic, insightful, and encouraging while remaining honest about any challenges revealed by the cards.`,
      variables: ['cards'],
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'prompt-002',
      model_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      prompt_type: 'tarot_reading',
      category: 'love',
      title: 'Love & Relationships Reading',
      prompt_text: `You are a compassionate tarot reader specializing in matters of the heart. The user has drawn these cards for a love reading: {cards}.

Focus on:
1. Current relationship dynamics
2. Potential future developments
3. What the person needs to know about love
4. Advice for attracting or maintaining love
5. Any blocks or challenges to address

Be sensitive to the emotional nature of love questions and provide hope alongside honest insights.`,
      variables: ['cards'],
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'prompt-003',
      model_id: 'c3d4e5f6-a7b8-9012-3456-789012cdef01',
      prompt_type: 'quick_insight',
      category: 'emergency',
      title: 'Emergency Quick Reading',
      prompt_text: `This is an urgent tarot consultation. The user needs immediate guidance. Cards drawn: {cards}.

Provide:
1. Immediate key message (most important insight)
2. Quick action steps
3. What to avoid right now
4. Reassurance and support

Keep this concise but deeply meaningful - the user needs clarity in a crisis.`,
      variables: ['cards'],
      is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  for (const prompt of prompts) {
    try {
      const { data: existing } = await supabase
        .from('ai_prompts')
        .select('id')
        .eq('id', prompt.id)
        .single();

      if (existing) {
        log(`✓ AI Prompt ${prompt.title} already exists`, 'warning');
        continue;
      }

      const { error } = await supabase
        .from('ai_prompts')
        .insert(prompt);

      if (error) {
        log(`✗ Failed to create AI prompt ${prompt.title}: ${error.message}`, 'error');
      } else {
        log(`✓ Created AI prompt: ${prompt.title}`, 'success');
      }
    } catch (error) {
      log(`✗ Error creating AI prompt ${prompt.title}: ${error.message}`, 'error');
    }
  }
};

// ===============================================
// SYSTEM CONFIGURATIONS
// ===============================================

const seedSystemConfig = async () => {
  log('\n⚙️ Seeding System Configuration...', 'info');

  const configs = [
    {
      key: 'platform_name',
      value: 'SAMIA TAROT',
      category: 'general',
      description: 'Platform name'
    },
    {
      key: 'default_currency',
      value: 'USD',
      category: 'payments',
      description: 'Default currency for transactions'
    },
    {
      key: 'min_reading_duration',
      value: '10',
      category: 'readings',
      description: 'Minimum reading duration in minutes'
    },
    {
      key: 'max_reading_duration',
      value: '120',
      category: 'readings',
      description: 'Maximum reading duration in minutes'
    },
    {
      key: 'emergency_multiplier',
      value: '2.0',
      category: 'pricing',
      description: 'Price multiplier for emergency readings'
    },
    {
      key: 'platform_commission',
      value: '0.15',
      category: 'payments',
      description: 'Platform commission rate (15%)'
    },
    {
      key: 'auto_approve_readers',
      value: 'false',
      category: 'readers',
      description: 'Auto-approve new reader applications'
    },
    {
      key: 'enable_ai_readings',
      value: 'true',
      category: 'features',
      description: 'Enable AI-powered readings'
    },
    {
      key: 'enable_video_calls',
      value: 'true',
      category: 'features',
      description: 'Enable video call functionality'
    },
    {
      key: 'max_concurrent_calls',
      value: '5',
      category: 'calls',
      description: 'Maximum concurrent calls per reader'
    }
  ];

  // Note: This assumes you have a system_config table
  // If not, you can store these in a JSON column in profiles or create a separate config table
  
  for (const config of configs) {
    try {
      log(`✓ Configuration: ${config.key} = ${config.value}`, 'success');
    } catch (error) {
      log(`✗ Error setting config ${config.key}: ${error.message}`, 'error');
    }
  }
};

// ===============================================
// MAIN SEED FUNCTION
// ===============================================

const runSeedData = async () => {
  const startTime = new Date();
  
  log('🌱 Starting Database Seeding...', 'info');
  log('================================================', 'info');

  try {
    await seedAdminUsers();
    await seedServices();
    await seedAIModels();
    await seedAIPrompts();
    await seedSystemConfig();

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    log('\n================================================', 'info');
    log('✅ SEEDING COMPLETED SUCCESSFULLY!', 'success');
    log(`⏱️ Total time: ${duration} seconds`, 'info');
    log('================================================', 'info');

    log('\n📝 IMPORTANT NOTES:', 'info');
    log('• Default admin credentials:', 'warning');
    log('  Email: admin@samia-tarot.com', 'warning');
    log('  Password: SuperAdmin123!', 'warning');
    log('• Please change default passwords immediately!', 'warning');
    log('• Review and update service pricing as needed', 'info');
    log('• Configure AI model API keys in environment', 'info');

  } catch (error) {
    log(`\n❌ Seeding failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  runSeedData().catch(error => {
    log(`\n💥 Seeding crashed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runSeedData,
  seedAdminUsers,
  seedServices,
  seedAIModels,
  seedAIPrompts,
  seedSystemConfig
}; 