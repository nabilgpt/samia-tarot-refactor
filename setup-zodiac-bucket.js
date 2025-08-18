// 🚨 CRITICAL: Setup Supabase Storage Bucket for Zodiac Audio
import { supabaseAdmin } from './src/api/lib/supabase.js';

async function setupZodiacBucket() {
  try {
    console.log('🚨 [PRODUCTION SETUP] Creating zodiac-audio bucket...');
    
    // Create the bucket
    const { data, error } = await supabaseAdmin.storage.createBucket('zodiac-audio', {
      public: true,
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
      fileSizeLimit: 10485760 // 10MB per file
    });

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Failed to create bucket:', error);
      return false;
    }

    console.log('✅ Bucket created or already exists');

    // Verify bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('❌ Failed to list buckets:', listError);
      return false;
    }

    const zodiacBucket = buckets.find(b => b.name === 'zodiac-audio');
    if (!zodiacBucket) {
      console.error('❌ Bucket not found after creation');
      return false;
    }

    console.log('✅ Bucket verified:', zodiacBucket.name, '- Public:', zodiacBucket.public);

    // Test upload
    console.log('🧪 Testing bucket functionality...');
    const testContent = Buffer.from('Test audio file for zodiac system');
    const testPath = `test/setup-test-${Date.now()}.mp3`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('zodiac-audio')
      .upload(testPath, testContent, {
        contentType: 'audio/mpeg'
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      return false;
    }

    console.log('✅ Test upload successful');

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('zodiac-audio')
      .getPublicUrl(testPath);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    // Clean up test file
    const { error: deleteError } = await supabaseAdmin.storage
      .from('zodiac-audio')
      .remove([testPath]);

    if (deleteError) {
      console.warn('⚠️ Test cleanup failed:', deleteError);
    } else {
      console.log('✅ Test cleanup completed');
    }

    console.log('\n🎉 ZODIAC BUCKET SETUP COMPLETE');
    console.log('='.repeat(50));
    return true;

  } catch (error) {
    console.error('🚨 CRITICAL ERROR:', error);
    return false;
  }
}

setupZodiacBucket().then(success => {
  if (success) {
    console.log('✅ Ready for zodiac audio generation with cloud storage');
    process.exit(0);
  } else {
    console.error('❌ Setup failed - check Supabase configuration');
    process.exit(1);
  }
}).catch(error => {
  console.error('🚨 Setup crashed:', error);
  process.exit(1);
}); 