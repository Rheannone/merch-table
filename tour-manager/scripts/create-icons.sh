#!/bin/bash

# Simple script to create placeholder PWA icons
# These are temporary - replace with your band's logo!

echo "Creating placeholder PWA icons..."

# Create 192x192 icon (using base64 encoded 1x1 pixel as placeholder)
cat > public/icon-192.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
EOF

# Create 512x512 icon (same placeholder)
cat > public/icon-512.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
EOF

echo "✓ Icons created!"
echo ""
echo "⚠️  These are placeholder icons."
echo "   Replace public/icon-192.png and public/icon-512.png with your band's logo"
echo "   Recommended: Use a tool like https://realfavicongenerator.net/"
