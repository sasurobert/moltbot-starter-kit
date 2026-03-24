"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoltbotMppSkill = void 0;
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const js_sha3_1 = require("js-sha3");
class MoltbotMppSkill {
    signer;
    policy;
    provider;
    constructor(signer, policy, networkProviderUrl) {
        this.signer = signer;
        this.policy = policy;
        this.provider = new sdk_network_providers_1.ApiNetworkProvider(networkProviderUrl);
    }
    async attemptPayment(mppChallengeUrl) {
        const url = new URL(mppChallengeUrl.replace('mpp://', 'http://'));
        const receiverStr = url.searchParams.get('recipient');
        const amountStr = url.searchParams.get('amount');
        const currency = url.searchParams.get('currency') || 'EGLD';
        const method = url.searchParams.get('method') || 'transfer';
        if (!receiverStr || !amountStr) {
            throw new Error('Invalid MPP Challenge URL');
        }
        const receiver = sdk_core_1.Address.newFromBech32(receiverStr);
        const amount = BigInt(amountStr);
        if (!this.policy.whitelistedCurrencies.includes(currency)) {
            throw new Error(`Policy violation: Currency ${currency} is not whitelisted.`);
        }
        if (amount > this.policy.maxPerTransactionNative) {
            throw new Error('Policy violation: Amount exceeds limit');
        }
        const txPayloadStr = method === 'transfer' && currency !== 'EGLD'
            ? `ESDTTransfer@${Buffer.from(currency).toString('hex')}@${amount.toString(16).padStart(16, '0')}`
            : '';
        const networkConfig = await this.provider.getNetworkConfig();
        const address = this.signer.getAddress();
        const senderAddress = sdk_core_1.Address.newFromBech32(address.bech32());
        const account = await this.provider.getAccount({
            bech32: () => address.bech32(),
        });
        const tx = new sdk_core_1.Transaction({
            nonce: BigInt(account.nonce),
            sender: senderAddress,
            receiver: receiver,
            value: currency === 'EGLD' ? amount : 0n,
            gasLimit: currency === 'EGLD' ? 50000n : 500000n,
            data: txPayloadStr ? Buffer.from(txPayloadStr) : undefined,
            chainID: networkConfig.ChainID,
        });
        const computer = new sdk_core_1.TransactionComputer();
        const serialized = computer.computeBytesForSigning(tx);
        tx.signature = await this.signer.sign(serialized);
        const txHash = await this.provider.sendTransaction(tx);
        let status = 'pending';
        while (status === 'pending') {
            await new Promise(r => setTimeout(r, 2000));
            try {
                const txInfo = await this.provider.getTransaction(txHash);
                if (txInfo.status.isSuccessful()) {
                    status = 'success';
                }
                else if (txInfo.status.isFailed() || txInfo.status.isInvalid()) {
                    throw new Error('Payment transaction failed on chain');
                }
            }
            catch {
                /* ignore fetching delays */
            }
        }
        return txHash;
    }
    /**
     * Generates a deterministic channel ID for a session.
     */
    computeChannelId(receiver, token, nonce = 0n) {
        const employer = this.signer.getAddress().bech32();
        const employerAddr = sdk_core_1.Address.newFromBech32(employer);
        const receiverAddr = sdk_core_1.Address.newFromBech32(receiver);
        const hasher = js_sha3_1.keccak256.create();
        hasher.update(employerAddr.getPublicKey());
        hasher.update(receiverAddr.getPublicKey());
        hasher.update(Buffer.from(token));
        // Nonce as 8 bytes big endian
        const nonceBuf = Buffer.alloc(8);
        nonceBuf.writeBigUInt64BE(BigInt(nonce));
        hasher.update(nonceBuf);
        return hasher.hex();
    }
    /**
     * Signs an off-chain voucher for a session.
     */
    async signVoucher(contractAddress, channelId, amount, nonce) {
        const contract = sdk_core_1.Address.newFromBech32(contractAddress);
        const hasher = js_sha3_1.keccak256.create();
        hasher.update(Buffer.from('mpp-session-v1'));
        hasher.update(contract.getPublicKey());
        hasher.update(Buffer.from(channelId, 'hex'));
        // Amount as 32 bytes big endian
        const amountBuf = Buffer.alloc(32);
        const amountHex = amount.toString(16).padStart(64, '0');
        amountBuf.write(amountHex, 'hex');
        hasher.update(amountBuf);
        // Nonce as 8 bytes big endian
        const nonceBuf = Buffer.alloc(8);
        nonceBuf.writeBigUInt64BE(BigInt(nonce));
        hasher.update(nonceBuf);
        const message = Buffer.from(hasher.hex(), 'hex');
        const signature = await this.signer.sign(message);
        return signature.toString('hex');
    }
}
exports.MoltbotMppSkill = MoltbotMppSkill;
//# sourceMappingURL=mpp_skills.js.map