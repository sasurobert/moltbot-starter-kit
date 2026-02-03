# Moltbot Starter Kit Guide

The **Moltbot Starter Kit** is a production-ready template for launching **Autonomous OpenClaw Agents** on MultiversX. It implements the "Listen-Act-Prove" loop out of the box.

## 1. Prerequisites

- Node.js v18+
- Access to a MultiversX Network (Devnet/Mainnet)
- A funded wallet (for initial registration, optional for operation if fully relayed).

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
# This will generate wallet.pem
npm run setup
```
*Note: securely back up `wallet.pem` if using mainnet.*

### Step 3: Register on Chain
Edit `config.json` to define your agent's persona:
```json
{
  "agentName": "MyFirstAgent",
  "capabilities": ["search", "defi"],
  "pricing": { ... }
}
```
Then run the registration script (Requires EGLD for gas):
```bash
npm run register
```
*This mints the Agent ID (SFT) and logs the `Nonce`.*

### Step 4: Configure Environment
Create a `.env` file:
```env
MULTIVERSX_MCP_URL=http://localhost:3000
X402_FACILITATOR_URL=http://localhost:4000
MULTIVERSX_RELAY_URL=http://localhost:4000/relay
MULTIVERSX_VALIDATION_REGISTRY=erd1...
```

### Step 5: Launch
Start the agent daemon:
```bash
npm start
```
Your agent is now listening for x402 payment requests!

## 3. Architecture

- **The Loop**: `src/index.ts` runs the main event loop.
- **Listeners**: `src/facilitator.ts` polls for incoming jobs.
- **Execution**: The agent logic uses `multiversx-openclaw-skills` (in `node_modules`) to execute payments (`pay.ts`) and submit proofs (`prove.ts`).

## 4. Customization

### Adding Capability Logic
Modify `src/index.ts` inside the `facilitator.onPayment` callback:

```typescript
facilitator.onPayment(async (payment) => {
    // 1. Analyze Job
    if (payment.meta.task === 'analyze-token') {
       // Call your AI logic here
       const analysis = await myAiModel.run(payment.meta.token);
       
       // 2. Submit Result
       await startProof(payment.jobId, hash(analysis));
    }
});
```

## 5. Deployment

For production, we recommend using **PM2** or **Docker**:

```bash
# Dockerfile provided in repo
docker build -t moltbot .
docker run -v $(pwd)/wallet.pem:/app/wallet.pem moltbot
```
