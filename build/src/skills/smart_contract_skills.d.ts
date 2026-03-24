export interface ContractQueryParams {
    address: string;
    funcName: string;
    args?: string[];
}
export interface ContractExecuteParams {
    address: string;
    funcName: string;
    args?: string[];
    value?: bigint;
    gasLimit?: bigint;
}
export declare function queryContract(params: ContractQueryParams): Promise<any[]>;
export declare function executeContract(params: ContractExecuteParams): Promise<string>;
