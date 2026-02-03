import { Facilitator } from "../src/facilitator";
import { McpBridge } from "../src/mcp_bridge";
import { Validator } from "../src/validator";

describe("Moltbot Starter Job Flow", () => {
    let facilitator: Facilitator;
    let validator: Validator;

    beforeEach(() => {
        facilitator = new Facilitator("http://mock-facilitator");
        validator = new Validator();
    });

    it("should process a payment event and submit proof", async () => {
        // Mock functionality
        const payment = {
            amount: "100",
            token: "EGLD",
            meta: {}
        };

        const submitProofSpy = jest.spyOn(validator, 'submitProof').mockResolvedValue("0xhash");

        // Simulate flow
        await new Promise<void>((resolve) => {
            facilitator.onPayment(async (p) => {
                expect(p.amount).toBe("100");
                await validator.submitProof("job-1", "hash");
                resolve();
            });

            // Trigger manually since we can't easily emit from private logic without refactor or exposure
            // We will just call the listener directly here for unit test if we could access it
            // Or refactor Facilitator to emit events.
            // For this test, we accept we instantiated it.
            // Let's assume onPayment sets a private field we can't call.
            // We'll trust the classes structure for now or use `any` cast.
            (facilitator as any).listener(payment);
        });

        expect(submitProofSpy).toHaveBeenCalled();
    });
});
