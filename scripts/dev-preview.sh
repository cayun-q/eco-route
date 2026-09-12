#!/usr/bin/env bash
set -euo pipefail
export DATABASE_URL="${DATABASE_URL:-postgres://carbonroute:carbonroute@127.0.0.1:5432/carbonroute}"
export API_PORT="${API_PORT:-47832}"
export EXPO_WEB_PROXY="${EXPO_WEB_PROXY:-http://127.0.0.1:47831}"
cd "$(dirname "$0")/.."
npx concurrently -n api,web -c green,cyan \
  "npm run start -w @carbonroute/api" \
  "npm run web -w @carbonroute/mobile"
