#!/bin/bash
# Setup script for Project Enhancer Skill

echo "📦 Setting up Project Enhancer dependencies..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
else
    echo "✓ Bun is installed"
fi

# Install dependencies
cd /home/workspace/Skills/project-enhancer
bun install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the enhancer:"
echo "  ./scripts/enhancer.ts --project <path> [--output <output-path>] [--verbose] [--dry-run]"
echo ""
echo "To test with a sample project:"
echo "  ./scripts/enhancer.ts --help"
