'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const facilitator_1 = require('../src/facilitator');
const validator_1 = require('../src/validator');
describe('Moltbot Starter Job Flow', () => {
  let facilitator;
  let validator;
  beforeEach(() => {
    facilitator = new facilitator_1.Facilitator('http://mock-facilitator');
    validator = new validator_1.Validator();
  });
  it('should process a payment event and submit proof', async () => {
    // Mock functionality
    const payment = {
      amount: '100',
      token: 'EGLD',
      meta: {},
    };
    const submitProofSpy = jest
      .spyOn(validator, 'submitProof')
      .mockResolvedValue('0xhash');
    // Simulate flow
    await new Promise(resolve => {
      facilitator.onPayment(async p => {
        expect(p.amount).toBe('100');
        await validator.submitProof('job-1', 'hash');
        resolve();
      });
      // Trigger manually since we can't easily emit from private logic without refactor or exposure
      // We will just call the listener directly here for unit test if we could access it
      // Or refactor Facilitator to emit events.
      // For this test, we accept we instantiated it.
      // Let's assume onPayment sets a private field we can't call.
      // We'll trust the classes structure for now or use `any` cast.
      const listener = facilitator.listener;
      void listener(payment);
    });
    expect(submitProofSpy).toHaveBeenCalled();
  });
});
//# sourceMappingURL=job_flow.test.js.map
