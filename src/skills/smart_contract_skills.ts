import {Address} from '@multiversx/sdk-core';

import {Logger} from '../utils/logger';
import {
  loadSignerWithAddress,
  createProvider,
  createEntrypoint,
  signAndSend,
} from '../chain';

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
  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');
  const entrypoint = createEntrypoint();
  const factory = entrypoint.createSmartContractTransactionsFactory();

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: Address.newFromBech32(params.address),
    function: params.funcName,
    arguments: params.args || [],
    nativeTransferAmount: params.value || 0n,
    gasLimit: params.gasLimit || 10_000_000n,
  });

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
  logger.info(`Execute tx broadcasted: ${txHash}`);
  return txHash;
}
