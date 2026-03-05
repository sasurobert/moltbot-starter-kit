"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_core_1 = require("@multiversx/sdk-core");
const config_1 = require("../src/config");
const entrypoint_1 = require("../src/utils/entrypoint");
const txUtils_1 = require("../src/utils/txUtils");
async function main() {
    try {
        const signer = (0, txUtils_1.getSigner)();
        const address = new sdk_core_1.Address(signer.getAddress().bech32());
        const entrypoint = (0, entrypoint_1.createEntrypoint)();
        const provider = entrypoint.createNetworkProvider();
        const account = await provider.getAccount(address);
        const balanceEgld = BigInt(account.balance.toString()) / 1000000000000000000n;
        console.log(`\n🔍 Checking Balance for: ${address.toBech32()}`);
        console.log(`🌍 Network: ${config_1.CONFIG.API_URL}`);
        console.log(`💰 Balance: ${balanceEgld.toString()} EGLD`);
        console.log(`🔢 Nonce: ${account.nonce}`);
    }
    catch (error) {
        console.error('Error checking balance:', error.message);
    }
}
void main();
//# sourceMappingURL=check_balance.js.map