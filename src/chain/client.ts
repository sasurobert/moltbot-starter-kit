import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {CONFIG} from '../config';

/**
 * Builds an ApiNetworkProvider using CONFIG defaults and a consistent
 * client name & timeout. Use this everywhere instead of constructing
 * ApiNetworkProvider directly.
 */
export function createProvider(clientName = 'moltbot'): ApiNetworkProvider {
  return new ApiNetworkProvider(CONFIG.API_URL, {
    clientName,
    timeout: CONFIG.REQUEST_TIMEOUT,
  });
}

export {createEntrypoint} from '../utils/entrypoint';
