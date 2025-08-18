#!/usr/bin/env node

/**
 * SAMIA TAROT - Phase 5 Server Management System
 * 
 * Bulletproof server kill-and-restart automation for all deployments.
 * CRITICAL: This ensures zero-memory-leak deployments and proper language system updates.
 * 
 * NEVER skip the kill step - even for minor changes!
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ServerManager {
    constructor() {
        this.platform = os.platform();
        this.logFile = path.join(__dirname, '..', 'logs', 'server-management.log');
        this.pidFile = path.join(__dirname, '..', 'logs', 'backend.pid');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(`🔧 ${logEntry.trim()}`);
        
        try {
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async killAllNodeProcesses() {
        this.log('🛑 Starting server kill sequence...', 'WARN');
        
        return new Promise((resolve, reject) => {
            let killCommand;
            
            switch (this.platform) {
                case 'win32':
                    killCommand = 'taskkill /F /IM node.exe';
                    break;
                case 'darwin':
                case 'linux':
                    killCommand = 'killall node';
                    break;
                default:
                    this.log(`❌ Unsupported platform: ${this.platform}`, 'ERROR');
                    return reject(new Error(`Unsupported platform: ${this.platform}`));
            }

            this.log(`💀 Executing: ${killCommand}`);
            
            exec(killCommand, (error, stdout, stderr) => {
                if (error) {
                    // On some systems, killall returns error when no processes found
                    if (error.code === 1 && this.platform !== 'win32') {
                        this.log('✅ No node processes were running');
                        return resolve();
                    }
                    this.log(`❌ Kill command failed: ${error.message}`, 'ERROR');
                    return reject(error);
                }
                
                this.log('✅ All node processes terminated successfully');
                resolve();
            });
        });
    }

    async waitForPortClear(port = 5001, maxWait = 10000) {
        this.log(`⏳ Waiting for port ${port} to clear...`);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            try {
                const net = await import('net');
                const server = net.default.createServer();
                
                await new Promise((resolve, reject) => {
                    server.listen(port, () => {
                        server.close();
                        resolve();
                    });
                    
                    server.on('error', () => {
                        reject();
                    });
                });
                
                this.log(`✅ Port ${port} is clear`);
                return;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        throw new Error(`Port ${port} did not clear within ${maxWait}ms`);
    }

    async startBackendServer() {
        this.log('🚀 Starting backend server...');
        
        // Ensure we're in the correct directory
        const projectRoot = path.join(__dirname, '..');
        process.chdir(projectRoot);
        
        return new Promise((resolve, reject) => {
            const server = spawn('npm', ['run', 'backend'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                shell: true
            });

            // Store PID for tracking
            if (server.pid) {
                fs.writeFileSync(this.pidFile, server.pid.toString());
                this.log(`📝 Backend server PID: ${server.pid}`);
            }

            let hasStarted = false;
            const startupTimeout = setTimeout(() => {
                if (!hasStarted) {
                    this.log('❌ Backend server startup timeout', 'ERROR');
                    server.kill();
                    reject(new Error('Server startup timeout'));
                }
            }, 30000); // 30 second timeout

            server.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(`📤 Backend: ${output.trim()}`);
                
                // Look for successful startup indicators
                if (output.includes('Server running on port') || 
                    output.includes('🚀') || 
                    output.includes('listening')) {
                    if (!hasStarted) {
                        hasStarted = true;
                        clearTimeout(startupTimeout);
                        this.log('✅ Backend server started successfully');
                        resolve(server);
                    }
                }
            });

            server.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`📥 Backend Error: ${error.trim()}`);
                this.log(`Backend Error: ${error.trim()}`, 'ERROR');
            });

            server.on('close', (code) => {
                this.log(`🔴 Backend server exited with code: ${code}`);
                if (fs.existsSync(this.pidFile)) {
                    fs.unlinkSync(this.pidFile);
                }
            });

            server.on('error', (error) => {
                this.log(`❌ Failed to start backend server: ${error.message}`, 'ERROR');
                clearTimeout(startupTimeout);
                reject(error);
            });
        });
    }

    async performHealthCheck() {
        this.log('🏥 Performing health check...');
        
        try {
            const http = await import('http');
            
            const healthCheck = new Promise((resolve, reject) => {
                const req = http.default.get('http://localhost:5001/api/health', (res) => {
                    if (res.statusCode === 200) {
                        resolve();
                    } else {
                        reject(new Error(`Health check failed with status: ${res.statusCode}`));
                    }
                });
                
                req.on('error', reject);
                req.setTimeout(5000, () => {
                    req.destroy();
                    reject(new Error('Health check timeout'));
                });
            });
            
            await healthCheck;
            this.log('✅ Health check passed');
            return true;
        } catch (error) {
            this.log(`❌ Health check failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async safeRestart(reason = 'Manual restart', user = 'System') {
        const startTime = Date.now();
        this.log(`🔄 SAFE RESTART INITIATED`, 'WARN');
        this.log(`📋 Reason: ${reason}`);
        this.log(`👤 User: ${user}`);
        
        try {
            // Step 1: Kill all node processes
            await this.killAllNodeProcesses();
            
            // Step 2: Wait for ports to clear
            await this.waitForPortClear(5001);
            
            // Step 3: Start backend server
            const server = await this.startBackendServer();
            
            // Step 4: Health check
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s for full startup
            const healthCheckPassed = await this.performHealthCheck();
            
            if (!healthCheckPassed) {
                throw new Error('Health check failed after restart');
            }
            
            const duration = Date.now() - startTime;
            this.log(`🎉 SAFE RESTART COMPLETED in ${duration}ms`, 'SUCCESS');
            
            return {
                success: true,
                duration,
                pid: server.pid,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log(`💥 SAFE RESTART FAILED after ${duration}ms: ${error.message}`, 'ERROR');
            
            return {
                success: false,
                error: error.message,
                duration,
                timestamp: new Date().toISOString()
            };
        }
    }

    async emergencyKill() {
        this.log('🚨 EMERGENCY KILL INITIATED', 'WARN');
        
        try {
            await this.killAllNodeProcesses();
            
            // Also try to kill by PID if we have it
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                try {
                    process.kill(parseInt(pid), 'SIGTERM');
                    this.log(`💀 Killed process by PID: ${pid}`);
                } catch (pidError) {
                    this.log(`⚠️ Could not kill by PID ${pid}: ${pidError.message}`, 'WARN');
                }
                fs.unlinkSync(this.pidFile);
            }
            
            this.log('✅ Emergency kill completed');
            return { success: true };
            
        } catch (error) {
            this.log(`❌ Emergency kill failed: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const serverManager = new ServerManager();
    const command = process.argv[2];
    const reason = process.argv[3] || 'CLI command';
    const user = process.argv[4] || process.env.USER || process.env.USERNAME || 'System';

    async function runCommand() {
        try {
            switch (command) {
                case 'restart':
                    const result = await serverManager.safeRestart(reason, user);
                    process.exit(result.success ? 0 : 1);
                    break;
                    
                case 'kill':
                    await serverManager.emergencyKill();
                    process.exit(0);
                    break;
                    
                case 'start':
                    await serverManager.startBackendServer();
                    break;
                    
                case 'health':
                    const healthy = await serverManager.performHealthCheck();
                    process.exit(healthy ? 0 : 1);
                    break;
                    
                default:
                    console.log(`
🔧 SAMIA TAROT Server Manager - Phase 5

Usage:
  node scripts/server-manager.js restart [reason] [user]  - Safe kill and restart
  node scripts/server-manager.js kill                     - Emergency kill only
  node scripts/server-manager.js start                    - Start server only
  node scripts/server-manager.js health                   - Health check only

Examples:
  node scripts/server-manager.js restart "Language update" "Admin"
  node scripts/server-manager.js restart "Database migration" "CI/CD"
  node scripts/server-manager.js kill
                    `);
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Command failed:', error.message);
            process.exit(1);
        }
    }

    runCommand();
}

export default ServerManager; 