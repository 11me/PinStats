#!/bin/bash
# Version validation script for PinStats Chrome Extension
# Ensures git tag version matches manifest.json version

set -e

TAG_VERSION="${GITHUB_REF_NAME#v}"
MANIFEST_VERSION=$(node -p "require('./manifest.json').version")

if [ "$TAG_VERSION" != "$MANIFEST_VERSION" ]; then
  echo "❌ Error: Git tag version ($TAG_VERSION) does not match manifest.json version ($MANIFEST_VERSION)"
  echo ""
  echo "Please ensure:"
  echo "  1. manifest.json version is updated: \"version\": \"$TAG_VERSION\""
  echo "  2. Git tag matches: v$MANIFEST_VERSION"
  exit 1
fi

echo "✓ Version validation passed: $TAG_VERSION"
