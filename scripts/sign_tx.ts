import {
  Transaction,
  Address,
  TransactionComputer,
  TransferTransactionsFactory,
  TokenTransfer,
  Token,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core';
import {UserSigner, UserSecretKey} from '@multiversx/sdk-wallet';

const args = process.argv.slice(2);
const getArg = (key: string) => {
  const idx = args.indexOf(key);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
};

async function main() {
  try {
    const senderPk = getArg('--sender-pk');
    const receiver = getArg('--receiver');
    const value = getArg('--value') || '0';
    const nonce = getArg('--nonce') || '0';
    const gasLimit = getArg('--gas-limit') || '50000';
    const gasPrice = getArg('--gas-price') || '1000000000';
    const chainId = getArg('--chain-id');
    const token = getArg('--token');
    const amount = getArg('--amount');
    const data = getArg('--data');
    const relayer = getArg('--relayer');
    const version = getArg('--version') ? parseInt(getArg('--version')!) : 1;
    const validAfter = getArg('--valid-after')
      ? parseInt(getArg('--valid-after')!)
      : undefined;
    const validBefore = getArg('--valid-before')
      ? parseInt(getArg('--valid-before')!)
      : undefined;

    if (!senderPk || !receiver || !chainId) {
      console.error('Missing required arguments');
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
      const factory = new TransferTransactionsFactory({
        config: new TransactionsFactoryConfig({chainID: chainId}),
      });

      const tokenTransfer = new TokenTransfer({
        token: new Token({identifier: token}),
        amount: BigInt(amount),
      });

      tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
        receiver: receiverAddress,
        tokenTransfers: [tokenTransfer],
      });

      // Override factory defaults with caller-supplied values.
      tx.nonce = BigInt(nonce);
      tx.gasLimit = BigInt(gasLimit);
      tx.gasPrice = BigInt(gasPrice);
      if (relayer) {
        tx.relayer = new Address(relayer);
        tx.version = 2;
      }
    } else {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plain: Record<string, any> = {...tx.toPlainObject()};

    // Empty string satisfies the Facilitator's Zod `data: z.string()`.
    if (plain.data === null || plain.data === undefined) {
      plain.data = '';
    }

    // The Facilitator's Zod schema declares nonce/gasLimit/gasPrice/version/options
    // as `z.number()`, but sdk-core leaves them as BigInts. Coerce here so the
    // POST body validates on the facilitator side.
    if (typeof plain.nonce === 'bigint') plain.nonce = Number(plain.nonce);
    if (typeof plain.gasLimit === 'bigint')
      plain.gasLimit = Number(plain.gasLimit);
    if (typeof plain.gasPrice === 'bigint')
      plain.gasPrice = Number(plain.gasPrice);
    if (typeof plain.version === 'bigint')
      plain.version = Number(plain.version);
    if (typeof plain.options === 'bigint') {
      plain.options = Number(plain.options);
    } else if (plain.options === undefined || plain.options === null) {
      plain.options = 0;
    }

    // validAfter / validBefore are application-level (facilitator-specific),
    // not part of the SDK Transaction model, so they're attached here.
    if (validAfter !== undefined) plain.validAfter = validAfter;
    if (validBefore !== undefined) plain.validBefore = validBefore;

    const jsonOutput = JSON.stringify(plain, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
    console.log(jsonOutput);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void main();
