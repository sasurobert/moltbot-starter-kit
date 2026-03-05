import {Address} from '@multiversx/sdk-core';
import {CONFIG} from '../src/config';
import {createEntrypoint} from '../src/utils/entrypoint';
import {getSigner} from '../src/utils/txUtils';

async function main() {
  try {
    const signer = getSigner();
    const userAddress = signer.getAddress();
    const address = new Address(userAddress.bech32());

    const entrypoint = createEntrypoint();
    const provider = entrypoint.createNetworkProvider();
    const account = await provider.getAccount(address);

    const balanceEgld =
      BigInt(account.balance.toString()) / 1_000_000_000_000_000_000n;

    console.log(`\n🔍 Checking Balance for: ${address.toBech32()}`);
    console.log(`🌍 Network: ${CONFIG.API_URL}`);
    console.log(`💰 Balance: ${balanceEgld.toString()} EGLD`);
    console.log(`🔢 Nonce: ${account.nonce}`);
  } catch (error) {
    console.error('Error checking balance:', (error as Error).message);
  }
}

void main();
