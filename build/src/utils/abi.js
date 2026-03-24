"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPatchedAbi = createPatchedAbi;
const sdk_core_1 = require("@multiversx/sdk-core");
/**
 * Patches known ABI type incompatibilities between the contract-generated ABI
 * and what sdk-core's TypeMapper expects.
 *
 * - `TokenId` → `TokenIdentifier`
 * - `NonZeroBigUint` → `BigUint`
 */
function createPatchedAbi(abiJson) {
    const raw = JSON.stringify(abiJson);
    const patched = raw
        .replace(/\bTokenId\b/g, 'TokenIdentifier')
        .replace(/\bNonZeroBigUint\b/g, 'BigUint')
        .replace(/\bPayment\b/g, 'EgldOrEsdtTokenPayment');
    return sdk_core_1.Abi.create(JSON.parse(patched));
}
//# sourceMappingURL=abi.js.map