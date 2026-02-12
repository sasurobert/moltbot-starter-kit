/**
 * Transfer Skills — EGLD, ESDT, NFT, MultiESDTNFTTransfer
 *
 * Uses SDK v15 TransfersTransactionsFactory — no custom ABI needed.
 */
import {
    Address,
    TransactionComputer,
    TokenTransfer,
    Token,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { UserSigner } from '@multiversx/sdk-wallet';
import { promises as fs } from 'fs';
import * as path from 'path';

import { CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { createEntrypoint } from '../utils/entrypoint';

const logger = new Logger('TransferSkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TransferParams {
    receiver: string;
    amount: bigint;
    token?: string; // If omitted, sends EGLD
    tokenNonce?: number; // For NFTs/SFTs
}

export interface MultiTransferItem {
    token: string;
    nonce: number;
    amount: bigint;
}

export interface MultiTransferParams {
    receiver: string;
    transfers: MultiTransferItem[];
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

// ─── transfer (single token) ───────────────────────────────────────────────────

export async function transfer(params: TransferParams): Promise<string> {
    logger.info(
        `Transferring ${params.amount} ${params.token || 'EGLD'} → ${params.receiver}`,
    );

    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = createEntrypoint();
    const factory = entrypoint.createTransfersTransactionsFactory();
    const receiver = Address.newFromBech32(params.receiver);

    let tx;

    if (!params.token) {
        // EGLD transfer
        tx = await factory.createTransactionForNativeTokenTransfer(senderAddress, {
            receiver,
            nativeAmount: params.amount,
        });
    } else {
        // ESDT / NFT / SFT transfer
        const tokenTransfer = new TokenTransfer({
            token: new Token({
                identifier: params.token,
                nonce: BigInt(params.tokenNonce ?? 0),
            }),
            amount: params.amount,
        });

        tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
            receiver,
            tokenTransfers: [tokenTransfer],
        });
    }

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Transfer tx: ${txHash}`);
    return txHash;
}

// ─── multiTransfer ─────────────────────────────────────────────────────────────

export async function multiTransfer(
    params: MultiTransferParams,
): Promise<string> {
    logger.info(
        `Multi-transfer: ${params.transfers.length} tokens → ${params.receiver}`,
    );

    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = createEntrypoint();
    const factory = entrypoint.createTransfersTransactionsFactory();
    const receiver = Address.newFromBech32(params.receiver);

    const tokenTransfers = params.transfers.map(
        item =>
            new TokenTransfer({
                token: new Token({
                    identifier: item.token,
                    nonce: BigInt(item.nonce),
                }),
                amount: item.amount,
            }),
    );

    const tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
        receiver,
        tokenTransfers,
    });

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);

    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
    logger.info(`Multi-transfer tx: ${txHash}`);
    return txHash;
}
