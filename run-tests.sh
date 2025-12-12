#!/bin/bash

# FreeTune Backend Test Runner
# Comprehensive test execution script with reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FreeTune Backend - Comprehensive Tests    ║${NC}"
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo ""

# Function to run test and track results
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    
    if npm test -- "$test_file" --silent 2>&1 | grep -q "PASS"; then
        echo -e "${GREEN}✓ PASSED: ${test_name}${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED: ${test_name}${NC}"
        ((FAILED++))
    fi
    
    echo ""
}

# Check if .env.test exists
if [ ! -f .env.test ]; then
    echo -e "${RED}Error: .env.test file not found!${NC}"
    echo "Please create .env.test with test configuration"
    exit 1
fi

# Phase 1: Database Connectivity Tests
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 1: Database Connectivity Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_test "Supabase Connection" "tests/integration/database/supabase.test.js"
run_test "Redis Cache" "tests/integration/database/redis.test.js"
run_test "MongoDB Connection" "tests/integration/database/mongodb.test.js"
run_test "Schema Validation" "tests/integration/database/schema.test.js"

# Phase 2: Unit Tests
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 2: Unit Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_test "API Error Utilities" "tests/unit/utils/apiError.test.js"
run_test "API Response Utilities" "tests/unit/utils/apiResponse.test.js"
run_test "Async Handler" "tests/unit/utils/asyncHandler.test.js"
run_test "Cache Helper" "tests/unit/utils/cacheHelper.test.js"

run_test "Auth Middleware" "tests/unit/middleware/auth.test.js"
run_test "Rate Limiter" "tests/unit/middleware/rateLimiter.test.js"
run_test "Validator Middleware" "tests/unit/middleware/validator.test.js"

run_test "Auth Validators" "tests/unit/validators/auth.validators.test.js"

# Phase 3: Integration Tests
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 3: Integration Tests${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_test "Healthcheck Controller" "tests/integration/controllers/healthcheck.test.js"

run_test "Authentication API" "tests/integration/api/auth.test.js"
run_test "Songs API" "tests/integration/api/songs.test.js"
run_test "Routes Integration" "tests/integration/api/routes.test.js"

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))

echo -e "Total Tests:   ${TOTAL}"
echo -e "${GREEN}Passed:        ${PASSED}${NC}"
echo -e "${RED}Failed:        ${FAILED}${NC}"
echo -e "${YELLOW}Skipped:       ${SKIPPED}${NC}"
echo ""

# Calculate pass rate
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "Pass Rate:     ${PASS_RATE}%"
    
    if [ $PASS_RATE -ge 75 ]; then
        echo -e "${GREEN}✓ Coverage goal achieved (>75%)${NC}"
    else
        echo -e "${YELLOW}⚠ Coverage below target (<75%)${NC}"
    fi
fi

echo ""

# Coverage report
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Generating Coverage Report${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

npm test -- --coverage --silent

echo ""
echo -e "${GREEN}Coverage report generated: coverage/index.html${NC}"
echo ""

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Tests failed! Please fix the failing tests.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
fi
