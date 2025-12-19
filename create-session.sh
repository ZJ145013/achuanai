#!/bin/bash

# Create a new session and get a valid sessionId
# This script calls the backend /api/chat/session endpoint

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BACKEND_URL="${ACHUAN_API_URL:-https://ai.achuanai.cn/api/chat/completions}"
BACKEND_BASE_URL="${BACKEND_URL%/api/chat/completions}"
SESSION_ENDPOINT="$BACKEND_BASE_URL/api/chat/session"

echo "Creating new session..."
echo "Endpoint: $SESSION_ENDPOINT"
echo ""

# Create a new session
RESPONSE=$(curl -s -X POST "$SESSION_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ACHUAN_JWT" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "plugins": [],
    "mcp": []
  }')

echo "Response:"
echo "$RESPONSE"
echo ""

# Extract sessionId from response
SESSION_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$SESSION_ID" ]; then
  echo "Failed to extract sessionId from response"
  exit 1
fi

echo "Session created successfully!"
echo "Session ID: $SESSION_ID"
echo ""
echo "You can now use this sessionId in your API calls:"
echo ""
echo "curl -X POST http://localhost:8000/v1/chat/completions \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'x-session-id: $SESSION_ID' \\"
echo "  -d '{"
echo "    \"model\": \"claude-sonnet-4-5-20250929\","
echo "    \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}],"
echo "    \"stream\": true"
echo "  }'"
