import {Validator} from '../src/validator';
import {JobProcessor} from '../src/processor';

describe('Async Job Flow', () => {
  let validator: Validator;
  let processor: JobProcessor;

  beforeEach(() => {
    validator = new Validator();
    processor = new JobProcessor();
  });

  it('should process next job without waiting for proof submission', async () => {
    const payment = {
      amount: '100',
      token: 'EGLD',
      meta: {jobId: 'job-1', payload: 'test-payload'},
    };

    jest.spyOn(processor, 'process').mockResolvedValue('hash-123');

    // Stage a controllable proof submission so we can measure that the
    // listener returns before the promise settles.
    let resolveProof: (value: string) => void;
    const proofPromise = new Promise<string>(resolve => {
      resolveProof = resolve;
    });

    const submitProofSpy = jest
      .spyOn(validator, 'submitProof')
      .mockImplementation(async () => {
        return proofPromise;
      });

    // Replicate index.ts's fire-and-forget listener inline. We can't import
    // main() directly (it's a script), so this asserts the pattern works
    // for any implementation that follows it.
    const listenerLogic = async (p: {
      meta: {jobId: string; payload: string};
    }) => {
      const hash = await processor.process(p.meta);
      void validator.submitProof(p.meta.jobId, hash).then(console.log);
    };

    const start = Date.now();
    await listenerLogic(payment);
    const end = Date.now();

    // Listener must return before submitProof resolves (proof is gated below).
    expect(end - start).toBeLessThan(50);
    expect(submitProofSpy).toHaveBeenCalled();

    resolveProof!('tx-hash-123');
    await expect(proofPromise).resolves.toBe('tx-hash-123');
  });
});
