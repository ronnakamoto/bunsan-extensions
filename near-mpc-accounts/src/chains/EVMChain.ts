import { Chain } from "./Chain";
import {
  createPublicClient,
  createWalletClient,
  http,
  Chain as ViemChain,
  PublicClient,
  WalletClient,
  Transport,
  Address,
  Hash,
  isAddress,
} from "viem";
import {
  deriveChildPublicKey,
  uncompressedHexPointToEvmAddress,
  najPublicKeyStrToUncompressedHexPoint,
} from "../utils/crypto";

export class EVMChain implements Chain {
  private publicClient: PublicClient;
  private walletClient: WalletClient<Transport, ViemChain>;

  constructor(
    private name: string,
    private chainId: number,
    private rpcUrl: string,
    private explorerUrl: string,
    private viemChain: ViemChain,
  ) {
    this.publicClient = createPublicClient({
      chain: this.viemChain,
      transport: http(this.rpcUrl),
    });

    this.walletClient = createWalletClient({
      chain: this.viemChain,
      transport: http(this.rpcUrl),
    });
  }

  async generateAddress(
    publicKey: string,
    accountId: string,
    path: string,
  ): Promise<string> {
    const childPublicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(publicKey),
      accountId,
      path,
    );
    return uncompressedHexPointToEvmAddress(childPublicKey);
  }

  validateAddress(address: string): boolean {
    return isAddress(address);
  }

  supportsSmartContracts(): boolean {
    return true;
  }

  getType(): string {
    return "evm";
  }

  getName(): string {
    return this.name;
  }

  getChainId(): number {
    return this.chainId;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  getExplorerUrl(txHash: string): string {
    return `${this.explorerUrl}/tx/${txHash}`;
  }

  getViemChain(): ViemChain {
    return this.viemChain;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  getWalletClient(): WalletClient<Transport, ViemChain> {
    return this.walletClient;
  }

  async getGasPrice(): Promise<bigint> {
    return this.publicClient.getGasPrice();
  }

  async estimateGas(transaction: any): Promise<bigint> {
    return this.publicClient.estimateGas(transaction);
  }

  async sendTransaction(signedTx: `0x${string}`): Promise<`0x${string}`> {
    return this.publicClient.sendRawTransaction({
      serializedTransaction: signedTx,
    });
  }
}
