// Script to add logging to remote-models endpoint
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = './src/api/routes/dynamicAIRoutes.js';

try {
  console.log('🔧 Adding enhanced logging to remote-models endpoint...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add logging to the beginning of the remote-models endpoint
  const logCode = `    console.log('🔍 [REMOTE-MODELS] Starting remote models fetch for provider:', providerId);
    console.log('🔍 [REMOTE-MODELS] Request headers:', req.headers);
    console.log('🔍 [REMOTE-MODELS] User:', req.user);
    
    // Get provider details first
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select('*')
      .eq('id', providerId)
      .single();
    
    if (providerError) {
      console.error('❌ [REMOTE-MODELS] Provider not found:', providerError);
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }
    
    console.log('🔍 [REMOTE-MODELS] Provider found:', provider.name, 'Type:', provider.provider_type);
    
    // Get API key using the same method as test provider
    let apiKey;
    try {
      apiKey = await getAPIKeyFromSystemSecrets(provider.provider_type);
      console.log('✅ [REMOTE-MODELS] API key retrieved successfully');
    } catch (error) {
      console.error('❌ [REMOTE-MODELS] API key retrieval failed:', error.message);
      return res.status(400).json({
        success: false,
        error: 'Failed to retrieve API key: ' + error.message
      });
    }
    
    console.log('🔍 [REMOTE-MODELS] About to test provider with API key...');
    `;
  
  // Find the remote-models route and add logging
  const routePattern = /router\.get\('\/providers\/:providerId\/remote-models'/;
  const match = content.match(routePattern);
  
  if (match) {
    console.log('✅ Found remote-models route, adding logging...');
    
    // Find the start of the try block
    const tryPattern = /try\s*\{/;
    const tryMatch = content.substring(match.index).match(tryPattern);
    
    if (tryMatch) {
      const insertIndex = match.index + tryMatch.index + tryMatch[0].length;
      content = content.substring(0, insertIndex) + '\n' + logCode + content.substring(insertIndex);
      
      fs.writeFileSync(filePath, content);
      console.log('✅ Successfully added logging to remote-models endpoint');
    } else {
      console.log('❌ Could not find try block in remote-models endpoint');
    }
  } else {
    console.log('❌ Could not find remote-models route');
  }
  
} catch (error) {
  console.error('❌ Error adding logging:', error.message);
}

console.log('🎯 Now restart the backend server to see detailed logs'); 