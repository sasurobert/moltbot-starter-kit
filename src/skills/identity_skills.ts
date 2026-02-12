/**
 * Identity Skills — register, update, query agent identity on the Identity Registry
 *
 * Uses SDK v15 patterns: createEntrypoint() → factory/controller → ABI-typed arguments.
 * Follows validators.ts and hiring.ts established patterns.
 */
import {
    Address,
    TransactionComputer,
    VariadicValue,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { UserSigner } from '@multiversx/sdk-wallet';
import { promises as fs } from 'fs';
import * as path from 'path';
import axios from 'axios';

import { CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { createEntrypoint } from '../utils/entrypoint';
import { createPatchedAbi } from '../utils/abi';
import * as identityAbiJson from '../abis/identity-registry.abi.json';

const logger = new Logger('IdentitySkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AgentDetails {
    name: string;
    uri: string;
    public_key: string;
    owner: Address;
    metadata: Array<{ key: string; value: string }>;
}

export interface RegisterAgentParams {
    name: string;
    uri: string;
    metadata?: Array<{ key: string; value: string }>;
    useRelayer?: boolean;
}

export interface SetMetadataParams {
    agentNonce: number;
    entries: Array<{ key: string; value: string }>;
}

// ─── Internals ─────────────────────────────────────────────────────────────────

async function loadSignerAndProvider() {
    const pemPath =
        process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs.readFile(pemPath, 'utf8');
    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = new Address(signer.getAddress().bech32());
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
        clientName: 'moltbot-skills',
        timeout: CONFIG.REQUEST_TIMEOUT,
    });
    return { signer, senderAddress, provider };
}

// ─── register_agent ────────────────────────────────────────────────────────────

export async function registerAgent(
    params: RegisterAgentParams,
): Promise<string> {
    logger.info(`Registering agent: ${params.name}`);

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(identityAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);

    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.IDENTITY_REGISTRY,
    );

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'register_agent',
        gasLimit: CONFIG.GAS_LIMITS.REGISTER,
        arguments: [
            Buffer.from(params.name),
            Buffer.from(params.uri),
            Buffer.from(senderAddress.getPublicKey()),
            VariadicValue.fromItemsCounted(), // metadata (empty for now)
            VariadicValue.fromItemsCounted(), // services (empty for now)
        ],
    });

    // Nonce
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    // Relayer V3
    if (params.useRelayer) {
        const relayerAddr = await discoverRelayerAddress(senderAddress);
        if (relayerAddr) {
            tx.relayer = relayerAddr;
            tx.version = 2;
            tx.gasLimit = BigInt(tx.gasLimit.toString()) + CONFIG.RELAYER_GAS_OVERHEAD;
        }
    }

    // Sign & Send
    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Registration tx: ${txHash}`);
    return txHash;
}

// ─── get_agent ─────────────────────────────────────────────────────────────────

export async function getAgent(
    agentNonce: number,
): Promise<AgentDetails | null> {
    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(identityAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.IDENTITY_REGISTRY,
    );

    try {
        const results = await controller.query({
            contract: registry,
            function: 'get_agent',
            arguments: [agentNonce],
        });

        if (!results[0]) return null;
        return results[0] as AgentDetails;
    } catch (error) {
        logger.warn(
            `Failed to get agent ${agentNonce}: ${(error as Error).message}`,
        );
        return null;
    }
}

// ─── set_metadata ──────────────────────────────────────────────────────────────

export async function setMetadata(
    params: SetMetadataParams,
): Promise<string> {
    logger.info(
        `Setting ${params.entries.length} metadata entries for agent #${params.agentNonce}`,
    );

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(identityAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.IDENTITY_REGISTRY,
    );

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'set_metadata',
        gasLimit: CONFIG.GAS_LIMITS.UPDATE,
        arguments: [
            BigInt(params.agentNonce),
            VariadicValue.fromItemsCounted(), // metadata — TODO: populate from entries
            VariadicValue.fromItemsCounted(), // services
        ],
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Metadata tx: ${txHash}`);
    return txHash;
}

// ─── Relayer Discovery ─────────────────────────────────────────────────────────

async function discoverRelayerAddress(
    senderAddress: Address,
): Promise<Address | null> {
    const relayerUrl = CONFIG.PROVIDERS.RELAYER_URL;
    if (!relayerUrl) return null;

    try {
        const resp = await axios.get(
            `${relayerUrl}/relayer/address/${senderAddress.toBech32()}`,
        );
        if (resp.data?.relayerAddress) {
            return Address.newFromBech32(resp.data.relayerAddress);
        }
        return null;
    } catch {
        logger.warn('Could not discover relayer address');
        return null;
    }
}
