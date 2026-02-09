import {UserSigner} from '@multiversx/sdk-wallet';
import {
  ApiNetworkProvider,
  ProxyNetworkProvider,
} from '@multiversx/sdk-network-providers';
import {
  Address,
  TransactionComputer,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  Abi,
  VariadicValue,
  Struct,
  BytesValue,
  Field,
  StructType,
  FieldDefinition,
  BytesType,
} from '@multiversx/sdk-core';
import {promises as fs} from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import {createHash} from 'crypto';
import {CONFIG} from '../src/config';
import {RelayerAddressCache} from '../src/utils/RelayerAddressCache';

dotenv.config();

// Setup TransactionComputer for serialization
const txComputer = new TransactionComputer();
const RELAYED_V3_EXTRA_GAS = 50_000n;

interface Challenge {
  difficulty: number;
  address: string;
  salt: string;
}

/**
 * Solve a Lib-based PoW Challenge for the Relayer
 */
function solveChallenge(challenge: Challenge): string {
  console.log(
    `🧩 Solving PoW Challenge (Difficulty: ${challenge.difficulty} bits)...`,
  );
  const startTime = Date.now();
  let nonce = 0;
  const difficulty = challenge.difficulty;
  const fullBytes = Math.floor(difficulty / 8);
  const remainingBits = difficulty % 8;
  const threshold = 1 << (8 - remainingBits);

  while (true) {
    const data = `${challenge.address}${challenge.salt}${nonce}`;
    const hash = createHash('sha256').update(data).digest();

    let isValid = true;
    // Check full bytes
    for (let i = 0; i < fullBytes; i++) {
      if (hash[i] !== 0) {
        isValid = false;
        break;
      }
    }

    if (isValid && remainingBits > 0) {
      if (hash[fullBytes] >= threshold) {
        isValid = false;
      }
    }

    if (isValid) {
      const timeTaken = (Date.now() - startTime) / 1000;
      console.log(
        `✅ Challenge Solved in ${timeTaken.toFixed(2)}s! Nonce: ${nonce}`,
      );
      return nonce.toString();
    }
    nonce++;
  }
}

