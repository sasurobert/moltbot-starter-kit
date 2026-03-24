import {Abi} from '@multiversx/sdk-core';

/**
 * Patches known ABI type incompatibilities between the contract-generated ABI
 * and what sdk-core's TypeMapper expects.
 *
 * - `TokenId` → `TokenIdentifier`
 * - `NonZeroBigUint` → `BigUint`
 */
export function createPatchedAbi(abiJson: object): Abi {
  const raw = JSON.stringify(abiJson);
  const patched = raw
    .replace(/\bTokenId\b/g, 'TokenIdentifier')
    .replace(/\bNonZeroBigUint\b/g, 'BigUint')
    .replace(/\bPayment\b/g, 'EgldOrEsdtTokenPayment');
  return Abi.create(JSON.parse(patched));
}
