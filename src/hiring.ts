import {
  Address,
  Transaction,
  TransactionComputer,
  UserSigner,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { CONFIG } from './config';
import { Facilitator } from './facilitator';
import * as fs from 'fs';

import { Logger } from './utils/logger';
import { createEntrypoint } from './utils/entrypoint';
import { createPatchedAbi } from './utils/abi';
import * as validationAbiJson from './abis/validation-registry.abi.json';
import * as reputationAbiJson from './abis/reputation-registry.abi.json';

const logger = new Logger('HiringScript');

async function runEmployerFlow() {
  logger.info('--- Starting Employer Hiring Flow ---');

  if (!CONFIG.EMPLOYER.PEM_PATH || !CONFIG.EMPLOYER.ADDRESS) {
    logger.error('Employer PEM_PATH or ADDRESS not configured in .env');
    process.exit(1);
  }

  const facilitator = new Facilitator();
  const pemContent = fs.readFileSync(CONFIG.EMPLOYER.PEM_PATH).toString();
  const signer = UserSigner.fromPem(pemContent);
  const employerAddr = CONFIG.EMPLOYER.ADDRESS;

  // 1. Prepare Job (Architect Phase)
  // Requesting an 'inference' service for agent nonce 1
  const agentNonce = parseInt(process.env.AGENT_NONCE || '1', 10);
  const serviceId = process.env.AGENT_SERVICE_ID || 'inference';

  logger.info(
    `Preparing job for Agent ${agentNonce}, service: ${serviceId}...`,
  );
  const preparation = await facilitator.prepare({
    agentNonce,
    serviceId,
    employerAddress: employerAddr,
  });

  logger.info('Preparation received:', {
    jobId: preparation.jobId,
    amount: preparation.amount,
  });

  // Setup Provider
  const provider = new ApiNetworkProvider(CONFIG.API_URL);

  const performSettlement = async (attempt: number): Promise<string> => {
    try {
      logger.info(`--- Settlement Attempt ${attempt} ---`);

      // 1. Fetch Fresh Nonce
      const account = await provider.getAccount({ bech32: () => employerAddr });
      logger.info(`Fetched Sender Nonce: ${account.nonce}`);

      // 2. Construct Transaction
      const tx = new Transaction({
        nonce: BigInt(account.nonce),
        value: BigInt(preparation.amount),
        receiver: Address.newFromBech32(preparation.registryAddress),
        sender: Address.newFromBech32(employerAddr),
        gasPrice: 1_000_000_000n,
        gasLimit: 30_000_000n,
        data: Buffer.from(preparation.data),
        chainID: CONFIG.CHAIN_ID,
      });

      const computer = new TransactionComputer();
      const bytesToSign = computer.computeBytesForSigning(tx);
      const signature = await signer.sign(bytesToSign);

      // 3. Settle Job
      logger.info('Sending signed transaction to Facilitator...');
      const settlementPayload = {
        nonce: Number(tx.nonce),
        value: tx.value.toString(),
        receiver: tx.receiver.toBech32(),
        sender: tx.sender.toBech32(),
        gasPrice: Number(tx.gasPrice),
        gasLimit: Number(tx.gasLimit),
        data: preparation.data,
        chainID: tx.chainID,
        version: tx.version,
        options: tx.options,
        signature: Buffer.from(signature).toString('hex'),
      };

      const result = await facilitator.settle(settlementPayload);
      logger.info(`Settlement Broadcasted. TxHash: ${result.txHash}`);

      // 4. Monitor Protocol
      return await monitorTx(result.txHash);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Attempt ${attempt} failed: ${message}`);
    }
  };

  const monitorTx = async (txHash: string): Promise<string> => {
    const maxTime = 120000; // 2 mins
    const start = Date.now();

    while (Date.now() - start < maxTime) {
      try {
        const tx = await provider.getTransaction(txHash);
        const status = tx.status.toString().toLowerCase(); // sdk-core v13+ might return object
        logger.info(`Monitoring ${txHash}: ${status}`);

        if (status === 'success' || status === 'successful') return txHash;
        if (status === 'fail' || status === 'failed' || status === 'invalid')
          throw new Error(`Tx failed on-chain: ${status}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('404')) {
          // pending propagation
        } else {
          logger.warn(`Monitor error: ${message}`);
        }
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Transaction monitoring timed out after 2 minutes.');
  };

  // Retry Loop
  let attempts = 1;
  let settledJobId: string | undefined;

  while (attempts <= 3) {
    try {
      const finalHash = await performSettlement(attempts);
      logger.info('SUCCESS: Job Initialized and Confirmed!');
      logger.info(`TxHash: ${finalHash}`);
      logger.info(`JobId: ${preparation.jobId}`);
      settledJobId = preparation.jobId;
      break;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(message);
      logger.warn('Retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  if (!settledJobId) {
    logger.error('Failed to settle job after 3 attempts.');
    process.exit(1);
  }

  // 5. Wait for Verification (Worker to submit proof)
  logger.info('--- Waiting for Job Verification ---');
  await waitForJobVerification(settledJobId);

  // 6. Submit Reputation
  logger.info('--- Submitting Reputation Feedback ---');
  await submitReputation(settledJobId, 5, provider, signer, employerAddr); // Rating 5/5
}

async function waitForJobVerification(jobId: string) {
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.VALIDATION_REGISTRY);
  const maxRetries = 60; // Wait up to 5 minutes (5s * 60)

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(validationAbiJson);
  const controller = entrypoint.createSmartContractController(abi);

  for (let i = 0; i < maxRetries; i++) {
    process.stdout.write('.');
    try {
      const results = await controller.query({
        contract: registry,
        function: 'is_job_verified',
        arguments: [Buffer.from(jobId)],
      });

      if (results[0] === true) {
        logger.info('Job Verification Confirmed!');
        return;
      }
    } catch (e: unknown) {
      // Ignore temporary query failures
      logger.warn('Query failed:', (e as Error).message);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(
    '\nJob verification timed out. Worker did not submit proof in time.',
  );
}

async function submitReputation(
  jobId: string,
  rating: number,
  provider: ApiNetworkProvider,
  signer: UserSigner,
  sender: string,
) {
  const agentNonce = parseInt(process.env.AGENT_NONCE || '1', 10);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.REPUTATION_REGISTRY);
  const senderAddr = Address.newFromBech32(sender);

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(reputationAbiJson);
  const factory = entrypoint.createSmartContractTransactionsFactory(abi);

  const account = await provider.getAccount({ bech32: () => sender });

  const tx = await factory.createTransactionForExecute(senderAddr, {
    contract: registry,
    function: 'giveFeedbackSimple',
    arguments: [Buffer.from(jobId), BigInt(agentNonce), BigInt(rating)],
    gasLimit: 10_000_000n,
  });

  tx.nonce = BigInt(account.nonce);
  const computer = new TransactionComputer();
  tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

  logger.info('Broadcasting feedback tx...');
  const txHash = await provider.sendTransaction(tx);
  logger.info(`Feedback Tx: ${txHash}`);
}

if (require.main === module) {
  runEmployerFlow().catch(err => {
    logger.error('Hiring flow failed:', err.message);
    process.exit(1);
  });
}
