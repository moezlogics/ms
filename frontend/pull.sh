#!/bin/bash
echo "=== Pulling Frontend Updates from GitHub ==="
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
  --exclude='.next/' \
  --exclude='ecosystem.config.js' \
  --exclude='logs/' \
  .deploy-source/frontend/ .

echo "=== Running Deploy script ==="
if [ -f "./deploy-storefront.sh" ]; then
  chmod +x ./deploy-storefront.sh
  ./deploy-storefront.sh
else
  echo "No deploy-storefront.sh found. Please build manually or restart PM2."
fi

echo "=== Frontend Updated Successfully ==="
