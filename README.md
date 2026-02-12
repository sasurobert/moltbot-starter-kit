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

```bash
git clone https://github.com/multiversx/moltbot-starter-kit.git
cd moltbot-starter-kit
chmod +x setup.sh && ./setup.sh
```

Or install via the OpenClaw one-liner (includes SKILL.md + references):
```bash
curl -sL https://raw.githubusercontent.com/multiversx/multiversx-openclaw-skills/main/scripts/install.sh | bash
```

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
├── scripts/              ← register.ts, update_manifest.ts
├── tests/                ← 47+ unit tests
└── config.json           ← Agent metadata
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

- [SKILL.md](https://github.com/multiversx/multiversx-openclaw-skills/blob/main/SKILL.md) — Full agent instructions
- [STARTER_KIT_GUIDE.md](./STARTER_KIT_GUIDE.md) — Step-by-step setup guide

## License

MIT
