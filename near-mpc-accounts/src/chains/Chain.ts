import {
  Chain as ViemChain,
  PublicClient,
  WalletClient,
  Transport,
  Address,
} from "viem";

export interface Chain {
  generateAddress(
    publicKey: string,
    accountId: string,
    path: string,
  ): Promise<string>;
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
  sendTransaction(signedTx: `0x${string}`): Promise<`0x${string}`>;
}
