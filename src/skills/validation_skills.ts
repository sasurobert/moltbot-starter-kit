/**
 * Validation Skills — job lifecycle on the Validation Registry
 *
 * Uses SDK v15 patterns matching validator.ts:
 * createEntrypoint() → factory/controller → ABI-typed arguments.
 */
import {
    Address,
    TransactionComputer,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { UserSigner } from '@multiversx/sdk-wallet';
import { promises as fs } from 'fs';
import * as path from 'path';

import { CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { createEntrypoint } from '../utils/entrypoint';
import { createPatchedAbi } from '../utils/abi';
import * as validationAbiJson from '../abis/validation-registry.abi.json';

const logger = new Logger('ValidationSkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InitJobParams {
    jobId: string;
    agentNonce: number;
    serviceId?: number;
    paymentAmount?: bigint;
    paymentToken?: string;
}

export interface SubmitProofParams {
    jobId: string;
    proofHash: string;
    useRelayer?: boolean;
}

export interface JobData {
    status: string;
    proof: Uint8Array;
    employer: Address;
    creation_timestamp: bigint;
    agent_nonce: bigint;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── init_job ──────────────────────────────────────────────────────────────────

export async function initJob(params: InitJobParams): Promise<string> {
    logger.info(`Initializing job: ${params.jobId} for agent #${params.agentNonce}`);

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(validationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);

    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.VALIDATION_REGISTRY,
    );

    const args: unknown[] = [
        Buffer.from(params.jobId),
        BigInt(params.agentNonce),
    ];

    if (params.serviceId !== undefined) {
        args.push(params.serviceId);
    }

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'init_job',
        gasLimit: CONFIG.GAS_LIMITS.SUBMIT_PROOF,
        arguments: args,
        nativeTransferAmount: params.paymentAmount ?? 0n,
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`init_job tx: ${txHash}`);
    return txHash;
}

// ─── submit_proof ──────────────────────────────────────────────────────────────
// NOTE: This follows the exact pattern from Validator.submitProof() in validator.ts

export async function submitProof(
    params: SubmitProofParams,
): Promise<string> {
    logger.info(
        `Submitting proof for ${params.jobId}: hash=${params.proofHash}`,
    );

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(validationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);

    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.VALIDATION_REGISTRY,
    );

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'submit_proof',
        gasLimit: CONFIG.GAS_LIMITS.SUBMIT_PROOF,
        arguments: [Buffer.from(params.jobId), Buffer.from(params.proofHash, 'hex')],
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    // Relayer V3
    if (params.useRelayer) {
        const relayerAddr = process.env.MULTIVERSX_RELAYER_ADDRESS;
        if (relayerAddr) {
            tx.relayer = Address.newFromBech32(relayerAddr);
            tx.version = 2;
            tx.gasLimit = BigInt(tx.gasLimit.toString()) + CONFIG.RELAYER_GAS_OVERHEAD;
        }
    }

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`submit_proof tx: ${txHash}`);
    return txHash;
}

// ─── is_job_verified ───────────────────────────────────────────────────────────
// Follows same pattern as hiring.ts::waitForJobVerification

export async function isJobVerified(jobId: string): Promise<boolean> {
    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(validationAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.VALIDATION_REGISTRY,
    );

    try {
        const results = await controller.query({
            contract: registry,
            function: 'is_job_verified',
            arguments: [Buffer.from(jobId)],
        });
        return results[0] === true;
    } catch {
        return false;
    }
}

// ─── get_job_data ──────────────────────────────────────────────────────────────

export async function getJobData(
    jobId: string,
): Promise<JobData | null> {
    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(validationAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.VALIDATION_REGISTRY,
    );

    try {
        const results = await controller.query({
            contract: registry,
            function: 'get_job_data',
            arguments: [Buffer.from(jobId)],
        });
        if (!results[0]) return null;
        return results[0] as JobData;
    } catch {
        logger.warn(`Failed to get job data for ${jobId}`);
        return null;
    }
}
