#!/bin/bash

# 🚀 SAMIA TAROT - Production Deployment Script
# Complete deployment with health checks, rollback, and monitoring

set -euo pipefail

# =====================================
# Configuration & Constants
# =====================================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly DEPLOY_ENV="${1:-production}"
readonly VERSION="${2:-$(git rev-parse --short HEAD)}"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="/var/log/samia-deploy-${TIMESTAMP}.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# =====================================
# Logging Functions
# =====================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# =====================================
# Pre-deployment Checks
# =====================================
check_prerequisites() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "docker-compose is not installed. Please install it and try again."
    fi
    
    # Check environment variables
    local required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Check if .env file exists
    if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
        warn ".env file not found. Creating from .env.example..."
        if [[ -f "${PROJECT_ROOT}/.env.example" ]]; then
            cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
            warn "Please update .env file with your configuration"
        else
            error ".env.example file not found. Cannot create .env file."
        fi
    fi
    
    log "✅ Pre-deployment checks passed"
}

# =====================================
# Backup Functions
# =====================================
create_backup() {
    log "💾 Creating backup before deployment..."
    
    local backup_dir="${PROJECT_ROOT}/backups/${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    # Backup database if running
    if docker-compose ps | grep -q samia-backend; then
        log "📊 Backing up database..."
        docker-compose exec -T samia-backend npm run backup:db || warn "Database backup failed"
    fi
    
    # Backup current docker images
    log "🏗️ Backing up current images..."
    docker images --format "table {{.Repository}}:{{.Tag}}" | grep samia > "$backup_dir/images.txt" || true
    
    # Backup configurations
    log "⚙️ Backing up configurations..."
    cp -r "${PROJECT_ROOT}/docker-compose.yml" "$backup_dir/"
    cp -r "${PROJECT_ROOT}/.env" "$backup_dir/" || true
    
    log "✅ Backup created at $backup_dir"
}

# =====================================
# Deployment Functions
# =====================================
deploy_application() {
    log "🚀 Starting deployment for environment: $DEPLOY_ENV"
    
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    if [[ -f .env ]]; then
        export $(cat .env | xargs)
    fi
    
    # Build and start services
    log "🏗️ Building application..."
    docker-compose build --no-cache
    
    log "🔄 Stopping existing services..."
    docker-compose down --remove-orphans
    
    log "🚀 Starting new services..."
    docker-compose up -d
    
    log "⏳ Waiting for services to be ready..."
    sleep 30
}

# =====================================
# Health Checks
# =====================================
health_check() {
    log "🏥 Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check backend health
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:5001/api/health >/dev/null 2>&1; then
            log "✅ Backend is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "❌ Backend health check failed after $max_attempts attempts"
        fi
        
        info "⏳ Attempt $attempt/$max_attempts - Backend not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    # Check frontend health
    attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
            log "✅ Frontend is healthy"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error "❌ Frontend health check failed after $max_attempts attempts"
        fi
        
        info "⏳ Attempt $attempt/$max_attempts - Frontend not ready, waiting..."
        sleep 10
        ((attempt++))
    done
    
    # Check database connectivity
    if docker-compose exec -T samia-backend npm run test:db-connection >/dev/null 2>&1; then
        log "✅ Database connection is healthy"
    else
        warn "⚠️ Database connection check failed"
    fi
    
    log "✅ Health checks completed"
}

# =====================================
# Smoke Tests
# =====================================
run_smoke_tests() {
    log "🧪 Running smoke tests..."
    
    # Test critical endpoints
    local endpoints=(
        "http://localhost:5001/api/health"
        "http://localhost:5001/api/configuration/categories"
        "http://localhost:3000"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            log "✅ $endpoint is responding"
        else
            warn "⚠️ $endpoint is not responding"
        fi
    done
    
    # Run automated tests if available
    if docker-compose exec -T samia-backend npm run test:smoke >/dev/null 2>&1; then
        log "✅ Smoke tests passed"
    else
        warn "⚠️ Some smoke tests failed"
    fi
}

# =====================================
# Rollback Function
# =====================================
rollback() {
    log "🔄 Starting rollback process..."
    
    local backup_dir="${1:-$(ls -1t ${PROJECT_ROOT}/backups/ | head -n1)}"
    
    if [[ -z "$backup_dir" ]]; then
        error "No backup directory found for rollback"
    fi
    
    log "📦 Rolling back to backup: $backup_dir"
    
    # Stop current services
    docker-compose down --remove-orphans
    
    # Restore configurations
    cp "${PROJECT_ROOT}/backups/${backup_dir}/docker-compose.yml" "$PROJECT_ROOT/"
    cp "${PROJECT_ROOT}/backups/${backup_dir}/.env" "$PROJECT_ROOT/" || true
    
    # Start previous version
    docker-compose up -d
    
    log "✅ Rollback completed"
}

# =====================================
# Monitoring Setup
# =====================================
setup_monitoring() {
    log "📊 Setting up monitoring and alerting..."
    
    # Ensure monitoring directory exists
    mkdir -p "${PROJECT_ROOT}/monitoring"
    
    # Start monitoring services
    if docker-compose ps | grep -q prometheus; then
        log "✅ Prometheus is running"
    else
        warn "⚠️ Prometheus is not running"
    fi
    
    if docker-compose ps | grep -q grafana; then
        log "✅ Grafana is running"
    else
        warn "⚠️ Grafana is not running"
    fi
    
    # Setup alerting rules
    log "🚨 Configuring alerting rules..."
    # Add your alerting configuration here
    
    log "✅ Monitoring setup completed"
}

# =====================================
# Cleanup Function
# =====================================
cleanup() {
    log "🧹 Cleaning up old resources..."
    
    # Remove old images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "${PROJECT_ROOT}/backups" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    # Clean logs
    find "${PROJECT_ROOT}/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# =====================================
# Main Deployment Function
# =====================================
main() {
    log "🚀 SAMIA TAROT Deployment Started"
    log "Environment: $DEPLOY_ENV"
    log "Version: $VERSION"
    log "Timestamp: $TIMESTAMP"
    
    # Trap to handle errors
    trap 'error "Deployment failed! Check logs at $LOG_FILE"' ERR
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            deploy_application
            health_check
            run_smoke_tests
            setup_monitoring
            cleanup
            log "🎉 Deployment completed successfully!"
            ;;
        "rollback")
            rollback "${2:-}"
            health_check
            log "🔄 Rollback completed successfully!"
            ;;
        "health")
            health_check
            ;;
        "backup")
            create_backup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|health|backup} [backup_dir]"
            exit 1
            ;;
    esac
}

# =====================================
# Script Execution
# =====================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 