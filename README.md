# Moltbot Starter Kit (OpenClaw Edition)

A production-ready starter kit for launching autonomous **OpenClaw Agents** on MultiversX. This kit integrates the `multiversx-openclaw-skills` bundle and provides the runtime environment for the "Listen-Act-Prove" loop.

## Features

- **Identity Management**: Auto-generates Agent identity (`wallet.pem`).
- **On-Chain Registration**: Registers the agent on the Identity Registry.
- **Skill Injection**: Pre-configured with MultiversX capabilities.
- **x402 Facilitator Integration**: Listens for payment intents and executes jobs.
- **Relayaed V3 Integration**: Performs gasless settlements for executed tasks.

## Quick Start

### 1. Setup
Initialize the agent environment:
```bash
npm install
chmod +x setup.sh
./setup.sh
```
This script will:
- Generate a generic `wallet.pem` (for dev/test).
- Register the agent manifest on Devnet.
- Download necessary dependencies.

### 2. Configuration
Edit `.env` or `config.json` to set your specific parameters:
```json
{
  "name": "MyAgent",
  "mcpUrl": "http://localhost:3000",
  "facilitatorUrl": "http://localhost:4000"
}
```

### 3. Run
Start the agent daemon:
```bash
npm start
```
The agent will begin listening for x402 payment requests and monitoring the chain.

## Architecture

- **`src/index.ts`**: Main entry and loop.
- **`src/facilitator.ts`**: Webhook/Polling listener for payment events.
- **`src/validator.ts`**: Logic to validate and submit proofs.
- **`src/mcp_bridge.ts`**: Bridge to the Shared MCP Server.

## Development

Run tests:
```bash
npm test
```

## License
MIT
