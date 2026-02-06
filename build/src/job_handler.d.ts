import {Validator} from './validator';
import {JobProcessor} from './processor';
import {PaymentEvent} from './facilitator';
export declare class JobHandler {
  private validator;
  private processor;
  constructor(validator: Validator, processor: JobProcessor);
  handle(jobId: string, payment: PaymentEvent): Promise<void>;
  private processWithRetry;
  private submitWithRetry;
  private monitorTransaction;
  private delay;
}
