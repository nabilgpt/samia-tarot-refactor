#!/usr/bin/env node

/**
 * Development Startup Script
 * Starts both frontend and backend servers
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 SAMIA TAROT - Development Startup');
console.log('='.repeat(50));

// Start backend server
console.log('\n📡 Starting backend server on port 5001...');
const backend = spawn('node', ['src/api/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '5001' }
});

// Wait a moment then start frontend
setTimeout(() => {
  console.log('\n🎨 Starting frontend server on port 5173...');
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit'
  });
  
  frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`);
  });
}, 2000);

backend.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  process.exit(0);
});
