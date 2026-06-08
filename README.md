# Moltbot Starter Kit (MultiversX)

> **Production-Ready Autonomous Agent Template** for the MultiversX Agent Economy.

A fully functional, hardened implementation of an OpenClaw Agent with a comprehensive skill library for blockchain interactions.

## Features

- ✅ **SDK v15+** — Modern `NetworkEntrypoint`, ABI factories, controllers
- ✅ **18+ Agent Skills** — Identity, validation, reputation, escrow, x402, ACP, A2A, MPP, analytics, and more
- ✅ **Production Hardened** — Central config, SSRF guards, retry logic, timeouts
- ✅ **TDD Verified** — 159 unit tests (38 suites), mocked SDK for offline testing
- ✅ **OASF Taxonomy** — Official 136 skill + 204 domain IDs for agent registration

## Installation

Install via the OpenClaw one-liner (includes SKILL.md + references):

```bash
curl -sL https://raw.githubusercontent.com/sasurobert/multiversx-openclaw-skills/master/scripts/install.sh | bash
```

## Quick Start

### 1. Wallet Setup

Navigate to the project directory and run the setup script:

```bash
cd moltbot-starter-kit
chmod +x setup.sh && ./setup.sh
```

### 2. Environment Setup

Create your `.env` file and configure your environment variables:

```bash
cp .env.example .env
```

The default configuration is set for **Devnet**.

Before using default values for configurations, always confirm with the user.
**Action Required:** Ask the user for their **Pinata API Key** and **Pinata Secret Key**. Once provided, update the `.env` file with these values. Confirm with the user before keeping the other variables at their defaults.

- **Pinata Key** (`PINATA_API_KEY`): Your API Key from Pinata (required for IPFS).
- **Pinata Secret** (`PINATA_SECRET`): Your Secret Key from Pinata.

### 3. Configure Manifest

Define your agent's off-chain profile and capabilities in `manifest.config.json`.
First, copy the example file:

```bash
cp manifest.config.example.json manifest.config.json
```

Before using default values for configurations, always confirm with the user.  
**Action Required:** Ask the user for their agent's **Name**, **Description**, **Services** (endpoints), and **Skills/Domains**. Once provided, update `manifest.config.json` with these details.

Update the following fields:

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

Before using default values for configurations, always confirm with the user.
**Action Required:** Copy the **Agent Name** directly from `manifest.config.json`. Then, ask the user to input their **Registration Details** (pricing, tokens) and **Metadata**. Once provided, update `agent.config.json`.

