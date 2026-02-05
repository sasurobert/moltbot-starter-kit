"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_core_1 = require("@multiversx/sdk-core");
const config_1 = require("./config");
const facilitator_1 = require("./facilitator");
const fs = require("fs");
async function runEmployerFlow() {
    console.log('--- Starting Employer Hiring Flow ---');
    if (!config_1.CONFIG.EMPLOYER.PEM_PATH || !config_1.CONFIG.EMPLOYER.ADDRESS) {
        console.error('Employer PEM_PATH or ADDRESS not configured in .env');
        process.exit(1);
    }
    const facilitator = new facilitator_1.Facilitator();
    const pemContent = fs.readFileSync(config_1.CONFIG.EMPLOYER.PEM_PATH).toString();
    const signer = sdk_core_1.UserSigner.fromPem(pemContent);
    const employerAddr = config_1.CONFIG.EMPLOYER.ADDRESS;
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
        receiver: preparation.receiver,
    });
    // 2. Sign the Architected Transaction
    // We need to create a Transaction object with the data from preparation
    // To get the correct nonce for the employer, we could query the network,
    // but for X402 off-chain preparation, we might use a mock nonce if the Facilitator handles it,
    // however, our Facilitator's Settler uses the nonce from the payload.
    // NOTE: In a real app, you'd fetch the current nonce of the employer from the network.
    const tx = new sdk_core_1.Transaction({
        nonce: 0n, // Placeholder - should be fetched from network
        value: BigInt(preparation.amount),
        receiver: sdk_core_1.Address.newFromBech32(preparation.registryAddress),
        sender: sdk_core_1.Address.newFromBech32(employerAddr),
        gasPrice: 1000000000n,
        gasLimit: 30000000n,
        data: Buffer.from(preparation.data),
        chainID: config_1.CONFIG.CHAIN_ID,
    });
    const computer = new sdk_core_1.TransactionComputer();
    const bytesToSign = computer.computeBytesForSigning(tx);
    const signature = await signer.sign(bytesToSign);
    // 3. Settle Job (Execution Phase)
    console.log('Settling job via Facilitator...');
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
//# sourceMappingURL=hiring.js.map