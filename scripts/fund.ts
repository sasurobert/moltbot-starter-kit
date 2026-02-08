import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, Address, TransactionComputer } from "@multiversx/sdk-core";
import { ProxyNetworkProvider } from "@multiversx/sdk-network-providers";
import fs from "fs";

// Usage: ts-node fund.ts <pemPath> <receiver> <value> <chainId> <proxyUrl>

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error("Usage: fund.ts <pemPath> <receiver> <value> <chainId> <proxyUrl>");
        process.exit(1);
    }

    const [pemPath, receiver, value, chainId, proxyUrl] = args;

    try {
        const pem = fs.readFileSync(pemPath, { encoding: "utf-8" });
        const signer = UserSigner.fromPem(pem);
        const sender = signer.getAddress();

        const provider = new ProxyNetworkProvider(proxyUrl);
        const account = await provider.getAccount(sender);

        console.log(`Sender: ${sender.bech32()}`);
        console.log(`Nonce: ${account.nonce}`);
        console.log(`Balance: ${account.balance.toString()}`);

        const tx = new Transaction({
            nonce: BigInt(account.nonce),
            value: BigInt(value),
            sender: new Address(sender.bech32()),
            receiver: new Address(receiver),
            gasLimit: 50000n,
            chainID: chainId,
            version: 1,
        });

        const computer = new TransactionComputer();
        const serialized = computer.computeBytesForSigning(tx);
        const signature = await signer.sign(serialized);
        tx.signature = signature;

        const hash = await provider.sendTransaction(tx);
        console.log(`Transaction submitted: ${hash}`);
    } catch (error) {
        console.error("Funding failed:", error);
        process.exit(1);
    }
}

main().catch(console.error);
