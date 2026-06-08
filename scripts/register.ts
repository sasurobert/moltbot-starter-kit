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
  VariadicValue,
  Struct,
  BytesValue,
  Field,
  StructType,
  FieldDefinition,
  BytesType,
  U32Type,
  U32Value,
  BigUIntType,
  BigUIntValue,
  TokenIdentifierType,
  TokenIdentifierValue,
  U64Type,
  U64Value,
} from '@multiversx/sdk-core';
import {promises as fs} from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import {CONFIG} from '../src/config';
import {RelayerAddressCache} from '../src/utils/RelayerAddressCache';
import {createPatchedAbi} from '../src/utils/abi';
import * as identityAbiJson from '../src/abis/identity-registry.abi.json';
import {PoWSolver} from '../src/pow';

dotenv.config();

const txComputer = new TransactionComputer();
const RELAYED_V3_EXTRA_GAS = 50_000n;

async function main() {
  console.log('🚀 Starting Agent Registration...');

  // Localhost = Chain Simulator, which only exposes the Proxy interface.
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

  const configPath = path.resolve('agent.config.json');
  let config: {
    agentName: string;
    manifestUri: string;
    metadata: Array<{key: string; value: string}>;
    services: Array<{
      service_id: number;
      price: string;
      token: string;
      nonce: number;
    }>;
  } = {
    agentName: 'Moltbot',
    manifestUri: '',
    metadata: [],
    services: [],
  };
  try {
    config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  } catch {
    console.warn(
      'agent.config.json not found, using defaults. See agent.config.example.json.',
    );
  }
  console.log(`Registering Agent: ${config.agentName}...`);

  const registryAddress = CONFIG.ADDRESSES.IDENTITY_REGISTRY;
  const account = await provider.getAccount({
    bech32: () => senderAddress.toBech32(),
  });

  const abi = createPatchedAbi(identityAbiJson);

  const factoryConfig = new TransactionsFactoryConfig({
    chainID: CONFIG.CHAIN_ID,
  });
  const factory = new SmartContractTransactionsFactory({
    config: factoryConfig,
    abi,
  });

  const agentUri =
    config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
  const publicKeyHex = senderAddress.toHex();

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

  // Manual StructType construction avoids relying on `abi.registry` (which
  // sdk-core v15 doesn't expose publicly) for argument encoding.
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

  const serviceConfigType = new StructType('ServiceConfigInput', [
    new FieldDefinition('service_id', '', new U32Type()),
    new FieldDefinition('price', '', new BigUIntType()),
    new FieldDefinition('token', '', new TokenIdentifierType()),
    new FieldDefinition('nonce', '', new U64Type()),
  ]);

  const servicesTyped = (config.services || []).map(
    s =>
      new Struct(serviceConfigType, [
        new Field(new U32Value(s.service_id), 'service_id'),
        new Field(new BigUIntValue(s.price), 'price'),
        new Field(new TokenIdentifierValue(s.token), 'token'),
        new Field(new U64Value(s.nonce), 'nonce'),
      ]),
  );

  const scArgs = [
    Buffer.from(config.agentName),
    Buffer.from(agentUri),
    Buffer.from(publicKeyHex, 'hex'),
    VariadicValue.fromItemsCounted(...metadataTyped),
    VariadicValue.fromItemsCounted(...servicesTyped),
  ];

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: new Address(registryAddress),
    function: 'register_agent',
    arguments: scArgs,
    gasLimit: BigInt(CONFIG.GAS_LIMITS.REGISTER),
  });

  tx.nonce = BigInt(account.nonce);

  // Inner-tx signature is required even when relaying — the relayer wraps but
  // doesn't replace this signature.
  const serialized = txComputer.computeBytesForSigning(tx);
  const signature = await signer.sign(serialized);
  tx.signature = signature;

  const balance = BigInt(account.balance.toString());
  const useRelayer = balance === 0n || !!process.env.FORCE_RELAYER;

  if (useRelayer) {
    console.log('Empty wallet detected. Using Relayer fallback...');
    try {
      const {data: challenge} = await axios.post(
        `${CONFIG.PROVIDERS.RELAYER_URL}/challenge`,
        {
          address: senderAddress.toBech32(),
        },
      );

      // Relayed V3 requires the inner tx's `relayer` field to match the
      // relayer assigned to the sender's shard, so look it up (cached).
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

      if (relayerAddressBech32) {
        tx.relayer = new Address(relayerAddressBech32);
        tx.gasLimit += RELAYED_V3_EXTRA_GAS;
        // The relayer field and gasLimit are inside the signed payload, so
        // we must re-sign after mutating them.
        const serializedRelayed = txComputer.computeBytesForSigning(tx);
        const signatureRelayed = await signer.sign(serializedRelayed);
        tx.signature = signatureRelayed;
      }

      const challengeNonce = new PoWSolver().solve(challenge);

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
