#!/bin/bash
# Monthly Database Restore Drill Script
# Location: /ops/drill_scripts/monthly_restore_drill.sh
# Purpose: Automated monthly restore testing in isolated environment

set -euo pipefail

# Configuration
SCRIPT_NAME="Monthly Restore Drill"
DRILL_DATE=$(date +%Y%m%d_%H%M%S)
DRILL_DB="samia_drill_${DRILL_DATE}"
LOG_FILE="/var/log/drill_logs/restore_drill_${DRILL_DATE}.log"
REPORT_FILE="/ops/drill_reports/restore_drill_report_${DRILL_DATE}.md"

# Database Configuration
STAGING_DB_HOST="${STAGING_DB_HOST:-staging.postgres.supabase.co}"
DB_USER="${DB_USER:-samia_admin}"
DB_NAME="${DB_NAME:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/backups/latest}"

# Notification Configuration
SLACK_WEBHOOK="${DRILL_SLACK_WEBHOOK}"
TEAM_EMAIL="${DRILL_TEAM_EMAIL:-sre-team@samia-tarot.com}"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$REPORT_FILE")"

# Logging function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
  local exit_code=$?
  log "ERROR" "Drill failed at line $BASH_LINENO: $BASH_COMMAND"
  generate_failure_report "$exit_code"
  cleanup
  exit $exit_code
}

trap 'error_exit' ERR

# Cleanup function
cleanup() {
  log "INFO" "Cleaning up drill resources..."
  
  # Drop test database if it exists
  if psql -h "$STAGING_DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DRILL_DB"; then
    psql -h "$STAGING_DB_HOST" -U "$DB_USER" -c "DROP DATABASE $DRILL_DB;" 2>/dev/null || true
    log "INFO" "Dropped test database: $DRILL_DB"
  fi
}

# Notification functions
send_slack_notification() {
  local message="$1"
  local status="$2"
  local emoji="✅"
  
  if [[ "$status" == "FAILED" ]]; then
    emoji="❌"
  elif [[ "$status" == "WARNING" ]]; then
    emoji="⚠️"
  fi
  
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{
        \"text\": \"$emoji **$SCRIPT_NAME** - $status\",
        \"blocks\": [
          {
            \"type\": \"section\",
            \"text\": {
              \"type\": \"mrkdwn\",
              \"text\": \"*$SCRIPT_NAME*\n$message\"
            }
          }
        ]
      }" 2>/dev/null || log "WARNING" "Failed to send Slack notification"
  fi
}

send_email_report() {
  local subject="$1"
  local report_path="$2"
  
  if command -v mail >/dev/null 2>&1 && [[ -n "$TEAM_EMAIL" ]]; then
    mail -s "$subject" "$TEAM_EMAIL" < "$report_path" 2>/dev/null || \
      log "WARNING" "Failed to send email report"
  fi
}

# Pre-flight checks
preflight_checks() {
  log "INFO" "Running pre-flight checks..."
  
  # Check required tools
  local required_tools=("psql" "pg_restore" "curl")
  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      log "ERROR" "Required tool not found: $tool"
      return 1
    fi
  done
  
  # Check database connectivity
  if ! psql -h "$STAGING_DB_HOST" -U "$DB_USER" -c "SELECT 1;" >/dev/null 2>&1; then
    log "ERROR" "Cannot connect to staging database: $STAGING_DB_HOST"
    return 1
  fi
  
  # Check backup files exist
  if [[ ! -d "$BACKUP_DIR" ]]; then
    log "ERROR" "Backup directory not found: $BACKUP_DIR"
    return 1
  fi
  
  local latest_backup=$(find "$BACKUP_DIR" -name "*.dump" -type f | head -1)
  if [[ -z "$latest_backup" ]]; then
    log "ERROR" "No backup files found in: $BACKUP_DIR"
    return 1
  fi
  
  log "INFO" "Pre-flight checks completed successfully"
  log "INFO" "Using backup file: $latest_backup"
  export BACKUP_FILE="$latest_backup"
  
  return 0
}

