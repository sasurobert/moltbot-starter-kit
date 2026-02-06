import {
  Address,
  Transaction,
  TransactionComputer,
  UserSigner,
  Query,
  ArgSerializer,
  BytesValue,
  AbiRegistry,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  NativeSerializer,
  BigUIntValue,
} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {CONFIG} from './config';
import {Facilitator} from './facilitator';
import * as fs from 'fs';
import * as path from 'path';

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
      const account = await provider.getAccount({bech32: () => employerAddr});
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
        console.log(`Monitoring ${txHash}: ${status}`);

        if (status === 'success' || status === 'successful') return txHash;
        if (status === 'fail' || status === 'failed' || status === 'invalid')
          throw new Error(`Tx failed on-chain: ${status}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('404')) {
          // pending propagation
        } else {
          console.warn(`Monitor error: ${message}`);
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
      console.log('\nSUCCESS: Job Initialized and Confirmed!');
      console.log(`TxHash: ${finalHash}`);
      console.log(`JobId: ${preparation.jobId}`);
      settledJobId = preparation.jobId;
      break;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(message);
      console.warn('Retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  if (!settledJobId) {
    console.error('Failed to settle job after 3 attempts.');
    process.exit(1);
  }

  // 5. Wait for Verification (Worker to submit proof)
  console.log('\n--- Waiting for Job Verification ---');
  await waitForJobVerification(settledJobId, provider);

  // 6. Submit Reputation
  console.log('\n--- Submitting Reputation Feedback ---');
  await submitReputation(settledJobId, 5, provider, signer, employerAddr); // Rating 5/5
}

async function waitForJobVerification(
  jobId: string,
  provider: ApiNetworkProvider,
) {
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.VALIDATION_REGISTRY);
  const maxRetries = 60; // Wait up to 5 minutes (5s * 60)

  const abiPath = path.join(
    __dirname,
    '../src/abis/validation-registry.abi.json',
  );
  const abi = AbiRegistry.create(JSON.parse(fs.readFileSync(abiPath, 'utf8')));

  for (let i = 0; i < maxRetries; i++) {
    process.stdout.write('.');
    try {
      const serializer = new ArgSerializer();
      const query = new Query({
        address: registry,
        func: 'is_job_verified',
        args: [new BytesValue(Buffer.from(jobId))],
      }) as any;
      const response = await provider.queryContract(query);
      const values = serializer.buffersToValues(
        response.getReturnDataParts(),
        abi.getEndpoint('is_job_verified').output,
      );

      if (values[0]?.valueOf() === true) {
        console.log('\nJob Verification Confirmed!');
        return;
      }
    } catch {
      // Ignore temporary query failures
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
  const agentNonce = 1;
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.REPUTATION_REGISTRY);
  const senderAddr = Address.newFromBech32(sender);

  const abiPath = path.join(
    __dirname,
    '../src/abis/reputation-registry.abi.json',
  );
  const abi = AbiRegistry.create(JSON.parse(fs.readFileSync(abiPath, 'utf8')));

  const account = await provider.getAccount({bech32: () => sender});

  const factory = new SmartContractTransactionsFactory({
    abi,
    config: new TransactionsFactoryConfig({chainID: CONFIG.CHAIN_ID}),
  });

  const endpoint = abi.getEndpoint('submit_feedback');
  const typedArgs = NativeSerializer.nativeToTypedValues(
    [Buffer.from(jobId), BigInt(agentNonce), new BigUIntValue(BigInt(rating))],
    endpoint,
  );

  const tx = await factory.createTransactionForExecute(senderAddr, {
    contract: registry,
    function: 'submit_feedback',
    arguments: typedArgs,
    gasLimit: 10_000_000n,
  });

  tx.nonce = BigInt(account.nonce);
  const computer = new TransactionComputer();
  tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

  console.log('Broadcasting feedback tx...');
  const txHash = await provider.sendTransaction(tx);
  console.log(`Feedback Tx: ${txHash}`);
}

if (require.main === module) {
  runEmployerFlow().catch(err => {
    console.error('Hiring flow failed:', err.message);
    process.exit(1);
  });
}
