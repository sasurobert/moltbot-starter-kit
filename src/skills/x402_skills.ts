import {UserSigner} from '@multiversx/sdk-wallet';

export interface X402PaymentRequest {
  receiver: string;
  amount: string; // denomination in smallest unit (e.g. 10^18)
  token?: string; // identifier, undefined for EGLD
}

export function parseX402Header(header: string): X402PaymentRequest | null {
  // Format: x402 address="bech32", amount="1000", token="USDC-123"
  if (!header.toLowerCase().startsWith('x402')) return null;

  const addressMatch = header.match(/address="([^"]+)"/);
  const amountMatch = header.match(/amount="([^"]+)"/);
  const tokenMatch = header.match(/token="([^"]+)"/);

  if (!addressMatch || !amountMatch) return null;

  return {
    receiver: addressMatch[1],
    amount: amountMatch[1],
    token: tokenMatch ? tokenMatch[1] : undefined,
  };
}

export async function createX402SignatureHeader(
  signer: UserSigner,
  txHash: string,
): Promise<string> {
  const signatureConfig = await signer.sign(Buffer.from(txHash));
  return `Signature tx="${txHash}", sig="${signatureConfig.toString('hex')}"`;
}
