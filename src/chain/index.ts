/**
 * Barrel export for the chain layer.
 *
 * Everything blockchain-related (signer loading, provider/entrypoint
 * construction, transaction signing, relayer discovery, ABI patching)
 * is consolidated here.
 */
export {loadSigner, loadSignerSync, loadSignerWithAddress} from './signer';
export {createProvider, createEntrypoint} from './client';
export {
  applyFreshNonce,
  sign,
  withRelayer,
  signAndSend,
  signAndRelay,
} from './tx';
export {discoverRelayerAddress} from './relayer';
export {createPatchedAbi} from '../utils/abi';
