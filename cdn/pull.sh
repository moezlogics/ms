#!/bin/bash
echo "=== Pulling CDN Updates from GitHub ==="
cd .deploy-source
git pull origin main
cd ..

echo "=== Syncing files to Root ==="
rsync -av --delete \
  --exclude='.deploy-source/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='pull.sh' \
  --exclude='uploads/' \
  --exclude='node_modules/' \
  --exclude='ecosystem.config.js' \
  .deploy-source/cdn/ .

echo "=== CDN Updated Successfully ==="
