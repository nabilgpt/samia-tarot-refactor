import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES module directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5001';
const OUTPUT_DIR = path.join(__dirname, 'backups');
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout

// Create backup directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${OUTPUT_DIR}`);
}

// Simple fetch function with timeout
async function simpleFetch(url, options = {}) {
    console.log(`🔗 Making request to: ${url}`);
    const http = await import('http');
    const https = await import('https');
    const { URL } = await import('url');
    
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: REQUEST_TIMEOUT
        };
        
        console.log(`📡 Request options:`, requestOptions);
        
        const req = client.request(requestOptions, (res) => {
            console.log(`📨 Response status: ${res.statusCode} ${res.statusMessage}`);
            console.log(`📨 Response headers:`, res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📥 Response data length: ${data.length}`);
                if (data.length < 1000) {
                    console.log(`📥 Response data: ${data}`);
                }
                
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    json: async () => JSON.parse(data),
                    text: async () => data
                });
            });
        });
        
        req.on('error', (error) => {
            console.error(`❌ Request error:`, error);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.error(`⏰ Request timeout after ${REQUEST_TIMEOUT}ms`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

async function runBackup() {
    try {
        console.log('🚀 Starting Pre-Refactor Backup Process...');
        console.log(`🎯 API Base URL: ${API_BASE_URL}`);
        console.log(`📁 Output Directory: ${OUTPUT_DIR}`);
        console.log(`⏰ Request Timeout: ${REQUEST_TIMEOUT}ms`);
        
        // Step 1: Validate backup readiness
        console.log('\n⏳ Step 1: Validating backup readiness...');
        const validateResponse = await simpleFetch(`${API_BASE_URL}/api/system-backup/validate`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!validateResponse.ok) {
            console.error(`❌ Validation failed: ${validateResponse.status} ${validateResponse.statusText}`);
            const errorText = await validateResponse.text();
            console.error('Error details:', errorText);
            return;
        }
        
        const validationResult = await validateResponse.json();
        console.log('✅ Validation successful:', validationResult);
        
        // Step 2: Export backup data
        console.log('\n⏳ Step 2: Exporting backup data...');
        const exportResponse = await simpleFetch(`${API_BASE_URL}/api/system-backup/export`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!exportResponse.ok) {
            console.error(`❌ Export failed: ${exportResponse.status} ${exportResponse.statusText}`);
            const errorText = await exportResponse.text();
            console.error('Error details:', errorText);
            return;
        }
        
        const backupData = await exportResponse.json();
        
        // Step 3: Save backup to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `samia-tarot-backup-${timestamp}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
        
        console.log('\n✅ Backup completed successfully!');
        console.log(`📁 Backup saved to: ${filepath}`);
        console.log(`📊 Backup size: ${fs.statSync(filepath).size} bytes`);
        
        // Display backup summary
        if (backupData.summary) {
            console.log('\n📋 Backup Summary:');
            console.log(`- Export Date: ${backupData.metadata.exportDate}`);
            console.log(`- Total Tables: ${backupData.summary.totalTables}`);
            console.log(`- Total Records: ${backupData.summary.totalRecords}`);
            
            if (backupData.summary.tables) {
                console.log('\n📈 Tables backed up:');
                backupData.summary.tables.forEach(table => {
                    console.log(`  - ${table.name}: ${table.count} records`);
                });
            }
        }
        
        console.log('\n🎉 Pre-Refactor Backup completed successfully!');
        console.log('🔄 System is now ready for safe refactoring.');
        
    } catch (error) {
        console.error('❌ Backup process failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the backup with timeout
console.log('🔧 Starting backup script...');
const overallTimeout = setTimeout(() => {
    console.error('💥 Script overall timeout - script taking too long!');
    process.exit(1);
}, 60000); // 1 minute overall timeout

runBackup().then(() => {
    clearTimeout(overallTimeout);
    console.log('🏁 Backup script finished.');
}).catch(error => {
    clearTimeout(overallTimeout);
    console.error('💥 Backup script crashed:', error);
    process.exit(1);
}); 