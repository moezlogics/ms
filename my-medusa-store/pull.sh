#!/bin/bash
echo "=== Pulling Backend Updates from GitHub ==="
cd .deploy-source
git pull origin main
cd ..

echo "=== Syncing files to Root ==="
rsync -av --delete \
  --exclude='.deploy-source/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='pull.sh' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='ecosystem.config.js' \
  --exclude='logs/' \
  .deploy-source/my-medusa-store/ .

echo "=== Running Deploy script ==="
if [ -f "./deploy-backend.sh" ]; then
  chmod +x ./deploy-backend.sh
  ./deploy-backend.sh
else
  echo "No deploy-backend.sh found. Please build manually or restart PM2."
fi

echo "=== Backend Updated Successfully ==="
