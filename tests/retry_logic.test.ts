
import { JobHandler } from "../src/job_handler";
import { Validator } from "../src/validator";
import { JobProcessor } from "../src/processor";
import { CONFIG } from "../src/config";

// Mock Timer to speed up tests
jest.useFakeTimers();

describe("JobHandler Retry Logic", () => {
    let validator: Validator;
    let processor: JobProcessor;
    let handler: JobHandler;

    beforeEach(() => {
        validator = new Validator();
        processor = new JobProcessor();
        handler = new JobHandler(validator, processor);

        // Reset Config if needed or ensure mocking handles it
        // We will mock implementation details
    });

    it("should retry proof submission if transaction status is not success", async () => {
        const payment = { amount: "10", token: "EGLD", meta: { jobId: "job-retry", payload: "data" } };

        jest.spyOn(processor, 'process').mockResolvedValue("hash123");

        const submitSpy = jest.spyOn(validator, 'submitProof')
            .mockResolvedValueOnce("txHash1")
            .mockResolvedValueOnce("txHash2"); // Retry call

        const statusSpy = jest.spyOn(validator, 'getTxStatus')
            .mockResolvedValueOnce("pending") // Fail 1st check
            .mockResolvedValueOnce("success"); // Pass 2nd check

        // Run handler (async)
        const handlerPromise = handler.handle("job-retry", payment);

        // Fast-forward 10s delay (Submission Delay)
        // 1. Process -> Submit (Attempt 1) -> Delay
        await jest.runAllTimersAsync();

        // 2. Check Status (Pending) -> Retry -> Submit (Attempt 2) -> Delay
        await jest.runAllTimersAsync();

        // 3. Check Status (Success) -> Done
        await handlerPromise;

        expect(submitSpy).toHaveBeenCalledTimes(2);
        expect(statusSpy).toHaveBeenCalledTimes(2);
        expect(statusSpy).toHaveBeenCalledWith("txHash1");
        expect(statusSpy).toHaveBeenCalledWith("txHash2");
    });

    it("should retry processing if it fails", async () => {
        const payment = { amount: "10", token: "EGLD", meta: { jobId: "job-process-retry", payload: "data" } };

        jest.spyOn(validator, 'submitProof').mockResolvedValue("txHash");
        jest.spyOn(validator, 'getTxStatus').mockResolvedValue("success");

        const processSpy = jest.spyOn(processor, 'process')
            .mockRejectedValueOnce(new Error("Network Error"))
            .mockResolvedValue("hash123");

        const handlerPromise = handler.handle("job-process-retry", payment);

        // Fast-forward processing retry delay (2s)
        await jest.runAllTimersAsync();

        // Fast-forward submission delay
        await jest.runAllTimersAsync();

        await handlerPromise;

        expect(processSpy).toHaveBeenCalledTimes(2);
    });
});
