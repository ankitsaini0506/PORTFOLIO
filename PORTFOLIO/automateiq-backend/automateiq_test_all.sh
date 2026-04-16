#!/bin/bash
BASE="http://localhost:3000"
TOKEN=""
PASS=0; FAIL=0

check() {
  if [ "$1" = "200" ] || [ "$1" = "201" ]; then
    echo "✅ $2"; ((PASS++))
  else
    echo "❌ $2 (got $1)"; ((FAIL++))
  fi
}

echo ""
echo "🚀 AutomateIQ — Full API Test"
echo "══════════════════════════════════════════"

# Health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health)
check $STATUS "GET /health"

# Auth
RESP=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@automateiq.com","password":"admin123"}')
TOKEN=$(echo $RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
STATUS=$(echo $RESP | grep -o '"success":true' | wc -l | tr -d ' ')
[ "$STATUS" = "1" ] && { echo "✅ POST /api/auth/login (token received)"; ((PASS++)); } || { echo "❌ POST /api/auth/login"; ((FAIL++)); }

AUTH="Authorization: Bearer $TOKEN"

# Projects
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/projects) "GET /api/projects (public)"
check $(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/projects?category=web") "GET /api/projects?category=web"

# Pricing
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/pricing) "GET /api/pricing (public)"
check $(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pricing?page=web") "GET /api/pricing?page=web"
check $(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/pricing?page=app") "GET /api/pricing?page=app"

# Services
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/services) "GET /api/services (public)"
check $(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/services?page=web") "GET /api/services?page=web"

# Templates
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/templates) "GET /api/templates (public)"
check $(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/templates?category=web") "GET /api/templates?category=web"

# Settings
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/settings) "GET /api/settings (public)"

# Agency alias
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/agency) "GET /api/agency (alias)"

# Leads (public POST)
LEAD_RESP=$(curl -s -X POST $BASE/api/leads -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"test@test.com","phone":"9999999999","budget":"25000","idea":"Test project idea","source":"modal"}')
LEAD_OK=$(echo $LEAD_RESP | grep -o '"success":true' | wc -l | tr -d ' ')
[ "$LEAD_OK" = "1" ] && { echo "✅ POST /api/leads (lead saved)"; ((PASS++)); } || { echo "❌ POST /api/leads"; ((FAIL++)); }

# Leads validation — missing name → 400
LEAD_VAL=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/leads \
  -H "Content-Type: application/json" -d '{"email":"x@x.com"}')
[ "$LEAD_VAL" = "400" ] && { echo "✅ POST /api/leads (validation 400)"; ((PASS++)); } || { echo "❌ POST /api/leads validation (got $LEAD_VAL)"; ((FAIL++)); }

# Admin routes (auth required)
check $(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" $BASE/api/auth/profile) "GET /api/auth/profile (admin)"
check $(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" $BASE/api/leads) "GET /api/leads (admin)"

# Auth guard test
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/leads)
[ "$STATUS" = "401" ] && { echo "✅ GET /api/leads without token → 401 (auth guard works)"; ((PASS++)); } || { echo "❌ Auth guard failed (got $STATUS)"; ((FAIL++)); }

# 404 handler
STATUS_404=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/unknown-route)
[ "$STATUS_404" = "404" ] && { echo "✅ 404 handler works"; ((PASS++)); } || { echo "❌ 404 handler (got $STATUS_404)"; ((FAIL++)); }

# Bad token → 401
STATUS_BAD=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer bad_token" \
  -X PUT $BASE/api/agency -H "Content-Type: application/json" -d '{}')
[ "$STATUS_BAD" = "401" ] && { echo "✅ Bad token → 401"; ((PASS++)); } || { echo "❌ Bad token guard (got $STATUS_BAD)"; ((FAIL++)); }

echo ""
echo "══════════════════════════════════════════"
echo "Total: $((PASS+FAIL)) | ✅ PASS: $PASS | ❌ FAIL: $FAIL"
[ "$FAIL" = "0" ] && echo "🎉 ALL TESTS PASSED!" || echo "⚠️  Some tests failed — check above"
echo ""
