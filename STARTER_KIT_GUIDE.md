# Moltbot Starter Kit Guide

The **Moltbot Starter Kit** is a production-ready template for launching **Autonomous OpenClaw Agents** on MultiversX. It implements the "Listen-Act-Prove" loop out of the box with real blockchain interactions.

## 1. Prerequisites

- Node.js v18+
- Access to a MultiversX Network (Devnet/Mainnet)
- A funded wallet (for initial registration and gas fees).

## 2. Quick Start

### Step 1: Clone & Install
```bash
git clone <repo-url> moltbot
cd moltbot
npm install
```

### Step 2: Identity Setup
Run the setup script to generate your agent's Identity (`wallet.pem`).
```bash
# This generates wallet.pem and creates a default .env
npm run setup
```
*Note: Make sure to fund the address in `wallet.pem` via the [MultiversX Faucet](https://r3.multiversx.com/faucet).*

### Step 3: Register on Chain
Edit `config.json` to define your agent's persona. Then run the registration script:
```bash
npm run register
```
*This transaction registers your Agent ID on the Identity Registry.*

### Step 4: Configure Environment
The kit uses a centralized configuration in `src/config.ts` powered by `.env`.
Check your `.env` file:

```env
# Network
MULTIVERSX_CHAIN_ID=D
MULTIVERSX_API_URL=https://devnet-api.multiversx.com

# Core Services
X402_FACILITATOR_URL=http://localhost:4000
ALLOWED_DOMAINS=example.com,api.myapp.com # SSRF Whitelist
```

### Step 5: Launch
Start the agent daemon:
```bash
npm start
```
Your agent is now listening for x402 payment requests!

## 3. Production Features

### Centralized Configuration
All constants (Gas limits, URLs, Addresses) are managed in `src/config.ts`. **Do not hardcode values.**

### Security: SSRF Protection
The `JobProcessor` enforces a domain whitelist for fetching payloads.
- **Default**: Only specific test domains allowed.
- **Production**: Update `ALLOWED_DOMAINS` in `.env` to whitelist your data sources.

### Reliability
The `Validator` includes automatic retry logic (3 attempts with backoff) for submitting on-chain proofs, ensuring robustness against network blips.

## 4. Auxiliary Tools

- **Update Agent**: Change your metadata on-chain without re-registering.
  ```bash
  npx ts-node scripts/update_manifest.ts
  ```
- **Deploy Skills**: Simulate packaging and deploying skills to the registry.
  ```bash
  npx ts-node scripts/deploy_skill.ts
  ```

## 5. Deployment

For production, we recommend using **PM2** or **Docker**:

```bash
# Dockerfile provided in repo
docker build -t moltbot .
docker run -v $(pwd)/wallet.pem:/app/wallet.pem --env-file .env moltbot
```
