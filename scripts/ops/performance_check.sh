#!/bin/bash
# M42 Performance Health Check Script
# Quick performance validation for operational readiness

set -e

# Configuration
BASE_URL=${API_BASE_URL:-"https://samiatarot.com"}
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S_UTC")
REPORT_FILE="evidence/performance_check_${TIMESTAMP}.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Performance Health Check - $TIMESTAMP"
echo "=====================================" | tee $REPORT_FILE

# Test 1: API Response Times
echo "1. API Response Time Check:" | tee -a $REPORT_FILE
echo "===========================" >> $REPORT_FILE

ENDPOINTS=("/api/health" "/api/metrics" "/api/auth/sync")
API_TOTAL=0
API_COUNT=0

for endpoint in "${ENDPOINTS[@]}"; do
    echo -n "Testing $endpoint... "

    START_TIME=$(date +%s%N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" --max-time 10)
    END_TIME=$(date +%s%N)

    RESPONSE_TIME=$((($END_TIME - $START_TIME) / 1000000))  # Convert to milliseconds

    if [ "$HTTP_CODE" = "200" ] && [ "$RESPONSE_TIME" -lt 2000 ]; then
        echo -e "${GREEN}✅ ${RESPONSE_TIME}ms${NC}"
        echo "$endpoint: ${RESPONSE_TIME}ms (${HTTP_CODE})" >> $REPORT_FILE
    elif [ "$HTTP_CODE" = "200" ]; then
        echo -e "${YELLOW}⚠️  ${RESPONSE_TIME}ms (slow)${NC}"
        echo "$endpoint: ${RESPONSE_TIME}ms (${HTTP_CODE}) - SLOW" >> $REPORT_FILE
    else
        echo -e "${RED}❌ ${HTTP_CODE}${NC}"
        echo "$endpoint: ERROR ${HTTP_CODE}" >> $REPORT_FILE
    fi

    API_TOTAL=$((API_TOTAL + RESPONSE_TIME))
    API_COUNT=$((API_COUNT + 1))
done

AVG_RESPONSE_TIME=$((API_TOTAL / API_COUNT))
echo "Average API Response Time: ${AVG_RESPONSE_TIME}ms" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Test 2: Core Web Vitals Simulation
echo "2. Core Web Vitals Check:" | tee -a $REPORT_FILE
echo "=========================" >> $REPORT_FILE

# Test homepage load time
echo -n "Homepage load time... "
START_TIME=$(date +%s%N)
curl -s "$BASE_URL/" -o /dev/null --max-time 10
END_TIME=$(date +%s%N)
PAGE_LOAD_TIME=$((($END_TIME - $START_TIME) / 1000000))

if [ "$PAGE_LOAD_TIME" -lt 2500 ]; then
    echo -e "${GREEN}✅ ${PAGE_LOAD_TIME}ms${NC}"
    echo "Homepage load: ${PAGE_LOAD_TIME}ms - GOOD" >> $REPORT_FILE
elif [ "$PAGE_LOAD_TIME" -lt 4000 ]; then
    echo -e "${YELLOW}⚠️  ${PAGE_LOAD_TIME}ms${NC}"
    echo "Homepage load: ${PAGE_LOAD_TIME}ms - NEEDS IMPROVEMENT" >> $REPORT_FILE
else
    echo -e "${RED}❌ ${PAGE_LOAD_TIME}ms${NC}"
    echo "Homepage load: ${PAGE_LOAD_TIME}ms - POOR" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Test 3: Database Performance (if available)
echo "3. Database Performance:" | tee -a $REPORT_FILE
echo "========================" >> $REPORT_FILE

if [ ! -z "$DATABASE_URL" ] && command -v psql &> /dev/null; then
    echo -n "Database connection... "

    DB_START=$(date +%s%N)
    DB_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT 'OK', COUNT(*) FROM profiles;" 2>/dev/null)
    DB_END=$(date +%s%N)
    DB_TIME=$((($DB_END - $DB_START) / 1000000))

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${DB_TIME}ms${NC}"
        echo "Database query: ${DB_TIME}ms - $DB_RESULT" >> $REPORT_FILE
    else
        echo -e "${RED}❌ Connection failed${NC}"
        echo "Database query: FAILED" >> $REPORT_FILE
    fi
else
    echo "SKIP: Database check not available" | tee -a $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Test 4: CDN/Cache Performance
echo "4. CDN Performance:" | tee -a $REPORT_FILE
echo "==================" >> $REPORT_FILE

echo -n "Static asset caching... "
CACHE_TEST=$(curl -s -I "$BASE_URL/favicon.ico" | grep -i "cache-control\|x-cache")

if echo "$CACHE_TEST" | grep -qi "cache"; then
    echo -e "${GREEN}✅ Cache headers present${NC}"
    echo "CDN caching: ENABLED" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  No cache headers detected${NC}"
    echo "CDN caching: NOT_DETECTED" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Test 5: SSL/Security Check
echo "5. Security Check:" | tee -a $REPORT_FILE
echo "==================" >> $REPORT_FILE

echo -n "SSL certificate... "
SSL_CHECK=$(curl -s -I "$BASE_URL/" | head -1)

if echo "$SSL_CHECK" | grep -q "200"; then
    echo -e "${GREEN}✅ SSL working${NC}"
    echo "SSL certificate: VALID" >> $REPORT_FILE
else
    echo -e "${RED}❌ SSL issues${NC}"
    echo "SSL certificate: ISSUES" >> $REPORT_FILE
fi

# Security headers check
echo -n "Security headers... "
SECURITY_HEADERS=$(curl -s -I "$BASE_URL/" | grep -E "(X-Content-Type-Options|X-Frame-Options|Strict-Transport-Security)")

if [ $(echo "$SECURITY_HEADERS" | wc -l) -ge 2 ]; then
    echo -e "${GREEN}✅ Headers present${NC}"
    echo "Security headers: PRESENT" >> $REPORT_FILE
else
    echo -e "${YELLOW}⚠️  Some headers missing${NC}"
    echo "Security headers: PARTIAL" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Summary
echo "6. Performance Summary:" | tee -a $REPORT_FILE
echo "======================" >> $REPORT_FILE

# Calculate overall score
SCORE=0
TOTAL_TESTS=5

# API performance (20 points)
if [ "$AVG_RESPONSE_TIME" -lt 1000 ]; then
    SCORE=$((SCORE + 20))
elif [ "$AVG_RESPONSE_TIME" -lt 2000 ]; then
    SCORE=$((SCORE + 15))
else
    SCORE=$((SCORE + 10))
fi

# Page load time (20 points)
if [ "$PAGE_LOAD_TIME" -lt 2500 ]; then
    SCORE=$((SCORE + 20))
elif [ "$PAGE_LOAD_TIME" -lt 4000 ]; then
    SCORE=$((SCORE + 15))
else
    SCORE=$((SCORE + 10))
fi

# Database (20 points) - default to 15 if skipped
if [ ! -z "$DB_TIME" ]; then
    if [ "$DB_TIME" -lt 500 ]; then
        SCORE=$((SCORE + 20))
    elif [ "$DB_TIME" -lt 1000 ]; then
        SCORE=$((SCORE + 15))
    else
        SCORE=$((SCORE + 10))
    fi
else
    SCORE=$((SCORE + 15))  # Default score for skipped test
fi

# CDN (20 points)
if echo "$CACHE_TEST" | grep -qi "cache"; then
    SCORE=$((SCORE + 20))
else
    SCORE=$((SCORE + 10))
fi

# Security (20 points)
if [ $(echo "$SECURITY_HEADERS" | wc -l) -ge 2 ]; then
    SCORE=$((SCORE + 20))
else
    SCORE=$((SCORE + 15))
fi

echo "Overall Performance Score: $SCORE/100" | tee -a $REPORT_FILE

# Performance grade
if [ "$SCORE" -ge 90 ]; then
    GRADE="A"
    GRADE_COLOR=$GREEN
elif [ "$SCORE" -ge 80 ]; then
    GRADE="B"
    GRADE_COLOR=$GREEN
elif [ "$SCORE" -ge 70 ]; then
    GRADE="C"
    GRADE_COLOR=$YELLOW
else
    GRADE="D"
    GRADE_COLOR=$RED
fi

echo -e "Performance Grade: ${GRADE_COLOR}$GRADE${NC}" | tee -a $REPORT_FILE

# Generate hash for verification
CONTENT_HASH=$(cat $REPORT_FILE | sha256sum | cut -d' ' -f1)
echo "Report Hash: $CONTENT_HASH" >> $REPORT_FILE
echo "Generated: $TIMESTAMP" >> $REPORT_FILE

echo ""
echo "📄 Performance report: $REPORT_FILE"
echo "🔑 Report hash: $CONTENT_HASH"

# Exit code based on performance
if [ "$SCORE" -ge 70 ]; then
    echo -e "${GREEN}✅ Performance check passed${NC}"
    exit 0
else
    echo -e "${RED}❌ Performance check failed${NC}"
    exit 1
fi