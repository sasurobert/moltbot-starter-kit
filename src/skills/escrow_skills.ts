/**
 * Escrow Skills — deposit, release, refund, query escrow state
 *
 * Uses SDK v15 patterns with the Escrow ABI.
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
import * as escrowAbiJson from '../abis/escrow.abi.json';

const logger = new Logger('EscrowSkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DepositParams {
    jobId: string;
    receiverAddress: string;
    poaHash: string;
    deadlineTimestamp: number;
    amount: bigint;
    token?: string; // ESDT token ID; if omitted, uses EGLD
}

export interface EscrowData {
    employer: Address;
    receiver: Address;
    token_id: string;
    token_nonce: bigint;
    amount: bigint;
    poa_hash: Uint8Array;
    deadline: bigint;
    status: string; // 'Active' | 'Released' | 'Refunded'
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

// ─── deposit ───────────────────────────────────────────────────────────────────

export async function deposit(params: DepositParams): Promise<string> {
    logger.info(`Depositing ${params.amount} for job ${params.jobId}`);

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = Address.newFromBech32(
        CONFIG.ADDRESSES.ESCROW_CONTRACT,
    );

    const receiver = Address.newFromBech32(params.receiverAddress);

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'deposit',
        gasLimit: 15_000_000n,
        arguments: [
            Buffer.from(params.jobId),
            receiver,
            Buffer.from(params.poaHash, 'hex'),
            BigInt(params.deadlineTimestamp),
        ],
        nativeTransferAmount: params.token ? 0n : params.amount,
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Deposit tx: ${txHash}`);
    return txHash;
}

// ─── release ───────────────────────────────────────────────────────────────────

export async function release(jobId: string): Promise<string> {
    logger.info(`Releasing escrow for job ${jobId}`);

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = Address.newFromBech32(
        CONFIG.ADDRESSES.ESCROW_CONTRACT,
    );

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'release',
        gasLimit: 10_000_000n,
        arguments: [Buffer.from(jobId)],
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Release tx: ${txHash}`);
    return txHash;
}

// ─── refund ────────────────────────────────────────────────────────────────────

export async function refund(jobId: string): Promise<string> {
    logger.info(`Refunding escrow for job ${jobId}`);

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = Address.newFromBech32(
        CONFIG.ADDRESSES.ESCROW_CONTRACT,
    );

    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'refund',
        gasLimit: 10_000_000n,
        arguments: [Buffer.from(jobId)],
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Refund tx: ${txHash}`);
    return txHash;
}

// ─── get_escrow ────────────────────────────────────────────────────────────────

export async function getEscrow(
    jobId: string,
): Promise<EscrowData | null> {
    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(escrowAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const escrowContract = Address.newFromBech32(
        CONFIG.ADDRESSES.ESCROW_CONTRACT,
    );

    try {
        const results = await controller.query({
            contract: escrowContract,
            function: 'get_escrow',
            arguments: [Buffer.from(jobId)],
        });
        if (!results[0]) return null;
        return results[0] as EscrowData;
    } catch {
        logger.warn(`Failed to get escrow for ${jobId}`);
        return null;
    }
}
