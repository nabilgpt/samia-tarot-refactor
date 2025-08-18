// 🚨 CRITICAL: Create Supabase Storage Bucket for Zodiac Audio
// This script must be run once to set up cloud storage infrastructure

import { createClient } from '@supabase/supabase-js';

// Use environment variables from the running backend
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('🚨 CRITICAL: Missing Supabase environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createZodiacBucket() {
  console.log('🚨 [PRODUCTION SETUP] Creating zodiac-audio bucket...');
  console.log('='.repeat(80));

  try {
    // 1. Create the bucket
    const { data, error } = await supabase.storage.createBucket('zodiac-audio', {
      public: true,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
      fileSizeLimit: 10485760 // 10MB per file
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket already exists - OK');
      } else {
        console.error('❌ Failed to create bucket:', error);
        return false;
      }
    } else {
      console.log('✅ Bucket created successfully');
    }

    // 2. Verify bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      return false;
    }

    const zodiacBucket = buckets.find(b => b.name === 'zodiac-audio');
    if (!zodiacBucket) {
      console.error('❌ Bucket not found after creation');
      return false;
    }

    console.log('✅ Bucket verified:', zodiacBucket);

    // 3. Test upload
    console.log('\n🧪 Testing bucket functionality...');
    const testContent = Buffer.from('Test audio file for zodiac system');
    const testPath = `test/test-${Date.now()}.mp3`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('zodiac-audio')
      .upload(testPath, testContent, {
        contentType: 'audio/mpeg'
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      return false;
    }

    console.log('✅ Test upload successful');

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from('zodiac-audio')
      .getPublicUrl(testPath);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    // 5. Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('zodiac-audio')
      .remove([testPath]);

    if (deleteError) {
      console.warn('⚠️ Test cleanup failed:', deleteError);
    } else {
      console.log('✅ Test cleanup completed');
    }

    console.log('\n🎉 ZODIAC BUCKET SETUP COMPLETE');
    console.log('='.repeat(80));
    return true;

  } catch (error) {
    console.error('🚨 CRITICAL ERROR:', error);
    return false;
  }
}

// Run the setup
createZodiacBucket().then(success => {
  if (success) {
    console.log('✅ Ready for zodiac audio generation');
    process.exit(0);
  } else {
    console.error('❌ Setup failed - check configuration');
    process.exit(1);
  }
}).catch(error => {
  console.error('🚨 Setup crashed:', error);
  process.exit(1);
}); 