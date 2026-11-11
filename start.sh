#!/usr/bin/env bash
# InΦnity: one-step setup and run for macOS and Linux.
# Installs what the app needs (once), starts a local database and the site at http://localhost:3000
set -e
cd "$(dirname "$0")"

echo
echo "  InΦnity (local)"
echo "  ---------------"

if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js is not installed."
  echo "  Install Node.js 20.9 or newer from https://nodejs.org (the LTS version), then run this script again."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "  Node.js $(node -v) is too old. Install Node.js 20.9 or newer from https://nodejs.org and run this script again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Installing required packages (first run only, needs internet)..."
  npm install
fi

(
  sleep 15
  if command -v open >/dev/null 2>&1; then open "http://localhost:3000"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:3000"
  fi
) >/dev/null 2>&1 &

npm run dev:local
