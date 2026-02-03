import { Validator } from "../src/validator";
import { UserSigner } from "@multiversx/sdk-wallet";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";

// Mock dependencies
jest.mock("@multiversx/sdk-wallet");
jest.mock("@multiversx/sdk-network-providers");
jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn().mockResolvedValue("PEM_CONTENT")
    }
}));

describe("Validator", () => {
    let validator: Validator;
    let mockProvider: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock UserSigner
        (UserSigner.fromPem as jest.Mock).mockReturnValue({
            getAddress: () => ({ bech32: () => "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu" }),
            sign: jest.fn().mockResolvedValue(Buffer.from("signature"))
        });

        // Mock ApiNetworkProvider instance
        mockProvider = {
            getAccount: jest.fn().mockResolvedValue({ nonce: 123 }),
            sendTransaction: jest.fn().mockResolvedValue("real_tx_hash_123")
        };
        (ApiNetworkProvider as unknown as jest.Mock).mockImplementation(() => mockProvider);

        validator = new Validator();
    });

    test("submitProof should construct and broadcast a valid transaction", async () => {
        const txHash = await validator.submitProof("job-123", "hash-456");

        expect(txHash).toBe("real_tx_hash_123");
        expect(UserSigner.fromPem).toHaveBeenCalled();
        expect(ApiNetworkProvider).toHaveBeenCalled();
        expect(mockProvider.getAccount).toHaveBeenCalled();
        expect(mockProvider.sendTransaction).toHaveBeenCalled();
    });

    test("should retry on failure and eventually succeed", async () => {
        // Mock failure first 2 times, success on 3rd
        mockProvider.sendTransaction
            .mockRejectedValueOnce(new Error("Network Error"))
            .mockRejectedValueOnce(new Error("Timeout"))
            .mockResolvedValue("real_tx_hash_retry");

        const txHash = await validator.submitProof("job-retry", "hash-retry");

        expect(txHash).toBe("real_tx_hash_retry");
        expect(mockProvider.sendTransaction).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for backoff
});
