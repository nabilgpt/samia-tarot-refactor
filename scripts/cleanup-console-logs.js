#!/usr/bin/env node

/**
 * Console Logs Cleanup Script
 * SAMIA TAROT - Production Debug Cleanup
 * 
 * This script removes all console.* statements from production code
 * while preserving critical error handling and development debugging.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONSOLE_PATTERNS = [
  /console\.log\([^;]*\);?/g,
  /console\.warn\([^;]*\);?/g,
  /console\.error\([^;]*\);?/g,
  /console\.debug\([^;]*\);?/g,
  /console\.info\([^;]*\);?/g
];

const PROTECTED_PATTERNS = [
  // Keep critical error logging
  /console\.error\(['"]❌.*\);/,
  /console\.error\(['"]🚨.*\);/,
  // Keep development-only logs
  /if\s*\(.*DEV.*\)\s*{[\s\S]*?console\./
];

const TARGET_DIRECTORIES = [
  'src/components',
  'src/context',
  'src/hooks',
  'src/services',
  'src/utils',
  'src/pages'
];

const TARGET_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

let cleanupStats = {
  filesProcessed: 0,
  logsRemoved: 0,
  errorsFound: 0
};

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return TARGET_EXTENSIONS.includes(ext);
}

function isProtectedLog(logStatement) {
  return PROTECTED_PATTERNS.some(pattern => pattern.test(logStatement));
}

function cleanConsoleLogsFromContent(content, filePath) {
  let modifiedContent = content;
  let removedCount = 0;
  
  CONSOLE_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern) || [];
    
    matches.forEach(match => {
      if (!isProtectedLog(match)) {
        // Comment out instead of removing to preserve line numbers
        const commentedLog = `// ${match} // REMOVED: Production debug cleanup`;
        modifiedContent = modifiedContent.replace(match, commentedLog);
        removedCount++;
      }
    });
  });
  
  return { content: modifiedContent, removedCount };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: cleanedContent, removedCount } = cleanConsoleLogsFromContent(content, filePath);
    
    if (removedCount > 0) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');
      console.log(`✅ ${filePath}: ${removedCount} console statements cleaned`);
      cleanupStats.logsRemoved += removedCount;
    }
    
    cleanupStats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    cleanupStats.errorsFound++;
  }
}

function walkDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath);
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    });
  } catch (error) {
    console.error(`❌ Error walking directory ${dirPath}:`, error.message);
    cleanupStats.errorsFound++;
  }
}

function main() {
  console.log('🧹 SAMIA TAROT - Console Logs Cleanup Starting...');
  console.log('================================================');
  
  TARGET_DIRECTORIES.forEach(dir => {
    const fullPath = path.resolve(dir);
    if (fs.existsSync(fullPath)) {
      console.log(`🔍 Processing: ${dir}`);
      walkDirectory(fullPath);
    } else {
      console.warn(`⚠️ Directory not found: ${dir}`);
    }
  });
  
  console.log('\n📊 CLEANUP SUMMARY:');
  console.log('==================');
  console.log(`Files Processed: ${cleanupStats.filesProcessed}`);
  console.log(`Console Statements Removed: ${cleanupStats.logsRemoved}`);
  console.log(`Errors Found: ${cleanupStats.errorsFound}`);
  
  if (cleanupStats.errorsFound === 0) {
    console.log('\n✅ Console logs cleanup completed successfully!');
    console.log('🔄 Next: Run linting to verify clean code');
  } else {
    console.log('\n⚠️ Some errors occurred during cleanup');
    console.log('Please review the error messages above');
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanConsoleLogsFromContent, processFile }; 