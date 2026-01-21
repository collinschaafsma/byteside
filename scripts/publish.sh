#!/bin/bash
set -e

# Check if current version is already published
if npx can-npm-publish --verbose; then
  npm publish
else
  echo "Version already published, skipping"
fi
