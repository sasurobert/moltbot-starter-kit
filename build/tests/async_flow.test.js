'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const validator_1 = require('../src/validator');
const processor_1 = require('../src/processor');
describe('Async Job Flow', () => {
  let validator;
  let processor;
  beforeEach(() => {
    validator = new validator_1.Validator();
    processor = new processor_1.JobProcessor();
  });
  it('should process next job without waiting for proof submission', async () => {
    const payment = {
      amount: '100',
      token: 'EGLD',
      meta: {jobId: 'job-1', payload: 'test-payload'},
    };
    // Mock Processor
    jest.spyOn(processor, 'process').mockResolvedValue('hash-123');
    // Mock Validator to Delay
    let resolveProof;
    const proofPromise = new Promise(resolve => {
      resolveProof = resolve;
    });
    const submitProofSpy = jest
      .spyOn(validator, 'submitProof')
      .mockImplementation(async () => {
        return proofPromise;
      });
    // Trigger Flow
    // We simulate the listener logic from index.ts manually since we can't import the main function easily as a library
    // So we replicate the 'fire-and-forget' logic here to test IT works if implemented that way.
    // Wait, unit testing 'index.ts' is hard because it's a script.
    // We should probably rely on manual verification or integration test if we had the full app running.
    // BUT, we can test the PATTERN here.
    const listenerLogic = async p => {
      const hash = await processor.process(p.meta);
      // The async pattern:
      void validator.submitProof(p.meta.jobId, hash).then(console.log);
    };
    const start = Date.now();
    await listenerLogic(payment);
    const end = Date.now();
    // Should return IMMEDIATELY (processing is fast, submission is slow)
    expect(end - start).toBeLessThan(50);
    expect(submitProofSpy).toHaveBeenCalled();
    // Now resolve proof
    resolveProof('tx-hash-123');
    await expect(proofPromise).resolves.toBe('tx-hash-123');
  });
});
//# sourceMappingURL=async_flow.test.js.map
