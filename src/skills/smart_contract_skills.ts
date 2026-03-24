import {Address, TransactionComputer} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {UserSigner} from '@multiversx/sdk-wallet';
import {promises as fs} from 'fs';
import * as path from 'path';

import {CONFIG} from '../config';
import {Logger} from '../utils/logger';
import {createEntrypoint} from '../utils/entrypoint';

const logger = new Logger('SmartContractSkills');

export interface ContractQueryParams {
  address: string;
  funcName: string;
  args?: string[]; // hex encoded arguments
}

export interface ContractExecuteParams {
  address: string;
  funcName: string;
  args?: string[];
  value?: bigint;
  gasLimit?: bigint;
}

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
  return {signer, senderAddress, provider};
}

export async function queryContract(
  params: ContractQueryParams,
): Promise<unknown[]> {
  logger.info(`Querying contract ${params.address} func: ${params.funcName}`);
  const entrypoint = createEntrypoint();
  const controller = entrypoint.createSmartContractController();

  try {
    const result = await controller.query({
      contract: Address.newFromBech32(params.address),
      function: params.funcName,
      arguments: params.args || [],
    });
    return result;
  } catch (err) {
    logger.error(`Query failed: ${err}`);
    return [];
  }
}

export async function executeContract(
  params: ContractExecuteParams,
): Promise<string> {
  logger.info(`Executing contract ${params.address} func: ${params.funcName}`);
  const {signer, senderAddress, provider} = await loadSignerAndProvider();
  const entrypoint = createEntrypoint();
  const factory = entrypoint.createSmartContractTransactionsFactory();

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: Address.newFromBech32(params.address),
    function: params.funcName,
    arguments: params.args || [],
    nativeTransferAmount: params.value || 0n,
    gasLimit: params.gasLimit || 10000000n,
  });

  const account = await provider.getAccount({
    bech32: () => senderAddress.toBech32(),
  });
  tx.nonce = BigInt(account.nonce);

  const computer = new TransactionComputer();
  tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

  const txHash = await provider.sendTransaction(tx);
  logger.info(`Execute tx broadcasted: ${txHash}`);
  return txHash;
}
