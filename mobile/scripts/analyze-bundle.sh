#!/bin/bash

# Configuration
BUNDLE_OUT="bundle.js"
MAP_OUT="bundle.map"
ENTRY_FILE="node_modules/expo-router/entry.js"

echo "🧹 Cleaning up old artifacts..."
rm -f $BUNDLE_OUT $MAP_OUT

echo "🚀 Generating Bundle via Expo Export (with Atlas)..."
echo "Node: $(node -v)"

# Set Atlas variable and export (with cache clear -c)
EXPO_ATLAS=true npx expo export --platform android --output-dir dist --no-bytecode -c

# Launch Atlas viewer
if [ -f ".expo/atlas.jsonl" ]; then
  echo "✅ Atlas data generated: .expo/atlas.jsonl"
  echo "🔍 Launching Expo Atlas Viewer..."
  npx expo-atlas .expo/atlas.jsonl
else
  echo "❌ Error: Atlas data not found at .expo/atlas.jsonl"
  exit 1
fi
