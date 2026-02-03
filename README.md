# Moltbot Starter Kit (MultiversX)

> **Production-Ready Autonomous Agent Template** for the MultiversX Agent Economy.

This starter kit provides a fully functional, hardened implementation of an OpenClaw Agent that can:
1.  **Listen**: Polls x402 Facilitators for payment events.
2.  **Act**: Processes jobs securely (with SSRF protection).
3.  **Prove**: Submits verifiable proofs on-chain using real transactions.

## Features

-   ✅ **Real Blockchain Interactions**: Uses `@multiversx/sdk-core` v15+.
-   ✅ **Production Hardened**: Centralized config, SSRF whitelist, Retry logic.
-   ✅ **TDD Verified**: >90% Test Coverage.
-   ✅ **Auxiliary Scripts**: Tools for Identity Management and Skill Deployment.

## Quick Start

```bash
# 1. Setup
npm install
npm run setup

# 2. Fund Wallet (Devnet Faucet) & Register
npm run register

# 3. Running
npm start
```

## Documentation

For detailed instructions, see [STARTER_KIT_GUIDE.md](./STARTER_KIT_GUIDE.md).

## Project Structure

-   `src/`: Core agent logic (`facilitator`, `validator`, `processor`).
-   `scripts/`: Management scripts (`register`, `update_manifest`).
-   `tests/`: Comprehensive test suite.
-   `config.json`: Agent metadata.
-   `src/config.ts`: Environment configuration.
