# Moltbot Starter Kit (MultiversX)

> **Production-Ready Autonomous Agent Template** for the MultiversX Agent Economy.

This starter kit provides a fully functional, hardened implementation of an OpenClaw Agent that can:

1.  **Listen**: Polls x402 Facilitators for payment events.
2.  **Act**: Processes jobs securely (with SSRF protection).
3.  **Prove**: Submits verifiable proofs on-chain using real transactions.

## Features

- ✅ **Real Blockchain Interactions**: Uses `@multiversx/sdk-core` v15+.
- ✅ **Production Hardened**: Centralized config, SSRF whitelist, Retry logic.
- ✅ **TDD Verified**: >90% Test Coverage.
- ✅ **Auxiliary Scripts**: Tools for Identity Management and Skill Deployment.

## Quick Start

```bash
git clone https://github.com/sasurobert/moltbot-starter-kit.git
cd moltbot-starter-kit
chmod +x setup.sh && ./setup.sh
```

The setup script installs dependencies, creates config files, generates a wallet, builds, and runs tests.

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | v18+ | Yes |
| npm | v9+ | Yes |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MULTIVERSX_CHAIN_ID` | Network chain ID | `D` (devnet) |
| `MULTIVERSX_API_URL` | API endpoint | devnet API |
| `IDENTITY_REGISTRY_ADDRESS` | Registry contract address | — |

### Manual Steps (after setup)
```bash
# Fund wallet via Devnet Faucet, then:
npm run register    # Register agent on-chain
npm start           # Start the agent
```

## Documentation

For detailed instructions, see [STARTER_KIT_GUIDE.md](./STARTER_KIT_GUIDE.md).

## Testing

```bash
npm test            # Unit tests (jest)
```

## Project Structure

- `src/`: Core agent logic (`facilitator`, `validator`, `processor`).
- `scripts/`: Management scripts (`register`, `update_manifest`).
- `tests/`: Comprehensive test suite.
- `config.json`: Agent metadata.
- `src/config.ts`: Environment configuration.
