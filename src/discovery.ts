import axios from 'axios';
import {Logger} from './utils/logger';

export interface PaymentInfo {
  intent: 'charge' | 'session';
  method: string;
  amount: string | null;
  currency: string;
  description?: string;
}

export class AgentDiscovery {
  private logger = new Logger('AgentDiscovery');

  async getPaymentInfo(
    agentUrl: string,
    endpointPath?: string,
  ): Promise<PaymentInfo | null> {
    try {
      this.logger.info(
        `Fetching discovery document from ${agentUrl}/openapi.json...`,
      );
      const res = await axios.get(`${agentUrl}/openapi.json`);
      const openapi = res.data;

      this.logger.info(`Discovered Service: ${openapi.info?.title}`);

      let paymentInfo = null;
      if (endpointPath && openapi.paths && openapi.paths[endpointPath]) {
        const methods = Object.keys(openapi.paths[endpointPath]);
        if (methods.length > 0) {
          const method = methods[0];
          paymentInfo = openapi.paths[endpointPath][method]['x-payment-info'];
        }
      }

      if (
        !paymentInfo &&
        openapi['x-service-info'] &&
        openapi['x-service-info'].defaultPayment
      ) {
        paymentInfo = openapi['x-service-info'].defaultPayment;
      }

      if (paymentInfo) {
        this.logger.info(
          `Payment required: ${paymentInfo.amount} ${paymentInfo.currency} (${paymentInfo.intent})`,
        );
      } else {
        this.logger.info(
          `No payment info found for ${endpointPath || 'service'}`,
        );
      }

      return paymentInfo;
    } catch (e) {
      this.logger.warn(
        `Failed to discover agent payment info: ${(e as Error).message}`,
      );
      return null;
    }
  }

  async negotiateSession(
    agentUrl: string,
    paymentInfo: PaymentInfo,
  ): Promise<string> {
    this.logger.info(
      `Negotiating ${paymentInfo.intent} with ${agentUrl} for ${paymentInfo.amount} ${paymentInfo.currency}...`,
    );

    // In a real scenario, this would use UserSigner to broadcast an EGLD/ESDT transfer
    // and return the transaction hash as the proof of payment.
    // For this starter kit, we simulate the negotiation and return a mock proof.
    const mockTxHash = 'mock_tx_' + Date.now().toString(16);
    this.logger.info(`Session negotiated. Proof: ${mockTxHash}`);

    return mockTxHash;
  }
}
