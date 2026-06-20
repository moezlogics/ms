#!/bin/bash
# ================================================================
# deploy-fix-worker.sh
# ================================================================
# One-time fix: ensures the medusa-worker process is running.
# Run this on the server via SSH:
#   bash deploy-fix-worker.sh
#
# What this does:
#   1. Copies the corrected ecosystem.config.js to the server path
#   2. Stops the old PM2 processes
#   3. Restarts with the new config (server + worker)
#   4. Verifies both processes are running
# ================================================================

set -e

APP_DIR="/home/mobilestore-api/htdocs/api.mobilestore.pk"
LOGS_DIR="$APP_DIR/logs"

echo "=== Mobile Store: Fix Worker Process ==="
echo ""

# 1. Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# 2. Stop all existing medusa processes
echo "[1/4] Stopping old PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 3. Verify ecosystem.config.js is valid
echo "[2/4] Checking ecosystem.config.js..."
cd "$APP_DIR"
if ! node -e "require('./ecosystem.config.js')" 2>/dev/null; then
  echo "ERROR: ecosystem.config.js is invalid! It might still have the shell heredoc wrapper."
  echo "Fix: The file should start with 'module.exports = {' — NOT 'cat > ...' "
  exit 1
fi
echo "  ✅ ecosystem.config.js is valid"

# 4. Start with PM2
echo "[3/4] Starting medusa-server + medusa-worker..."
pm2 start ecosystem.config.js

# 5. Save PM2 config so it survives reboots
pm2 save

# 6. Verify
echo ""
echo "[4/4] Verifying processes..."
sleep 3
pm2 list

echo ""
echo "=== Check worker logs ==="
echo "  tail -f $LOGS_DIR/medusa-worker-out.log"
echo ""
echo "=== After placing a test order, look for ==="
echo '  grep "SUBSCRIBER FIRED" '$LOGS_DIR'/medusa-worker-out.log'
echo ""
echo "Done! Both server and worker should be running."
