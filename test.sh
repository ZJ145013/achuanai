#!/bin/bash

# OpenAI Wrapper API Test Script
# This script tests all endpoints of the OpenAI-compatible wrapper

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BASE_URL="http://localhost:8000"
SESSION_ID=$(date +%s)

echo "=========================================="
echo "OpenAI Wrapper API Test Suite"
echo "=========================================="
echo ""

# Test 1: Get Models List
echo "Test 1: GET /v1/models"
echo "---"
curl -s "$BASE_URL/v1/models"
echo ""
echo ""

# Test 2: Stream Chat Completion
echo "Test 2: POST /v1/chat/completions (stream=true)"
echo "---"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v3.2-exp",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": true
  }' | head -20
echo ""
echo ""

# Test 3: Non-stream Chat Completion
echo "Test 3: POST /v1/chat/completions (stream=false)"
echo "---"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v3.2-exp",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "stream": false
  }'
echo ""
echo ""

# Test 4: Test with metadata sessionId
echo "Test 4: POST /v1/chat/completions (with metadata.sessionId)"
echo "---"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek/deepseek-v3.2-exp",
    "messages": [
      {"role": "user", "content": "What is 2+2?"}
    ],
    "stream": false,
    "metadata": {
      "sessionId": 999999
    }
  }'
echo ""
echo ""

# Test 5: Test error handling - invalid model
echo "Test 5: Error handling - invalid model"
echo "---"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "invalid-model",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
echo ""
echo ""

# Test 6: Test error handling - missing messages
echo "Test 6: Error handling - missing messages"
echo "---"
curl -s -X POST "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929"
  }'
echo ""
echo ""

echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="
