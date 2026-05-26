/**
 * Transfer Skills — EGLD, ESDT, NFT, MultiESDTNFTTransfer
 *
 * Uses SDK v15 TransfersTransactionsFactory + chain/ layer for signer/provider.
 */
import {Address, TokenTransfer, Token} from '@multiversx/sdk-core';

import {Logger} from '../utils/logger';
import {
  loadSignerWithAddress,
  createProvider,
  createEntrypoint,
  signAndSend,
} from '../chain';

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

// ─── transfer (single token) ───────────────────────────────────────────────────

export async function transfer(params: TransferParams): Promise<string> {
  logger.info(
    `Transferring ${params.amount} ${params.token || 'EGLD'} → ${params.receiver}`,
  );

  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');
  const entrypoint = createEntrypoint();
  const factory = entrypoint.createTransfersTransactionsFactory();
  const receiver = Address.newFromBech32(params.receiver);

  let tx;

  if (!params.token) {
    tx = await factory.createTransactionForNativeTokenTransfer(senderAddress, {
      receiver,
      nativeAmount: params.amount,
    });
  } else {
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

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
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

  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');
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

  const tx = await factory.createTransactionForESDTTokenTransfer(
    senderAddress,
    {
      receiver,
      tokenTransfers,
    },
  );

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
  logger.info(`Multi-transfer tx: ${txHash}`);
  return txHash;
}