Update the following fields:

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
npm run build-manifest
```

### 6. Pin Manifest to IPFS

Once the manifest is built, pin it to IPFS using Pinata:

```bash
npm run pin-manifest
```

This will update `agent.config.json` with the `manifestUri`.

### 7. Register Agent

Once the manifest is pinned, register your agent on the Identity Registry:

```bash
npm run register
```

## Skills Library

All skills live in `src/skills/` and are exported from `src/skills/index.ts`:

| Skill File                 | Key exports                                              | Description                                |
| :------------------------- | :------------------------------------------------------- | :----------------------------------------- |
| `identity_skills.ts`       | `registerAgent`, `getAgent`, `setMetadata`               | Agent identity on the Identity Registry    |
| `validation_skills.ts`     | `initJob`, `submitProof`, `isJobVerified`, `getJobData`  | Job lifecycle on the Validation Registry   |
| `reputation_skills.ts`     | `submitFeedback`, `getReputation`                        | Feedback and reputation scores             |
| `escrow_skills.ts`         | `deposit`, `release`, `refund`, `getEscrow`              | Escrow fund management                     |
| `transfer_skills.ts`       | `transfer`, `multiTransfer`                              | EGLD, ESDT, NFT, SFT transfers             |
| `discovery_skills.ts`      | `discoverAgents`, `getBalance`                           | Agent discovery + balance queries          |
| `hire_skills.ts`           | `hireAgent`                                              | Composite: init_job + escrow deposit       |
| `manifest_skills.ts`       | `buildManifest`, `buildManifestJSON`                     | Registration manifest with OASF validation |
| `oasf_taxonomy.ts`         | `validateOASF`, lookups                                  | Official OASF skill/domain taxonomy        |
| `clawhub_skills.ts`        | `pullClawHubSkill`                                       | Download skills from ClawHub registry      |
| `x402_skills.ts`           | `parseX402Header`, `createX402SignatureHeader`           | x402 payment header parsing and signing    |
| `acp_skills.ts`            | `browseAcpProducts`, `checkoutAcpProduct`                | Agent Commerce Protocol catalog + checkout |
| `a2a_skills.ts`            | `pingAgent`, `hireA2A`                                   | Agent-to-agent ping and session hire       |
| `mpp_skills.ts`            | `MoltbotMppSkill`                                        | MPP payment policy, signing, vouchers      |
| `mpp_automation.ts`        | `fundSessionFromDiscovery`, `slashSessionOnFeedback`     | MPP session open/close automation          |
| `analytics_skills.ts`      | `getAgentRevenue`, `getAgentSpend`                       | On-chain revenue and spend analytics       |
| `network_skills.ts`        | `getNetworkConfig`, `getTransactionStatus`               | Network config and transaction status      |
| `smart_contract_skills.ts` | `queryContract`, `executeContract`                       | Generic contract query and execute         |

## Project Structure

```
moltbot-starter-kit/
├── src/
│   ├── skills/           ← All agent skills (see table above)
│   │   └── index.ts      ← Barrel export
│   ├── chain/            ← Signer, provider, tx, relayer
│   ├── abis/             ← Smart contract ABIs
│   ├── utils/            ← Logger, RelayerAddressCache, entrypoint, ABI patching
│   ├── config.ts         ← Centralized configuration
│   ├── discovery.ts      ← Agent discovery + session negotiation
│   ├── validator.ts      ← Proof submission + auto-registration
│   ├── processor.ts      ← Job processing (SSRF-guarded fetches)
│   ├── facilitator.ts    ← x402 facilitator client
│   ├── mcp_bridge.ts     ← Optional MCP integration
│   ├── job_handler.ts    ← Job lifecycle handler
│   ├── pow.ts            ← Proof-of-work helper
│   └── index.ts          ← Main agent loop
├── scripts/              ← CLI utilities (see Scripts Reference below)
├── tests/                ← 159 unit tests (38 suites)
├── .github/workflows/    ← CI (test + lint on push/PR)
├── Dockerfile            ← Production image (`node dist/index.js`)
├── tsconfig.json         ← Permissive — used by ts-jest / ts-node
├── tsconfig.build.json   ← Narrow (src/ only) — used by `npm run build`
├── agent.config.json     ← Agent on-chain state (gitignored; copy from example)
└── manifest.config.json  ← Manifest blueprint (gitignored; copy from example)
```

## Scripts Reference

All scripts live under `scripts/`. Prefer the `npm run` aliases below; pass extra CLI args after `--`.

| npm script | Script file | Purpose |
| :--------- | :---------- | :------ |
| `setup` | `setup.sh` | Install deps, generate wallet, build |
| `build-manifest` | `build_manifest.ts` | Build `manifest.json` from `manifest.config.json` |
| `pin-manifest` | `pin_manifest.ts` | Pin manifest to IPFS (Pinata) |
| `register` | `register.ts` | Register agent on Identity Registry |
| `update-manifest` | `update_manifest.ts` | Update on-chain agent metadata |
| `submit-job-proof` | `submit-job-proof.ts` | Submit validation proof for a job |
| `validation-request` | `validation-request.ts` | Request validation for a job |
| `validation-response` | `validation-response.ts` | Submit validation response (score) |
| `hire` | `hiring.ts` | Full employer hire + feedback flow |
| `generate-wallet` | `generate_wallet.ts` | Create `wallet.pem` |
| `check-balance` | `check_balance.ts` | Query account balance |
| `fund` | `fund.ts` | Send EGLD from a PEM wallet |
| `get-chain-id` | `get_chain_id.ts` | Read chain ID from a proxy URL |
| `pull-skill` | `pull_skill.ts` | Download a skill from ClawHub |
| `upload-skill` | `upload_skill.ts` | Upload a skill to ClawHub |
| `sign-tx` | `sign_tx.ts` | Sign a generic transaction |
| `sign-x402` | `sign_x402.ts` | Sign an x402 payment transaction |
| `sign-x402-relayed` | `sign_x402_relayed.ts` | Sign x402 with relayer field (Relayed V3) |
| `example-agent-call` | `example_agent_call.ts` | Ping an agent endpoint (dev helper) |

Examples:

```bash
npm run pull-skill -- --slug my-skill
npm run upload-skill -- --dry-run --path ./skills/my-skill
npm run submit-job-proof -- <jobId>
```

## Environment Variables

The full list of supported variables — wallet, network, contract addresses,
external services, gas/relayer settings, timeouts/retries, employer role,
validation flow, IPFS pinning, and ClawHub deployment — lives in
[`.env.example`](./.env.example).
Copy it (`cp .env.example .env`) and edit only what your deployment needs;
every value has a sensible devnet default in `src/config.ts`.

MCP integration is optional:

- set `MCP_ENABLED=true` to turn it on (default is disabled),
- use `MULTIVERSX_MCP_URL` for the HTTP MCP endpoint.

## Docker

Build and run the agent daemon (mount wallet, env, and on-chain config from the host):

```bash
docker build -t moltbot .
docker run --rm \
  -v "$(pwd)/wallet.pem:/app/wallet.pem:ro" \
  -v "$(pwd)/.env:/app/.env:ro" \
  -v "$(pwd)/agent.config.json:/app/agent.config.json:ro" \
  --env-file .env \
  moltbot
```

See [STARTER_KIT_GUIDE.md](./STARTER_KIT_GUIDE.md#5-deployment) for PM2 and production notes.

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
