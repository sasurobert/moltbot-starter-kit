
import {
    Transaction,
    Address,
    TransactionComputer,
    TransferTransactionsFactory,
    TokenTransfer,
    Token,
    TransactionsFactoryConfig,
} from "@multiversx/sdk-core";
import { UserSigner, UserSecretKey } from "@multiversx/sdk-wallet";

// Parse args
const args = process.argv.slice(2);
const getArg = (key: string) => {
    const idx = args.indexOf(key);
    if (idx === -1 || idx + 1 >= args.length) return null;
    return args[idx + 1];
};

async function main() {
    try {
        const senderPk = getArg("--sender-pk");
        const receiver = getArg("--receiver");
        const value = getArg("--value") || "0";
        const nonce = getArg("--nonce") || "0";
        const gasLimit = getArg("--gas-limit") || "50000";
        const gasPrice = getArg("--gas-price") || "1000000000";
        const chainId = getArg("--chain-id");
        const token = getArg("--token");
        const amount = getArg("--amount");
        const data = getArg("--data");
        const relayer = getArg("--relayer");
        const version = getArg("--version") ? parseInt(getArg("--version")!) : 1;

        if (!senderPk || !receiver || !chainId) {
            console.error("Missing required arguments");
            process.exit(1);
        }

        let secretKey: UserSecretKey;
        try {
            secretKey = UserSecretKey.fromString(senderPk);
        } catch (e) {
            console.error(`Failed to parse secret key: ${e}`);
            throw e;
        }

        const signer = new UserSigner(secretKey);
        const senderAddress = new Address(signer.getAddress().bech32());
        const receiverAddress = new Address(receiver);

        let tx: Transaction;

        if (token && amount) {
            // ESDT Transfer
            const factory = new TransferTransactionsFactory({
                config: new TransactionsFactoryConfig({ chainID: chainId }),
            });

            const tokenTransfer = new TokenTransfer({
                token: new Token({ identifier: token }),
                amount: BigInt(amount)
            });

            tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
                receiver: receiverAddress,
                tokenTransfers: [tokenTransfer],
            });

            // Manual overrides
            tx.nonce = BigInt(nonce);
            tx.gasLimit = BigInt(gasLimit);
            tx.gasPrice = BigInt(gasPrice);
            if (relayer) {
                tx.relayer = new Address(relayer);
                tx.version = 2;
            }
        } else {
            // EGLD Transfer
            tx = new Transaction({
                nonce: BigInt(nonce),
                value: BigInt(value),
                receiver: receiverAddress,
                sender: senderAddress,
                gasLimit: BigInt(gasLimit),
                gasPrice: BigInt(gasPrice),
                data: data ? Buffer.from(data) : new Uint8Array(0),
                chainID: chainId,
                version: relayer ? 2 : version,
                relayer: relayer ? new Address(relayer) : undefined,
            });
        }

        const computer = new TransactionComputer();
        const serialized = computer.computeBytesForSigning(tx);
        const signature = await signer.sign(serialized);
        tx.signature = signature;

        // Convert BigInts to strings/numbers for JSON output
        const plain: any = tx.toPlainObject();

        // Ensure data is string (empty string if null/undefined) to satisfy Zod schema
        if (plain.data === null || plain.data === undefined) {
            plain.data = "";
        }

        // Fix types for Zod schema
        // The SDK might return plain objects with BigInts, but JSON.stringify can handle them with the replacer below.
        // HOWEVER, the Facilitator (Zod) expects 'number' for some fields (nonce, version, options, gasLimit, gasPrice).
        // Since JSON.stringify + replacer turns BigInt -> String, we might have type mismatch if Zod expects Number.
        // The Zod schema says: nonce: z.number(), gasLimit: z.number(), etc.
        // So we MUST convert to Number.

        if (typeof plain.nonce === 'bigint') plain.nonce = Number(plain.nonce);
        if (typeof plain.gasLimit === 'bigint') plain.gasLimit = Number(plain.gasLimit);
        if (typeof plain.gasPrice === 'bigint') plain.gasPrice = Number(plain.gasPrice);
        if (typeof plain.version === 'bigint') plain.version = Number(plain.version);
        if (typeof plain.options === 'bigint') {
            plain.options = Number(plain.options);
        } else if (plain.options === undefined || plain.options === null) {
            plain.options = 0;
        }


        const jsonOutput = JSON.stringify(plain, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        );
        console.log(jsonOutput);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
