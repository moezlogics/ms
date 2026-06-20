#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=========================================================="
echo " Starting Zero-Downtime Next.js Storefront Deployment...  "
echo "=========================================================="

# 1. Define paths
ACTIVE_DIR="$(pwd)"
BUILD_DIR="${ACTIVE_DIR}_build_temp"

echo "[1/7] Directories:"
echo "      Active Dir: $ACTIVE_DIR"
echo "      Build Dir:  $BUILD_DIR"

# 2. Sync files to build directory
echo "[2/7] Syncing source files to build directory..."
mkdir -p "$BUILD_DIR"

# If rsync is available, use it (recommended). Otherwise, fall back to cp.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude='.git' --exclude='.next' --exclude='node_modules' --exclude='logs' "$ACTIVE_DIR/" "$BUILD_DIR/"
else
  echo "rsync not found, falling back to cp..."
  cp -R "$ACTIVE_DIR/"* "$BUILD_DIR/"
  rm -rf "$BUILD_DIR/.git" "$BUILD_DIR/.next" "$BUILD_DIR/node_modules" "$BUILD_DIR/logs" 2>/dev/null || true
fi

# 3. Copy node_modules to build folder to cache package installs
if [ -d "$ACTIVE_DIR/node_modules" ]; then
  echo "[3/7] Copying cached node_modules to build directory..."
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$ACTIVE_DIR/node_modules/" "$BUILD_DIR/node_modules/"
  else
    cp -R "$ACTIVE_DIR/node_modules" "$BUILD_DIR/"
  fi
else
  echo "[3/7] No cached node_modules found. Fresh install will be performed."
fi

# 4. Install dependencies and build in the build folder
cd "$BUILD_DIR"
echo "[4/7] Installing dependencies in build directory..."
npm install --no-audit --no-fund

echo "[4/7] Compiling Next.js application..."
# Set memory limit to prevent VPS OOM (Out Of Memory) crash during webpack builds
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build

# 5. Swap the builds atomically
echo "[5/7] Build successful! Swapping builds in active directory..."

# Ensure logs directory exists
mkdir -p "$ACTIVE_DIR/logs"

# Atomic swap:
# Move active .next folder out to a temp name, then move the new one in.
# Renaming is atomic on Unix filesystems, preventing page chunk 404s for active users.
if [ -d "$ACTIVE_DIR/.next" ]; then
  mv "$ACTIVE_DIR/.next" "$ACTIVE_DIR/.next_old"
fi
mv "$BUILD_DIR/.next" "$ACTIVE_DIR/.next"

# Sync public/ files if they changed (images, favicon, etc.)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$BUILD_DIR/public/" "$ACTIVE_DIR/public/"
else
  rm -rf "$ACTIVE_DIR/public"
  cp -R "$BUILD_DIR/public" "$ACTIVE_DIR/"
fi

# 6. Reload PM2 with Zero-Downtime
echo "[6/7] Reloading storefront processes via PM2..."
cd "$ACTIVE_DIR"

# Verify if ecosystem config exists in active dir
if [ ! -f "ecosystem.config.js" ]; then
  echo "WARNING: ecosystem.config.js not found in active directory! Copying from build..."
  cp "$BUILD_DIR/ecosystem.config.js" "$ACTIVE_DIR/"
fi

# Check if application is already running in PM2
pm2 describe next-storefront >/dev/null 2>&1
if [ $? -eq 0 ]; then
  # pm2 reload restarts workers sequentially (zero-downtime)
  pm2 reload next-storefront
else
  # First-time start
  pm2 start ecosystem.config.js
fi

# 7. Cleanup
echo "[7/7] Cleaning up temporary folders..."
rm -rf "$ACTIVE_DIR/.next_old"
rm -rf "$BUILD_DIR"

echo "=========================================================="
echo " Next.js Storefront Deployment Completed Successfully!    "
echo "=========================================================="
