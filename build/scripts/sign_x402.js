"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const sdk_core_1 = require("@multiversx/sdk-core");
const fs_1 = require("fs");
// Usage: ts-node sign_x402.ts <pemPath> <receiver> <value> <nonce> <chainID> [data]
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error('Usage: sign_x402.ts <pemPath> <receiver> <value> <nonce> <chainID> [data]');
        process.exit(1);
    }
    const [pemPath, receiver, value, nonceStr, chainID, dataStr] = args;
    // 1. Load Signer
    const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const sender = signer.getAddress();
    // 2. Construct Transaction
    // NOTE: Must match Settler.ts construction EXACTLY
    const tx = new sdk_core_1.Transaction({
        nonce: BigInt(nonceStr),
        value: BigInt(value),
        receiver: new sdk_core_1.Address(receiver),
        sender: new sdk_core_1.Address(sender.bech32()),
        gasPrice: 1000000000n, // Facilitator uses default/inherited? Settler says: BigInt(payload.gasPrice)
        gasLimit: 500000n, // Standard transfer
        data: dataStr ? Buffer.from(dataStr) : undefined,
        chainID: chainID,
        version: 1, // Settler uses payload.version or 2
    });
    // 3. Sign
    const computer = new sdk_core_1.TransactionComputer();
    const serialized = computer.computeBytesForSigning(tx);
    const signature = await signer.sign(serialized);
    tx.signature = signature;
    // 4. Output Payload
    // X402Payload interface
    const payload = {
        sender: sender.bech32(),
        receiver: receiver,
        value: value,
        nonce: parseInt(nonceStr),
        data: dataStr,
        signature: signature.toString('hex'),
        chainID: chainID,
        version: 1,
        options: 0,
        gasPrice: 1000000000,
        gasLimit: 500000,
        validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };
    console.log(JSON.stringify(payload));
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=sign_x402.js.map