#!/bin/bash

# Test Mission Assigned Email to emjisolutions@gmail.com

echo "🧪 Testing Mission Assigned Email with Resend"
echo "=============================================="

BASE_URL="http://localhost:3001/api"

echo "📧 Step 1: Getting admin token..."

# Login to get admin token
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@goboclean.be", "password": "GoBo2026!Admin"}')

# Extract token using basic parsing (works on macOS)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got admin token: ${TOKEN:0:20}..."

echo ""
echo "📧 Step 2: Testing SMTP connection..."

CONNECTION_TEST=$(curl -s -X POST "${BASE_URL}/email/test-connection" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Connection test result: $CONNECTION_TEST"

echo ""
echo "📧 Step 3: Sending mission assigned email to emjisolutions@gmail.com..."

EMAIL_RESULT=$(curl -s -X POST "${BASE_URL}/email-test/mission-assigned" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "emjisolutions@gmail.com"}')

echo "Email send result:"
echo "$EMAIL_RESULT" | jq '.' || echo "$EMAIL_RESULT"

echo ""
echo "🎯 Check your inbox at emjisolutions@gmail.com!"
echo "📋 If it fails, check Resend logs: https://resend.com/logs"