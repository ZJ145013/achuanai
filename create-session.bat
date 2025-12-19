@echo off
REM Create a new session and get a valid sessionId
REM This script calls the backend /api/chat/session endpoint

setlocal enabledelayedexpansion

REM Load environment variables from .env file
if exist .env (
  for /f "usebackq delims==" %%A in (.env) do (
    if not "%%A"=="" (
      if not "%%A:~0,1%"=="#" (
        set "%%A"
      )
    )
  )
)

set BACKEND_URL=%ACHUAN_API_URL%
if "!BACKEND_URL!"=="" set BACKEND_URL=https://ai.achuanai.cn/api/chat/completions

REM Extract base URL (remove /api/chat/completions)
for /f "tokens=1,2 delims=/" %%A in ("!BACKEND_URL!") do (
  set BACKEND_BASE_URL=%%A//%%B
)

set SESSION_ENDPOINT=!BACKEND_BASE_URL!/api/chat/session

echo Creating new session...
echo Endpoint: !SESSION_ENDPOINT!
echo.

REM Create a new session
for /f "delims=" %%A in ('powershell -Command "& {$response = curl.exe -s -X POST '!SESSION_ENDPOINT!' -H 'Content-Type: application/json' -H 'Authorization: %ACHUAN_JWT%' -d '{\"model\":\"claude-sonnet-4-5-20250929\",\"plugins\":[],\"mcp\":[]}'; Write-Host $response}"') do (
  set RESPONSE=%%A
)

echo Response:
echo !RESPONSE!
echo.

REM Extract sessionId using PowerShell
for /f "delims=" %%A in ('powershell -Command "& {$json = '!RESPONSE!' | ConvertFrom-Json; if ($json.data.id) { Write-Host $json.data.id }}"') do (
  set SESSION_ID=%%A
)

if "!SESSION_ID!"=="" (
  echo Failed to extract sessionId from response
  exit /b 1
)

echo Session created successfully!
echo Session ID: !SESSION_ID!
echo.
echo You can now use this sessionId in your API calls:
echo.
echo curl -X POST http://localhost:8000/v1/chat/completions ^
echo   -H "Content-Type: application/json" ^
echo   -H "x-session-id: !SESSION_ID!" ^
echo   -d "{\"model\":\"claude-sonnet-4-5-20250929\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"stream\":true}"

endlocal