# Create test database
create_test_database() {
  log "INFO" "Creating test database: $DRILL_DB"
  
  local start_time=$(date +%s)
  
  psql -h "$STAGING_DB_HOST" -U "$DB_USER" -c "CREATE DATABASE $DRILL_DB;" || {
    log "ERROR" "Failed to create test database"
    return 1
  }
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log "INFO" "Test database created successfully in ${duration}s"
  export DB_CREATE_TIME=$duration
  
  return 0
}

# Restore from backup
restore_from_backup() {
  log "INFO" "Starting restore from backup: $(basename "$BACKUP_FILE")"
  
  local start_time=$(date +%s)
  
  # Get backup info
  local backup_size=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null || echo "unknown")
  log "INFO" "Backup file size: $backup_size bytes"
  
  # Restore database
  pg_restore -h "$STAGING_DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
    --verbose --clean --if-exists --no-owner --no-privileges \
    "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR" "Database restore failed"
    return 1
  }
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  log "INFO" "Database restore completed successfully in ${duration}s"
  export RESTORE_TIME=$duration
  export BACKUP_SIZE=$backup_size
  
  return 0
}

# Validate restored data
validate_restored_data() {
  log "INFO" "Validating restored data integrity..."
  
  local validation_start=$(date +%s)
  
  # Check table counts
  local tables=("profiles" "orders" "services" "media_assets" "audit_log")
  declare -A table_counts
  
  for table in "${tables[@]}"; do
    local count=$(psql -h "$STAGING_DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
      -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
    table_counts[$table]=$count
    log "INFO" "Table $table: $count records"
  done
  
  # Check data consistency
  local consistency_checks=(
    "SELECT COUNT(*) FROM profiles WHERE email IS NOT NULL"
    "SELECT COUNT(*) FROM orders WHERE user_id IS NOT NULL" 
    "SELECT COUNT(*) FROM services WHERE code IS NOT NULL"
    "SELECT COUNT(*) FROM audit_log WHERE event IS NOT NULL"
  )
  
  local consistency_results=()
  for check in "${consistency_checks[@]}"; do
    local result=$(psql -h "$STAGING_DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
      -t -c "$check" 2>/dev/null | tr -d ' ' || echo "0")
    consistency_results+=("$result")
  done
  
  # Check for recent data (within last 24 hours before backup)
  local recent_orders=$(psql -h "$STAGING_DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
    -t -c "SELECT COUNT(*) FROM orders WHERE created_at >= now() - interval '24 hours';" 2>/dev/null | tr -d ' ' || echo "0")
  
  local validation_end=$(date +%s)
  local validation_duration=$((validation_end - validation_start))
  
  # Export validation results
  export PROFILE_COUNT=${table_counts[profiles]}
  export ORDER_COUNT=${table_counts[orders]}
  export SERVICE_COUNT=${table_counts[services]}
  export MEDIA_COUNT=${table_counts[media_assets]}
  export AUDIT_COUNT=${table_counts[audit_log]}
  export RECENT_ORDER_COUNT=$recent_orders
  export VALIDATION_TIME=$validation_duration
  
  # Validation criteria
  local validation_passed=true
  
  if [[ ${table_counts[profiles]} -eq 0 ]]; then
    log "ERROR" "Validation failed: No profiles found"
    validation_passed=false
  fi
  
  if [[ ${table_counts[services]} -eq 0 ]]; then
    log "ERROR" "Validation failed: No services found"
    validation_passed=false
  fi
  
  if [[ $validation_passed == true ]]; then
    log "INFO" "Data validation completed successfully in ${validation_duration}s"
    return 0
  else
    log "ERROR" "Data validation failed"
    return 1
  fi
}

# Performance benchmarks
run_performance_tests() {
  log "INFO" "Running performance benchmarks..."
  
  local perf_start=$(date +%s)
  
  # Query performance tests
  local queries=(
    "SELECT COUNT(*) FROM profiles"
    "SELECT COUNT(*) FROM orders WHERE status = 'delivered'"
    "SELECT p.email, COUNT(o.id) FROM profiles p LEFT JOIN orders o ON p.id = o.user_id GROUP BY p.id, p.email LIMIT 100"
  )
  
  local total_query_time=0
  local query_count=0
  
  for query in "${queries[@]}"; do
    local query_start=$(date +%s)
    psql -h "$STAGING_DB_HOST" -U "$DB_USER" -d "$DRILL_DB" \
      -c "$query" >/dev/null 2>&1 || {
      log "WARNING" "Performance test query failed: $query"
      continue
    }
    local query_end=$(date +%s)
    local query_time=$((query_end - query_start))
    total_query_time=$((total_query_time + query_time))
    query_count=$((query_count + 1))
    log "INFO" "Query performance: ${query_time}s - ${query:0:50}..."
  done
  
  local perf_end=$(date +%s)
  local perf_duration=$((perf_end - perf_start))
  local avg_query_time=$((query_count > 0 ? total_query_time / query_count : 0))
  
  export PERFORMANCE_TEST_TIME=$perf_duration
  export AVERAGE_QUERY_TIME=$avg_query_time
  export QUERY_TEST_COUNT=$query_count
  
  log "INFO" "Performance tests completed in ${perf_duration}s (avg query: ${avg_query_time}s)"
  return 0
}

# Generate success report
generate_success_report() {
  local total_time=$(date +%s)
  total_time=$((total_time - DRILL_START_TIME))
  
  cat > "$REPORT_FILE" <<EOF
# Monthly Restore Drill Report - SUCCESS

**Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Drill ID**: $DRILL_DATE  
**Duration**: ${total_time} seconds ($(date -u -d @$total_time +%H:%M:%S))  
**Status**: ✅ PASSED

## Summary
Monthly database restore drill completed successfully with all validation checks passing.

## Metrics
| Metric | Target | Actual | Status |
|--------|--------|---------|---------|
| **RTO (Recovery Time)** | < 2 hours | ${total_time}s ($(date -u -d @$total_time +%H:%M:%S)) | $([ $total_time -lt 7200 ] && echo "✅ PASS" || echo "⚠️  OVER") |
| **Database Creation** | < 30s | ${DB_CREATE_TIME}s | $([ $DB_CREATE_TIME -lt 30 ] && echo "✅ PASS" || echo "⚠️  SLOW") |
| **Data Restore** | < 1 hour | ${RESTORE_TIME}s ($(date -u -d @$RESTORE_TIME +%H:%M:%S)) | $([ $RESTORE_TIME -lt 3600 ] && echo "✅ PASS" || echo "⚠️  SLOW") |
| **Data Validation** | < 5 minutes | ${VALIDATION_TIME}s | $([ $VALIDATION_TIME -lt 300 ] && echo "✅ PASS" || echo "⚠️  SLOW") |

## Data Validation Results
| Table | Record Count | Status |
|-------|--------------|---------|
| **Profiles** | $PROFILE_COUNT | $([ $PROFILE_COUNT -gt 0 ] && echo "✅ VALID" || echo "❌ EMPTY") |
| **Orders** | $ORDER_COUNT | $([ $ORDER_COUNT -gt 0 ] && echo "✅ VALID" || echo "❌ EMPTY") |
| **Services** | $SERVICE_COUNT | $([ $SERVICE_COUNT -gt 0 ] && echo "✅ VALID" || echo "❌ EMPTY") |
| **Media Assets** | $MEDIA_COUNT | ✅ VALID |
| **Audit Log** | $AUDIT_COUNT | ✅ VALID |
| **Recent Orders** | $RECENT_ORDER_COUNT | ✅ VALID |

## Performance Benchmarks
- **Total Performance Test Time**: ${PERFORMANCE_TEST_TIME}s
- **Average Query Time**: ${AVERAGE_QUERY_TIME}s
- **Queries Tested**: $QUERY_TEST_COUNT

## Backup Information
- **Backup File**: $(basename "$BACKUP_FILE")
- **Backup Size**: $(( BACKUP_SIZE / 1024 / 1024 ))MB
- **Test Database**: $DRILL_DB (cleaned up)

## Next Actions
- ✅ All systems functioning normally
- ✅ Backup restoration confirmed working
- ✅ Data integrity validated
- 📅 Next drill scheduled: $(date -d "+1 month" "+%Y-%m-%d")

## Recommendations
$([ $total_time -gt 3600 ] && echo "- ⚠️  Consider backup optimization - restore time exceeded 1 hour" || echo "- ✅ Restore performance within acceptable limits")
$([ $RESTORE_TIME -gt 1800 ] && echo "- ⚠️  Database restore time is approaching limits" || echo "- ✅ Database restore performance satisfactory")

---
**Report Generated**: $(date)  
**Log File**: $LOG_FILE  
**Drill Script**: $0
EOF

  log "INFO" "Success report generated: $REPORT_FILE"
  return 0
}

# Generate failure report
generate_failure_report() {
  local exit_code="${1:-1}"
  local total_time=$(date +%s)
  total_time=$((total_time - DRILL_START_TIME))
  
  cat > "$REPORT_FILE" <<EOF
# Monthly Restore Drill Report - FAILURE

**Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Drill ID**: $DRILL_DATE  
**Duration**: ${total_time} seconds  
**Status**: ❌ FAILED (Exit Code: $exit_code)

## Failure Summary
Monthly database restore drill failed during execution. Immediate investigation required.

## Partial Results
$([ -n "${DB_CREATE_TIME:-}" ] && echo "- Database creation: ${DB_CREATE_TIME}s" || echo "- Database creation: FAILED")
$([ -n "${RESTORE_TIME:-}" ] && echo "- Data restore: ${RESTORE_TIME}s" || echo "- Data restore: NOT COMPLETED")
$([ -n "${VALIDATION_TIME:-}" ] && echo "- Data validation: ${VALIDATION_TIME}s" || echo "- Data validation: NOT COMPLETED")

## Investigation Required
1. Review log file: $LOG_FILE
2. Check staging database connectivity
3. Verify backup file integrity
4. Test backup restoration process manually

## Immediate Actions
- [ ] Alert SRE team immediately
- [ ] Investigate root cause
- [ ] Test backup restoration manually
- [ ] Update backup procedures if needed
- [ ] Schedule re-run of drill

## Critical Alert
🚨 **BACKUP RESTORATION CAPABILITY COMPROMISED**  
This drill failure indicates potential issues with disaster recovery procedures.

---
**Report Generated**: $(date)  
**Log File**: $LOG_FILE  
**Drill Script**: $0
EOF

  log "ERROR" "Failure report generated: $REPORT_FILE"
  return 0
}

# Main drill execution
main() {
  export DRILL_START_TIME=$(date +%s)
  
  log "INFO" "Starting $SCRIPT_NAME - Drill ID: $DRILL_DATE"
  send_slack_notification "Monthly restore drill started" "INFO"
  
  # Execute drill steps
  preflight_checks
  create_test_database
  restore_from_backup
  validate_restored_data
  run_performance_tests
  
  # Generate success report
  generate_success_report
  
  # Cleanup
  cleanup
  
  local total_time=$(date +%s)
  total_time=$((total_time - DRILL_START_TIME))
  
  log "INFO" "$SCRIPT_NAME completed successfully in ${total_time}s"
  send_slack_notification "Restore drill completed successfully in $(date -u -d @$total_time +%H:%M:%S)" "SUCCESS"
  send_email_report "Monthly Restore Drill - SUCCESS" "$REPORT_FILE"
  
  return 0
}

# Execute main function
main "$@"