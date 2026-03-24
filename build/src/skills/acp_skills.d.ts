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
export declare function browseAcpProducts(agentUrl: string): Promise<AcpProduct[]>;
export declare function checkoutAcpProduct(agentUrl: string, productId: string, buyerAddress: string): Promise<AcpCheckoutPayload | null>;
