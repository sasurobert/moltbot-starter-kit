#!/bin/bash
set -e

echo "============================================"
echo " Moltbot Starter Kit — Setup"
echo "============================================"

# Prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install v18+."; exit 1; }
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 18 ] 2>/dev/null || echo "⚠ Node.js v18+ recommended (found $(node -v))"

echo "✓ node $(node -v), npm $(npm -v)"

# Install
echo "📦 Installing dependencies..."
npm install

# Config
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚙️  Created .env from .env.example — edit before running"
    else
        cat > .env << 'EOF'
MULTIVERSX_CHAIN_ID=D
MULTIVERSX_API_URL=https://devnet-api.multiversx.com
IDENTITY_REGISTRY_ADDRESS=erd1...
EOF
        echo "⚙️  Created default .env — edit before running"
    fi
fi

if [ ! -f config.json ]; then
    cat > config.json << 'EOF'
{
    "agentName": "MoltBot-Gen1",
    "nonce": 0,
    "pricing": "1USDC",
    "capabilities": ["search", "compute"]
}
EOF
    echo "⚙️  Created default config.json"
fi

# Wallet
if [ ! -f wallet.pem ]; then
    echo "🔑 Generating wallet..."
    npx ts-node scripts/generate_wallet.ts 2>/dev/null || echo "⚠ Wallet generation skipped (run manually: npx ts-node scripts/generate_wallet.ts)"
fi

# Build
echo "🔨 Building..."
npm run build

# Test
echo "🧪 Running tests..."
npm test

echo ""
echo "✅ Setup complete!"
echo "   Register: npm run register"
echo "   Start:    npm start"
