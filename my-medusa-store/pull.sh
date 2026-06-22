#!/bin/bash
echo "=== Pulling Backend Updates from GitHub ==="
cd .deploy-source
git pull origin main
cd ..

echo "=== Syncing files to my-medusa-store/ ==="
rsync -av --delete \
  --exclude='.deploy-source/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='pull.sh' \
  --exclude='admin-static/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='ecosystem.config.js' \
  --exclude='logs/' \
  .deploy-source/my-medusa-store/ my-medusa-store/

echo "=== Backend Updated Successfully ==="
