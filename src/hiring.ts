import { Address, Transaction, TransactionComputer, UserSigner } from '@multiversx/sdk-core';
import { UserPayer } from '@multiversx/sdk-wallet';
import { CONFIG } from './config';
import { Facilitator } from './facilitator';
import fs from 'fs';
import path from 'path';

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

    console.log(`Preparing job for Agent ${agentNonce}, service: ${serviceId}...`);
    const preparation = await facilitator.prepare({
        agentNonce,
        serviceId,
        employerAddress: employerAddr,
    });

    console.log('Preparation received:', {
        jobId: preparation.jobId,
        amount: preparation.amount,
        receiver: preparation.receiver
    });

    // 2. Sign the Architected Transaction
    // We need to create a Transaction object with the data from preparation
    // To get the correct nonce for the employer, we could query the network, 
    // but for X402 off-chain preparation, we might use a mock nonce if the Facilitator handles it, 
    // however, our Facilitator's Settler uses the nonce from the payload.

    // NOTE: In a real app, you'd fetch the current nonce of the employer from the network.
    const tx = new Transaction({
        nonce: 0n, // Placeholder - should be fetched from network
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

    // 3. Settle Job (Execution Phase)
    console.log('Settling job via Facilitator...');
    const settlementPayload = {
        nonce: Number(tx.nonce),
        value: tx.value.toString(),
        receiver: tx.receiver.bech32(),
        sender: tx.sender.bech32(),
        gasPrice: Number(tx.gasPrice),
        gasLimit: Number(tx.gasLimit),
        data: preparation.data,
        chainID: tx.chainID,
        version: tx.version,
        options: tx.options,
        signature: Buffer.from(signature).toString('hex'),
    };

    const result = await facilitator.settle(settlementPayload);

    console.log('Settlement successful!', result);
    console.log(`Job Initialized: ${preparation.jobId}`);
    console.log(`Transaction Hash: ${result.txHash}`);
}

if (require.main === module) {
    runEmployerFlow().catch(err => {
        console.error('Hiring flow failed:', err.message);
        process.exit(1);
    });
}
