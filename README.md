# Moltbot Starter Kit (MultiversX)

> **Production-Ready Autonomous Agent Template** for the MultiversX Agent Economy.

A fully functional, hardened implementation of an OpenClaw Agent with a comprehensive skill library for blockchain interactions.

## Features

- ✅ **SDK v15+** — Modern `NetworkEntrypoint`, ABI factories, controllers
- ✅ **14+ Agent Skills** — Identity, validation, reputation, escrow, transfers, discovery, hiring, manifest
- ✅ **Production Hardened** — Central config, SSRF guards, retry logic, timeouts
- ✅ **TDD Verified** — 47+ unit tests, mocked SDK for offline testing
- ✅ **OASF Taxonomy** — Official 136 skill + 204 domain IDs for agent registration

## Quick Start

### 1. Installation

Clone the repository and run the setup script:

```bash
git clone https://github.com/sergiuosvat/moltbot-starter-kit.git
cd moltbot-starter-kit
chmod +x setup.sh && ./setup.sh
```

**Alternative:** Install via the OpenClaw one-liner (includes SKILL.md + references):
```bash
curl -sL https://raw.githubusercontent.com/sergiuosvat/moltbot-starter-kit/main/scripts/install.sh | bash
```

### 2. Environment Setup

Create your `.env` file and configure your environment variables:

```bash
cp .env.example .env
```

You must add the following **User Inputs** to your `.env` file to enable IPFS pinning for the agent manifest:

- **Pinata Key** (`PINATA_API_KEY`): Your API Key from Pinata.
- **Pinata Secret** (`PINATA_SECRET_KEY`): Your Secret Key from Pinata.

### 3. Configure Manifest

Define your agent's off-chain profile and capabilities in `manifest.config.json`.
First, copy the example file:

```bash
cp manifest.config.example.json manifest.config.json
```

Then, update the following **User Inputs**:

- **Agent Name** (`agentName`): The display name of your agent.
- **Description** (`description`): A short bio explaining what your agent does.
- **Services** (`services`): The endpoints (e.g., MCP, A2A) where your agent can be reached.
- **Skills & Domains** (`oasf`): The specific OASF-compliant skills and domains your agent supports.

### 4. Configure Agent Registration

Define your agent's on-chain settings in `agent.config.json`.
First, copy the example file:

```bash
cp agent.config.example.json agent.config.json
```

Then, update the following **User Inputs**:

- **Agent Name** (`agentName`): Copy this directly from your `manifest.config.json` (it must match exactly).
- **Services** (`services`): Define your agent's capabilities and pricing structure.
  - **Service ID**: Unique identifier for the service.
  - **Price**: The cost to hire your agent (in Wei, e.g., `1000000000000000000` for 1 EGLD).
  - **Token**: The token ticker used for payment (e.g., `EGLD`, `USDC`).
  - **Nonce**: The nonce of the token.
- **Metadata** (`metadata`): Optional key-value pairs for on-chain storage.

### 5. Build Manifest

Once configured, build and validate your manifest:

```bash
npx ts-node scripts/build_manifest.ts
```

### 6. Pin Manifest to IPFS

Once the manifest is built, pin it to IPFS using Pinata:

```bash
npx ts-node scripts/pin_manifest.ts
```

This will update `agent.config.json` with the `manifestUri`.


## Skills Library

All skills live in `src/skills/` and are exported from `src/skills/index.ts`:

| Skill File | Functions | Description |
|:-----------|:----------|:-----------|
| `identity_skills.ts` | `registerAgent`, `getAgent`, `setMetadata` | Agent identity on the Identity Registry |
| `validation_skills.ts` | `initJob`, `submitProof`, `isJobVerified`, `getJobData` | Job lifecycle on the Validation Registry |
| `reputation_skills.ts` | `submitFeedback`, `getReputation` | Feedback and reputation scores |
| `escrow_skills.ts` | `deposit`, `release`, `refund`, `getEscrow` | Escrow fund management |
| `transfer_skills.ts` | `transfer`, `multiTransfer` | EGLD, ESDT, NFT, SFT transfers |
| `discovery_skills.ts` | `discoverAgents`, `getBalance` | Agent discovery + balance queries |
| `hire_skills.ts` | `hireAgent` | Composite: init_job + escrow deposit |
| `manifest_skills.ts` | `buildManifest`, `buildManifestJSON` | Registration manifest with OASF validation |
| `oasf_taxonomy.ts` | `validateOASF`, lookups | Official OASF skill/domain taxonomy |

## Project Structure

```
moltbot-starter-kit/
├── src/
│   ├── skills/           ← All agent skills
│   │   ├── index.ts      ← Barrel export
│   │   ├── identity_skills.ts
│   │   ├── validation_skills.ts
│   │   ├── reputation_skills.ts
│   │   ├── escrow_skills.ts
│   │   ├── transfer_skills.ts
│   │   ├── discovery_skills.ts
│   │   ├── hire_skills.ts
│   │   ├── manifest_skills.ts
│   │   └── oasf_taxonomy.ts
│   ├── abis/             ← Smart contract ABIs
│   ├── utils/            ← Entrypoint, ABI patching, Logger
│   ├── config.ts         ← Centralized configuration
│   ├── validator.ts      ← Proof submission logic
│   ├── hiring.ts         ← Employer hiring flow
│   ├── facilitator.ts    ← x402 facilitator client
│   └── index.ts          ← Main agent loop
├── scripts/              ← register.ts, update_manifest.ts, build_manifest.ts
├── tests/                ← 68 unit tests (17 suites)
├── agent.config.json     ← Agent on-chain state (nonce, services, metadata)
└── manifest.config.json  ← Manifest blueprint (OASF skills, endpoints, contact)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MULTIVERSX_CHAIN_ID` | Network chain ID | `D` (devnet) |
| `MULTIVERSX_API_URL` | API endpoint | devnet API |
| `IDENTITY_REGISTRY_ADDRESS` | Identity Registry contract | — |
| `VALIDATION_REGISTRY_ADDRESS` | Validation Registry contract | — |
| `REPUTATION_REGISTRY_ADDRESS` | Reputation Registry contract | — |
| `ESCROW_CONTRACT_ADDRESS` | Escrow contract | — |

## Testing

```bash
npm test              # All tests
npm run test:coverage # With coverage report
```

## Documentation

- [SKILL.md](https://github.com/sasurobert/multiversx-openclaw-skills/blob/main/SKILL.md) — Full agent instructions
- [STARTER_KIT_GUIDE.md](./STARTER_KIT_GUIDE.md) — Step-by-step setup guide

## License

MIT
