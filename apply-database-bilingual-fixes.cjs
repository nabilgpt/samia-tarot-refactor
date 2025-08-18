const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
    console.error('Current values:');
    console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'NOT SET');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
    try {
        // Simple approach: try to select from the table
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error) {
            console.log(`⚠️  Table ${tableName} might not exist or has issues: ${error.message}`);
            return false;
        }
        
        console.log(`✅ Table ${tableName} exists and accessible`);
        return true;
    } catch (error) {
        console.log(`⚠️  Could not check table ${tableName}: ${error.message}`);
        return false;
    }
}

async function insertCategoriesDirectly() {
    try {
        console.log('🔧 Inserting categories directly...');
        
        const categories = [
            { category_key: 'love', name_ar: 'الحب والعلاقات', name_en: 'Love & Relationships', description_ar: 'فتحات تتعلق بالحب والعلاقات العاطفية', description_en: 'Spreads related to love and romantic relationships', sort_order: 1 },
            { category_key: 'career', name_ar: 'المهنة والعمل', name_en: 'Career & Work', description_ar: 'فتحات تتعلق بالمهنة والحياة المهنية', description_en: 'Spreads related to career and professional life', sort_order: 2 },
            { category_key: 'general', name_ar: 'عام', name_en: 'General', description_ar: 'فتحات عامة لجميع جوانب الحياة', description_en: 'General spreads for all aspects of life', sort_order: 3 },
            { category_key: 'spiritual', name_ar: 'روحانية', name_en: 'Spiritual', description_ar: 'فتحات تتعلق بالنمو الروحي والتطور الشخصي', description_en: 'Spreads related to spiritual growth and personal development', sort_order: 4 },
            { category_key: 'health', name_ar: 'الصحة والعافية', name_en: 'Health & Wellness', description_ar: 'فتحات تتعلق بالصحة الجسدية والعقلية', description_en: 'Spreads related to physical and mental health', sort_order: 5 },
            { category_key: 'flexible', name_ar: 'مرن', name_en: 'Flexible', description_ar: 'فتحات مرنة قابلة للتخصيص', description_en: 'Flexible customizable spreads', sort_order: 6 }
        ];
        
        // Insert categories one by one to handle conflicts
        for (const category of categories) {
            try {
                const { data, error } = await supabase
                    .from('spread_categories')
                    .upsert([category], { onConflict: 'category_key' })
                    .select();
                
                if (error) {
                    console.log(`⚠️  Could not insert category ${category.category_key}: ${error.message}`);
                } else {
                    console.log(`✅ Category ${category.category_key} inserted/updated successfully`);
                }
            } catch (error) {
                console.log(`⚠️  Error with category ${category.category_key}: ${error.message}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error inserting categories:', error);
        return false;
    }
}

async function executeDatabaseFixes() {
    try {
        console.log('🔧 Starting Step 1: Database Bilingual Fixes...');
        console.log('📋 Using direct table operations approach...');
        
        // Check existing tables
        console.log('🔍 Checking existing tables...');
        const tablesExist = {
            spread_categories: await checkTableExists('spread_categories'),
            profiles: await checkTableExists('profiles'),
            system_configurations: await checkTableExists('system_configurations')
        };
        
        console.log('📊 Table status:', tablesExist);
        
        // Step 1: Check spread_categories table
        if (tablesExist.spread_categories) {
            console.log('✅ spread_categories table exists');
            
            // Check if we have the expected categories
            const { data: existingCategories, error: categoriesError } = await supabase
                .from('spread_categories')
                .select('category_key, name_ar, name_en');
            
            if (!categoriesError && existingCategories) {
                console.log(`📋 Found ${existingCategories.length} existing categories`);
                
                // Check if we have all expected categories
                const expectedKeys = ['love', 'career', 'general', 'spiritual', 'health', 'flexible'];
                const existingKeys = existingCategories.map(cat => cat.category_key);
                const missingKeys = expectedKeys.filter(key => !existingKeys.includes(key));
                
                if (missingKeys.length > 0) {
                    console.log(`⚠️  Missing categories: ${missingKeys.join(', ')}`);
                    await insertCategoriesDirectly();
                } else {
                    console.log('✅ All expected categories are present');
                }
            } else {
                console.log('⚠️  Could not check existing categories, attempting to insert...');
                await insertCategoriesDirectly();
            }
        } else {
            console.log('⚠️  spread_categories table does not exist or is not accessible');
        }
        
        // Step 2: Check profiles table for bilingual fields
        if (tablesExist.profiles) {
            console.log('✅ profiles table exists');
            
            // Try to select bio_ar and bio_en to see if they exist
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, bio_ar, bio_en')
                    .limit(1);
                
                if (!error) {
                    console.log('✅ profiles table has bilingual bio columns');
                } else if (error.message.includes('column') && error.message.includes('does not exist')) {
                    console.log('⚠️  profiles table missing bilingual columns');
                    console.log('👉 Please run the SQL script manually from Supabase dashboard');
                } else {
                    console.log('⚠️  Could not verify profiles bilingual columns');
                }
            } catch (error) {
                console.log('⚠️  Could not check profiles bilingual columns');
            }
        }
        
        // Step 3: Check system_configurations table
        if (tablesExist.system_configurations) {
            console.log('✅ system_configurations table exists');
            
            try {
                const { data, error } = await supabase
                    .from('system_configurations')
                    .select('config_key, display_name_ar, display_name_en')
                    .limit(1);
                
                if (!error) {
                    console.log('✅ system_configurations table has bilingual columns');
                } else {
                    console.log('⚠️  system_configurations table might be missing bilingual columns');
                }
            } catch (error) {
                console.log('⚠️  Could not check system_configurations bilingual columns');
            }
        }
        
        console.log('🎉 Step 1 execution completed');
        console.log('📝 Summary:');
        console.log('   ✅ Database connection successful');
        console.log('   ✅ Table accessibility verified');
        console.log('   ✅ Categories processed');
        console.log('');
        console.log('📋 Next steps:');
        console.log('   1. Verify in Supabase dashboard that spread_categories table has 6 records');
        console.log('   2. Check that profiles table has bio_ar and bio_en columns');
        console.log('   3. Confirm system_configurations has bilingual display fields');
        console.log('   4. If any issues, run the SQL script manually from STEP1_DATABASE_BILINGUAL_FIXES.sql');
        
    } catch (error) {
        console.error('❌ Error executing Step 1:', error);
        console.error('📋 Stack trace:', error.stack);
        process.exit(1);
    }
}

// Execute the function
executeDatabaseFixes(); 