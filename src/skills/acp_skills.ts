import axios from 'axios';

export interface AcpProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
}

export interface AcpCheckoutPayload {
  receiver: string;
  value: string;
  data?: string;
}

export async function browseAcpProducts(
  agentUrl: string,
): Promise<AcpProduct[]> {
  try {
    const url = new URL('/.well-known/acp/products.json', agentUrl).toString();
    const response = await axios.get(url);
    return response.data?.products || [];
  } catch {
    return [];
  }
}

export async function checkoutAcpProduct(
  agentUrl: string,
  productId: string,
  buyerAddress: string,
): Promise<AcpCheckoutPayload | null> {
  try {
    const url = new URL('/acp/checkout', agentUrl).toString();
    const response = await axios.post(url, {productId, buyerAddress});
    return response.data as AcpCheckoutPayload;
  } catch {
    return null;
  }
}
