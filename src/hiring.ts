import {
  Address,
  Transaction,
  TransactionComputer,
  UserSigner,
  Query,
  BytesValue,
  U64Value,
  BigUIntValue
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { CONFIG } from './config';
import { Facilitator } from './facilitator';
import * as fs from 'fs';

async function runEmployerFlow() {
  console.log('--- Starting Employer Hiring Flow ---');

  if (!CONFIG.EMPLOYER.PEM_PATH || !CONFIG.EMPLOYER.ADDRESS) {
    console.error('Employer PEM_PATH or ADDRESS not configured in .env');
    process.exit(1);
  }

  const facilitator = new Facilitator();
  const pemContent = fs.readFileSync(CONFIG.EMPLOYER.PEM_PATH).toString();
  const signer = UserSigner.fromPem(pemContent);
  const employerAddr = CONFIG.EMPLOYER.ADDRESS;

  // 1. Prepare Job (Architect Phase)
  // Requesting an 'inference' service for agent nonce 1
  const agentNonce = 1;
  const serviceId = 'inference';

  console.log(
    `Preparing job for Agent ${agentNonce}, service: ${serviceId}...`,
  );
  const preparation = await facilitator.prepare({
    agentNonce,
    serviceId,
    employerAddress: employerAddr,
  });

  console.log('Preparation received:', {
    jobId: preparation.jobId,
    amount: preparation.amount,
    receiver: preparation.receiver,
  });

  // Setup Provider
  const provider = new ApiNetworkProvider(CONFIG.API_URL);

  const performSettlement = async (attempt: number): Promise<string> => {
    try {
      console.log(`\n--- Settlement Attempt ${attempt} ---`);

      // 1. Fetch Fresh Nonce
      const account = await provider.getAccount({ bech32: () => employerAddr });
      console.log(`Fetched Sender Nonce: ${account.nonce}`);

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
      console.log('Sending signed transaction to Facilitator...');
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
      console.log(`Settlement Broadcasted. TxHash: ${result.txHash}`);

      // 4. Monitor Protocol
      return await monitorTx(result.txHash);

    } catch (e: any) {
      throw new Error(`Attempt ${attempt} failed: ${e.message}`);
    }
  };

  const monitorTx = async (txHash: string): Promise<string> => {
    const maxTime = 120000; // 2 mins
    const start = Date.now();

    while (Date.now() - start < maxTime) {
      try {
        const tx = await provider.getTransaction(txHash);
        const status = tx.status.toString().toLowerCase(); // sdk-core v13+ might return object
        console.log(`Monitoring ${txHash}: ${status}`);

        if (status === 'success' || status === 'successful') return txHash;
        if (status === 'fail' || status === 'failed' || status === 'invalid') throw new Error(`Tx failed on-chain: ${status}`);
      } catch (e: any) {
        if (e.message.includes('404')) {
          // pending propagation
        } else {
          console.warn(`Monitor error: ${e.message}`);
        }
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error("Transaction monitoring timed out after 2 minutes.");
  };

  // Retry Loop
  let attempts = 1;
  let settledJobId: string | undefined;

  while (attempts <= 3) {
    try {
      const finalHash = await performSettlement(attempts);
      console.log(`\nSUCCESS: Job Initialized and Confirmed!`);
      console.log(`TxHash: ${finalHash}`);
      console.log(`JobId: ${preparation.jobId}`);
      settledJobId = preparation.jobId;
      break;
    } catch (e: any) {
      console.warn(e.message);
      console.warn(`Retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  if (!settledJobId) {
    console.error("Failed to settle job after 3 attempts.");
    process.exit(1);
  }

  // 5. Wait for Verification (Worker to submit proof)
  console.log('\n--- Waiting for Job Verification ---');
  await waitForJobVerification(settledJobId, provider);

  // 6. Submit Reputation
  console.log('\n--- Submitting Reputation Feedback ---');
  await submitReputation(settledJobId, 5, provider, signer, employerAddr); // Rating 5/5
}

async function waitForJobVerification(jobId: string, provider: ApiNetworkProvider) {
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.VALIDATION_REGISTRY);
  const maxRetries = 60; // Wait up to 5 minutes (5s * 60)

  for (let i = 0; i < maxRetries; i++) {
    process.stdout.write('.');
    try {
      const query = new Query({
        address: registry,
        func: 'is_job_verified',
        args: [new BytesValue(Buffer.from(jobId))]
      });
      const response = await provider.queryContract(query as any);

      if (response.returnData && response.returnData.length > 0) {
        const val = Buffer.from(response.returnData[0], 'base64').toString('hex');
        // true is '01' or '1'
        if (val === '01' || val === '1') {
          console.log('\nJob Verification Confirmed!');
          return;
        }
      }
    } catch (e) {
      // Ignore temporary query failures
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('\nJob verification timed out. Worker did not submit proof in time.');
}

async function submitReputation(
  jobId: string,
  rating: number,
  provider: ApiNetworkProvider,
  signer: UserSigner,
  sender: string
) {
  // Contract: submit_feedback(job_id, agent_nonce, rating)
  // We strictly need the agent nonce matching the job. 
  // In this script we know it is '1' (const agentNonce = 1 above).
  // In a real app we'd fetch it from the JobData.
  const agentNonce = 1;

  const registry = Address.newFromBech32(CONFIG.ADDRESSES.REPUTATION_REGISTRY);
  const senderAddr = Address.newFromBech32(sender);

  // Fetch Nonce
  const account = await provider.getAccount({ bech32: () => sender });

  const tx = new Transaction({
    nonce: BigInt(account.nonce),
    receiver: registry,
    gasLimit: 10_000_000n,
    chainID: CONFIG.CHAIN_ID,
    value: 0n,
    sender: senderAddr,
    data: Buffer.from(
      `submit_feedback@${Buffer.from(jobId).toString('hex')}@${new U64Value(agentNonce).toString()}@${new BigUIntValue(BigInt(rating)).toString()}`
    )
  });

  const computer = new TransactionComputer();
  const bytesToSign = computer.computeBytesForSigning(tx);
  tx.signature = await signer.sign(bytesToSign);

  console.log(`Broadcasting feedback tx...`);
  const txHash = await provider.sendTransaction(tx);
  console.log(`Feedback Tx: ${txHash}`);

  // Optional: Monitor feedback tx
  // For brevity/script, we just log it.
}

if (require.main === module) {
  runEmployerFlow().catch(err => {
    console.error('Hiring flow failed:', err.message);
    process.exit(1);
  });
}
