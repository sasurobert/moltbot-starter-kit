/* eslint-disable @typescript-eslint/no-explicit-any */
import {JobHandler} from '../src/job_handler';
import {Validator} from '../src/validator';
import {JobProcessor} from '../src/processor';

jest.useFakeTimers();

describe('JobHandler edge cases', () => {
  let validator: Validator;
  let processor: JobProcessor;
  let handler: JobHandler;
  const payment = {amount: '1', token: 'EGLD', meta: {payload: 'data'}};

  beforeEach(() => {
    validator = new Validator();
    processor = new JobProcessor();
    handler = new JobHandler(validator, processor);
  });

  it('logs and exits when processing exceeds max retries', async () => {
    const processSpy = jest
      .spyOn(processor, 'process')
      .mockRejectedValue(new Error('boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const run = handler.handle('job-fail', payment as any);
    await jest.runAllTimersAsync();
    await run;

    expect(processSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('stops with submission max-attempts overflow', async () => {
    jest.spyOn(processor, 'process').mockResolvedValue('hash-ok');
    jest
      .spyOn(validator, 'submitProof')
      .mockRejectedValue(new Error('broadcast'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const run = handler.handle('job-submit-fail', payment as any);
    await jest.runAllTimersAsync();
    await run;

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