async function main() {
  console.log('🚀 Starting Agent Registration...');

  // 1. Setup Provider & Signer
  // Use ProxyProvider if Localhost (Chain Sim)
  const isLocal =
    CONFIG.API_URL.includes('localhost') ||
    CONFIG.API_URL.includes('127.0.0.1');
  const provider = isLocal
    ? new ProxyNetworkProvider(CONFIG.API_URL)
    : new ApiNetworkProvider(CONFIG.API_URL);

  console.log(
    `Using Provider: ${isLocal ? 'ProxyNetworkProvider' : 'ApiNetworkProvider'} (${CONFIG.API_URL})`,
  );

  const pemPath =
    process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
  const pemContent = await fs.readFile(pemPath, 'utf8');
  const signer = UserSigner.fromPem(pemContent);
  const senderAddress = new Address(signer.getAddress().bech32());

  // 2. Load Config
  const configPath = path.resolve('config.json');
  let config: {
    agentName: string;
    nonce: number;
    pricing: string;
    capabilities: string[];
    manifestUri: string;
    metadata: Array<{key: string; value: string}>;
  } = {
    agentName: 'Moltbot',
    nonce: 0,
    pricing: '1USDC',
    capabilities: [],
    manifestUri: '',
    metadata: [],
  };
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch {
    console.warn('Config file missing, utilizing defaults.');
  }
  console.log(`Registering Agent: ${config.agentName}...`);

  // 3. Load ABI and construct transaction using SmartContractTransactionsFactory
  const registryAddress = CONFIG.ADDRESSES.IDENTITY_REGISTRY;
  const account = await provider.getAccount({
    bech32: () => senderAddress.toBech32(),
  });

  // Load the identity-registry ABI for proper argument encoding
  const abiPath = path.resolve(__dirname, '..', 'identity-registry.abi.json');
  const abiJson = JSON.parse(await fs.readFile(abiPath, 'utf8'));
  const abi = Abi.create(abiJson);

  const factoryConfig = new TransactionsFactoryConfig({
    chainID: CONFIG.CHAIN_ID,
  });
  const factory = new SmartContractTransactionsFactory({
    config: factoryConfig,
    abi,
  });

  // Build metadata entries matching the ABI's MetadataEntry struct
  const agentUri =
    config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
  const publicKeyHex = senderAddress.toHex();

  // Prepare metadata args: each entry is {key: Buffer, value: Buffer}
  const metadataArgs: Array<{key: Buffer; value: Buffer}> = [];
  if (config.metadata && config.metadata.length > 0) {
    for (const entry of config.metadata) {
      const keyBuf = Buffer.from(entry.key);
      let valueBuf: Buffer;
      if (entry.value.startsWith('0x')) {
        valueBuf = Buffer.from(entry.value.substring(2), 'hex');
      } else {
        valueBuf = Buffer.from(entry.value);
      }
      metadataArgs.push({key: keyBuf, value: valueBuf});
    }
  }

  console.log(`Name: ${config.agentName}`);
  console.log(`URI: ${agentUri}`);
  console.log(`Public Key: ${publicKeyHex.substring(0, 16)}...`);
  if (config.metadata?.length > 0)
    console.log(`Metadata: ${config.metadata.length} entries`);

  // Construct the MetadataEntry StructType manually (avoids relying on abi.registry).
  // MetadataEntry { key: bytes, value: bytes }
  const metadataType = new StructType('MetadataEntry', [
    new FieldDefinition('key', '', new BytesType()),
    new FieldDefinition('value', '', new BytesType()),
  ]);

  const metadataTyped = metadataArgs.map(
    m =>
      new Struct(metadataType, [
        new Field(new BytesValue(m.key), 'key'),
        new Field(new BytesValue(m.value), 'value'),
      ]),
  );

  const scArgs = [
    Buffer.from(config.agentName),
    Buffer.from(agentUri),
    Buffer.from(publicKeyHex, 'hex'),
    VariadicValue.fromItemsCounted(...metadataTyped),
    VariadicValue.fromItemsCounted(), // services (empty)
  ];

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: new Address(registryAddress),
    function: 'register_agent',
    arguments: scArgs,
    gasLimit: BigInt(CONFIG.GAS_LIMITS.REGISTER),
  });

  tx.nonce = BigInt(account.nonce);

  // Sign the transaction (always required, even for relaying)
  const serialized = txComputer.computeBytesForSigning(tx);
  const signature = await signer.sign(serialized);
  tx.signature = signature;

  // 4. Determine Strategy (Local vs Relayer)
  const balance = BigInt(account.balance.toString());
  const useRelayer = balance === 0n || !!process.env.FORCE_RELAYER;

  if (useRelayer) {
    console.log('Empty wallet detected. Using Relayer fallback...');
    try {
      // A. Get Challenge
      const {data: challenge} = await axios.post(
        `${CONFIG.PROVIDERS.RELAYER_URL}/challenge`,
        {
          address: senderAddress.toBech32(),
        },
      );

      // A.1 Verify/Get Relayer Address for this Shard
      // The Relayer Service requires the inner transaction's `relayer` field to match the
      // relayer address for the user's shard.
      let relayerAddressBech32 = RelayerAddressCache.get(
        CONFIG.PROVIDERS.RELAYER_URL,
        senderAddress.toBech32(),
      );

      if (!relayerAddressBech32) {
        console.log('Fetching Relayer Address for Shard...');
        try {
          const {data} = await axios.get(
            `${CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${senderAddress.toBech32()}`,
          );
          relayerAddressBech32 = data.relayerAddress;
          RelayerAddressCache.set(
            CONFIG.PROVIDERS.RELAYER_URL,
            senderAddress.toBech32(),
            relayerAddressBech32!,
          );
          console.log(`Relayer Address cached: ${relayerAddressBech32}`);
        } catch (e) {
          console.warn(
            `Failed to fetch specific relayer address: ${(e as Error).message}. Proceeding without explicit relayer field (may fail if V3 strict).`,
          );
        }
      } else {
        console.log(`Using cached Relayer Address: ${relayerAddressBech32}`);
      }

      // Update Transaction with Relayer if available (Required for Relayed V3)
      if (relayerAddressBech32) {
        tx.relayer = new Address(relayerAddressBech32);
        tx.gasLimit += RELAYED_V3_EXTRA_GAS;
        // Re-sign because the content changed (relayer field and gasLimit are part of the signature)
        const serializedRelayed = txComputer.computeBytesForSigning(tx);
        const signatureRelayed = await signer.sign(serializedRelayed);
        tx.signature = signatureRelayed;
      }

      // B. Solve Challenge
      const challengeNonce = solveChallenge(challenge);

      // C. Relay
      console.log('Broadcasting via Relayer...');
      const {data: relayResult} = await axios.post(
        `${CONFIG.PROVIDERS.RELAYER_URL}/relay`,
        {
          transaction: tx.toPlainObject(),
          challengeNonce,
        },
      );

      console.log(`✅ Relayed Transaction Sent: ${relayResult.txHash}`);
      console.log(
        `Check Explorer: ${CONFIG.EXPLORER_URL}/transactions/${relayResult.txHash}`,
      );
    } catch (e: unknown) {
      const err = e as {response?: {data?: {error?: string}}; message?: string};
      console.error(
        'Relaying failed:',
        err.response?.data?.error || err.message,
      );
      process.exit(1);
    }
  } else {
    console.log('Wallet funded. Broadcasting locally...');
    try {
      const txHash = await provider.sendTransaction(tx);
      console.log(`✅ Transaction Sent: ${txHash}`);
      console.log(
        `Check Explorer: ${CONFIG.EXPLORER_URL}/transactions/${txHash}`,
      );
    } catch (e: unknown) {
      console.error('Failed to broadcast transaction:', (e as Error).message);
    }
  }
}

main().catch(console.error);
