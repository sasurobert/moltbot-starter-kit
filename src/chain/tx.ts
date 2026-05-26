import {Address, Transaction, TransactionComputer} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {UserSigner} from '@multiversx/sdk-wallet';
import axios from 'axios';
import {CONFIG} from '../config';

const txComputer = new TransactionComputer();

/**
 * Fetches the on-chain nonce for `sender` and stamps it on `tx`.
 */
export async function applyFreshNonce(
  tx: Transaction,
  sender: Address,
  provider: ApiNetworkProvider,
): Promise<void> {
  const account = await provider.getAccount({bech32: () => sender.toBech32()});
  tx.nonce = BigInt(account.nonce);
}

/**
 * Computes bytes-for-signing and stamps the signature.
 */
export async function sign(tx: Transaction, signer: UserSigner): Promise<void> {
  tx.signature = await signer.sign(txComputer.computeBytesForSigning(tx));
}

/**
 * Marks `tx` as relayed-V3 with the given relayer address and adds the
 * standard gas overhead.
 */
export function withRelayer(tx: Transaction, relayer: Address): void {
  tx.relayer = relayer;
  tx.version = 2;
  tx.gasLimit = BigInt(tx.gasLimit.toString()) + CONFIG.RELAYER_GAS_OVERHEAD;
}

/**
 * "Stamp nonce → sign → broadcast" sequence. Returns the tx hash.
 */
export async function signAndSend(
  tx: Transaction,
  signer: UserSigner,
  sender: Address,
  provider: ApiNetworkProvider,
): Promise<string> {
  await applyFreshNonce(tx, sender, provider);
  await sign(tx, signer);
  return provider.sendTransaction(tx);
}

/**
 * "Stamp nonce → sign → relay" sequence. Returns the tx hash.
 *
 * Caller is responsible for having already called `withRelayer(tx, relayerAddr)`.
 */
export async function signAndRelay(
  tx: Transaction,
  signer: UserSigner,
  sender: Address,
  provider: ApiNetworkProvider,
  relayerUrl: string,
): Promise<string> {
  await applyFreshNonce(tx, sender, provider);
  await sign(tx, signer);
  const res = await axios.post(
    `${relayerUrl}/relay`,
    {transaction: tx.toPlainObject()},
    {timeout: CONFIG.REQUEST_TIMEOUT},
  );
  return res.data.txHash;
}
