import {
  Abi,
  Address,
  DevnetEntrypoint,
  SmartContractController,
} from '@multiversx/sdk-core';
import { CONFIG } from './config';
import * as identityAbiJson from './abis/identity-registry.abi.json';

export interface AgentDetails {
  name: string;
  uri: string;
  public_key: string;
  owner: Address;
  metadata: Array<{ key: string; value: string }>;
}

export class BlockchainService {
  private identityController: SmartContractController;

  constructor() {
    const entrypoint = new DevnetEntrypoint({ url: CONFIG.API_URL });
    // Patch ABI types that sdk-core TypeMapper doesn't recognize
    const raw = JSON.stringify(identityAbiJson);
    const patched = JSON.parse(
      raw
        .replace(/"TokenId"/g, '"TokenIdentifier"')
        .replace(/"NonZeroBigUint"/g, '"BigUint"'),
    );
    const abi = Abi.create(patched);
    this.identityController = entrypoint.createSmartContractController(abi);
  }

  async getAgentDetails(nonce: number): Promise<AgentDetails> {
    const results = await this.identityController.query({
      contract: Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY),
      function: 'get_agent',
      arguments: [nonce],
    });

    // The result is already parsed according to the ABI
    return results[0] as AgentDetails;
  }

  async getAgentServicePrice(
    nonce: number,
    serviceId: string,
  ): Promise<bigint> {
    const results = await this.identityController.query({
      contract: Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY),
      function: 'get_agent_service_price',
      arguments: [nonce, Buffer.from(serviceId)],
    });

    return results[0] as bigint;
  }
}
