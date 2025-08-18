#!/bin/bash

# SAMIA TAROT - Phase 5 Unix Server Restart Script
# This script ensures proper kill-and-restart flow on Linux/macOS

echo "🔧 SAMIA TAROT Server Restart (Unix)"
echo "=========================================="

REASON="${1:-Manual restart}"
USER="${2:-$USER}"

echo "📋 Reason: $REASON"
echo "👤 User: $USER"
echo "=========================================="

# Change to project root
cd "$(dirname "$0")/.."

# Run the server manager
node scripts/server-manager.js restart "$REASON" "$USER"

if [ $? -eq 0 ]; then
    echo "✅ Server restart completed successfully"
    exit 0
else
    echo "❌ Server restart failed"
    exit 1
fi 