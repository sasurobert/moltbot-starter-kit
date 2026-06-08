import {UserSigner} from '@multiversx/sdk-wallet';
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
  TokenTransfer,
  Token,
  U32Type,
  U32Value,
  BigUIntType,
  BigUIntValue,
  TokenIdentifierType,
  TokenIdentifierValue,
  U64Type,
  U64Value,
} from '@multiversx/sdk-core';
import {
  ApiNetworkProvider,
  ProxyNetworkProvider,
} from '@multiversx/sdk-network-providers';
import {promises as fs} from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {CONFIG} from '../src/config';
import {createPatchedAbi} from '../src/utils/abi';
import * as identityAbiJson from '../src/abis/identity-registry.abi.json';

dotenv.config();

const txComputer = new TransactionComputer();

async function main() {
  console.log('🚀 Starting Manifest Update...');

  const providerUrl = process.env.MULTIVERSX_API_URL || CONFIG.API_URL;
  const isLocal =
    providerUrl.includes('localhost') || providerUrl.includes('127.0.0.1');
  const provider = isLocal
    ? new ProxyNetworkProvider(providerUrl)
    : new ApiNetworkProvider(providerUrl);

  console.log(
    `Using Provider: ${isLocal ? 'ProxyNetworkProvider' : 'ApiNetworkProvider'} (${providerUrl})`,
  );

  const pemPath =
    process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
  let pemContent = '';
  try {
    pemContent = await fs.readFile(pemPath, 'utf8');
  } catch {
    console.error('❌ Wallet not found at wallet.pem. Run setup.sh first.');
    process.exit(1);
  }

  const signer = UserSigner.fromPem(pemContent);
  const senderAddress = new Address(signer.getAddress().bech32());

  const configPath = path.resolve('agent.config.json');
  const config: {
    agentName: string;
    nonce: number;
    manifestUri: string;
    metadata: Array<{key: string; value: string}>;
    services: Array<{
      service_id: number;
      price: string;
      token: string;
      nonce: number;
    }>;
  } = JSON.parse(await fs.readFile(configPath, 'utf8'));

  console.log(`Updating Agent: ${config.agentName}`);

  const registryAddress =
    process.env.IDENTITY_REGISTRY_ADDRESS || CONFIG.ADDRESSES.IDENTITY_REGISTRY;
  if (!registryAddress) {
    console.error('❌ IDENTITY_REGISTRY_ADDRESS not set');
    process.exit(1);
  }

  if (!config.nonce || config.nonce === 0) {
    console.error(
      '❌ Agent nonce not found in agent.config.json. Add it first.',
    );
    process.exit(1);
  }

  const account = await provider.getAccount({
    bech32: () => senderAddress.toBech32(),
  });

  const abi = createPatchedAbi(identityAbiJson);

  const factoryConfig = new TransactionsFactoryConfig({
    chainID: process.env.MULTIVERSX_CHAIN_ID || CONFIG.CHAIN_ID,
  });
  const factory = new SmartContractTransactionsFactory({
    config: factoryConfig,
    abi,
  });

  // ABI: update_agent(new_name, new_uri, new_public_key, metadata?, services?)
  const newUri =
    config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
  const publicKeyHex = senderAddress.toHex();

  const metadataType = new StructType('MetadataEntry', [
    new FieldDefinition('key', '', new BytesType()),
    new FieldDefinition('value', '', new BytesType()),
  ]);

  const metadataTyped = (config.metadata || []).map(
    m =>
      new Struct(metadataType, [
        new Field(new BytesValue(Buffer.from(m.key)), 'key'),
        new Field(
          new BytesValue(
            m.value.startsWith('0x')
              ? Buffer.from(m.value.substring(2), 'hex')
              : Buffer.from(m.value),
          ),
          'value',
        ),
      ]),
  );

  console.log(`Agent Nonce: ${config.nonce}`);
  console.log(`New Name: ${config.agentName}`);
  console.log(`New URI: ${newUri}`);
  console.log(`Public Key: ${publicKeyHex.substring(0, 16)}...`);
  if (config.metadata?.length > 0)
    console.log(`Metadata: ${config.metadata.length} entries`);

  // The registry's nft-token-id is needed for the MultiESDTNFTTransfer that
  // carries the agent's nonce when calling update_agent.
  let tokenId = '';
  try {
    const queryResponse = await provider.queryContract({
      address: {bech32: () => registryAddress},
      func: 'get_agent_token_id',
      getEncodedArguments: () => [],
    });
    tokenId = Buffer.from(queryResponse.getReturnDataParts()[0]).toString(
      'utf8',
    );
    console.log(`Agent Token ID: ${tokenId}`);
  } catch (e) {
    console.error('❌ Failed to query agent token ID:', (e as Error).message);
    process.exit(1);
  }

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
    Buffer.from(newUri),
    Buffer.from(publicKeyHex, 'hex'),
    VariadicValue.fromItemsCounted(...metadataTyped),
    VariadicValue.fromItemsCounted(...servicesTyped),
  ];

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: new Address(registryAddress),
    function: 'update_agent',
    arguments: scArgs,
    gasLimit: BigInt(CONFIG.GAS_LIMITS.REGISTER),
    tokenTransfers: [
      new TokenTransfer({
        token: new Token({identifier: tokenId, nonce: BigInt(config.nonce)}),
        amount: 1n,
      }),
    ],
  });

  tx.nonce = BigInt(account.nonce);

  const serialized = txComputer.computeBytesForSigning(tx);
  const signature = await signer.sign(serialized);
  tx.signature = signature;

  console.log('Transaction Signed. Broadcasting...');

  try {
    const txHash = await provider.sendTransaction(tx);
    console.log(`✅ Update Transaction Sent: ${txHash}`);
    console.log(
      `Check Explorer: ${CONFIG.EXPLORER_URL}/transactions/${txHash}`,
    );
  } catch (e: unknown) {
    console.error('Failed to broadcast update:', (e as Error).message);
  }
}

main().catch(console.error);
