import {
  Chain as ViemChain,
  PublicClient,
  WalletClient,
  Transport,
  Address,
} from "viem";

export interface ContractCallParams {
  from: Address;
  to: Address;
  method: string;
  args?: any[];
  value?: bigint;
  abi: any[];
  gasLimit?: bigint;
  index?: number;
  jsonOutput?: boolean;
}

export interface ContractCallResult {
  hash: Hash;
  explorerUrl: string;
}

export interface Chain {
  generateAddress(
    publicKey: string,
    accountId: string,
    path: string,
  ): Promise<any>;
  validateAddress(address: string): boolean;
  supportsSmartContracts(): boolean;
  getType(): string;
  getName(): string;
  getChainId(): number;
  getRpcUrl(): string;
  getExplorerUrl(txHash: string): string;
  getViemChain(): ViemChain;
  getPublicClient(): PublicClient;
  getWalletClient(): WalletClient<Transport, ViemChain>;
  getGasPrice(): Promise<bigint>;
  estimateGas(transaction: any): Promise<bigint>;
  sendTransaction(
    signedTx: `0x${string}` | string,
  ): Promise<`0x${string}` | string>;
  callContract(params: ContractCallParams): Promise<ContractCallResult>;
}
