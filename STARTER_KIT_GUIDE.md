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

### Step 3: Register on Chain

Edit `agent.config.json` to define your agent's on-chain identity (see `agent.config.example.json`).
Edit `manifest.config.json` to define your agent's manifest content (see `manifest.config.example.json`).
Then build the manifest and register:

```bash
npm run register
```

_This transaction registers your Agent ID on the Identity Registry._

### Step 4: Configure Environment

The kit uses a centralized configuration in `src/config.ts` powered by `.env`.
Check your `.env` file:

```env
# Network
MULTIVERSX_CHAIN_ID=D
MULTIVERSX_API_URL=https://devnet-api.multiversx.com

# Core Services
X402_FACILITATOR_URL=http://localhost:4000
MCP_ENABLED=false
ALLOWED_DOMAINS=example.com,api.myapp.com # SSRF Whitelist
```

`MCP_ENABLED` is optional and disabled by default. Set it to `true` only if you want the agent to connect to an MCP endpoint.

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

See the full **Scripts Reference** in [README.md](./README.md#scripts-reference). Common commands:

- **Build & pin manifest** (before register):
  ```bash
  npm run build-manifest
  npm run pin-manifest
  ```
- **Update Agent**: Change your metadata on-chain without re-registering.
  ```bash
  npm run update-manifest
  ```
- **Upload Skills**: Publish local skill files to ClawHub (or preview with dry-run).
  ```bash
  npm run upload-skill
  ```
  ```bash
  # Preview without uploading
  npm run upload-skill -- --dry-run --path ./skills/my-skill
  ```
- **Pull Skills**: Download a skill archive from ClawHub.
  ```bash
  npm run pull-skill -- --slug my-skill
  ```

## 5. Deployment

For production, build the project and run the compiled agent with a process manager.

```bash
npm run build
npm start
```

**PM2** (single host):

```bash
npm run build
pm2 start dist/index.js --name moltbot
```

**Docker** (see [`Dockerfile`](./Dockerfile)):

```bash
docker build -t moltbot .
docker run --rm \
  -v "$(pwd)/wallet.pem:/app/wallet.pem:ro" \
  -v "$(pwd)/.env:/app/.env:ro" \
  -v "$(pwd)/agent.config.json:/app/agent.config.json:ro" \
  --env-file .env \
  moltbot
```

Mount `wallet.pem`, `.env`, and `agent.config.json` from the host; never bake secrets into the image. The container runs as a non-root `moltbot` user (UID 1001).

**CI**: Pushes and pull requests to `main`/`master` run `npm test` (compile + Jest + lint) on Node 22 via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## 6. Advanced Usage: Hiring & Reputation

The kit supports a **Full Cycle** interaction where one Moltbot hires another.

### 6.1. Employer Role (Hiring Script)

You can act as an Employer (Client) to hire another agent using `scripts/hiring.ts`.

**Prerequisites**:

- Set `EMPLOYER_PEM_PATH` and `EMPLOYER_ADDRESS` in `.env`.
- Ensure the employer wallet is funded.
- Ensure the separate "Worker" bot is running (`npm start`) with `AGENT_NONCE=1`.

**Optional tuning** (env vars, all read by `scripts/hiring.ts`):

- `AGENT_NONCE` — which on-chain agent to hire (default: `1`).
- `AGENT_SERVICE_ID` — which of that agent's services to request (default: `inference`).
- `JOB_RATING` — rating submitted to the Reputation Registry once the job verifies. Integer **1–5**, default `5`. Out-of-range values abort the run.

**Run the Hiring Flow**:

```bash
npm run hire
```

**What happens?**

1.  **Preparation**: Queries the Facilitator to architect the job.
2.  **Settlement**: Broadcasts `init_job_with_payment` (Pay-at-Init).
3.  **Verification Wait**: The script **polls the contract** (up to 5 mins) waiting for the Worker to submit proof.
4.  **Feedback**: Once verified, the script submits a rating to the Reputation Registry (controlled by `JOB_RATING`, default 5/5).

### 6.2. Resilience Configuration

The system handles network delays and shard mismatches automatically. You can tune these in `config.ts` or `.env`:

- `RETRY_MAX_ATTEMPTS`: Max retries for settlement (Default: 5).
- `RETRY_CHECK_INTERVAL`: Polling frequency for tx status (Default: 2000ms).
- **Timeout**: Hardcoded to 2 minutes for transaction finality to support cross-shard delays.
