#!/bin/bash
# run_api.sh - Linux/macOS script to start SAMIA-TAROT API
# Usage: ./run_api.sh

set -euo pipefail

HOST=${HOST:-"0.0.0.0"}
PORT=${PORT:-8000}
WORKERS=${WORKERS:-2}

echo "SAMIA-TAROT API Startup Script"
echo "=============================="

# Load .env file if it exists
if [[ -f .env ]]; then
    echo "Loading environment from .env file..."
    export $(grep -v '^#' .env | grep -v '^\s*$' | xargs)
    echo "  Environment loaded"
else
    echo "Warning: .env file not found. Using system environment variables."
fi

# Validate required DB_DSN
if [[ -z "${DB_DSN:-}" ]]; then
    echo "ERROR: DB_DSN environment variable is required"
    echo "Please set DB_DSN in .env file or system environment"
    exit 1
fi

# Check if database is accessible
echo "Validating database connection..."
python3 -c "import psycopg2; psycopg2.connect('$DB_DSN').close(); print('Database connection OK')" || {
    echo "ERROR: Cannot connect to database"
    echo "Check DB_DSN and network connectivity"
    exit 1
}

# Check if migrations are up to date
echo "Checking migration status..."
python3 migrate.py audit | grep -A 10 "Applied migrations:"

# Start the API server
echo "Starting API server..."
echo "Host: $HOST"
echo "Port: $PORT" 
echo "Workers: $WORKERS"
echo ""

exec python3 -m uvicorn api:app --host "$HOST" --port "$PORT" --workers "$WORKERS"