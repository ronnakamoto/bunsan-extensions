import { Chain, ContractCallParams } from "./Chain";
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
  encodeFunctionData,
  parseAbi,
  TransactionRequest,
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
  ): Promise<any> {
    const childPublicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(publicKey),
      accountId,
      path,
    );
    return {
      address: uncompressedHexPointToEvmAddress(childPublicKey),
      publicKey: childPublicKey,
    };
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

  async sendTransaction(
    signedTx: `0x${string}` | string,
  ): Promise<`0x${string}` | string> {
    return this.publicClient.sendRawTransaction({
      serializedTransaction: signedTx as `0x${string}`,
    });
  }

  async callContract(params: ContractCallParams): Promise<{
    transaction: TransactionRequest;
    hash?: Hash;
    explorerUrl?: string;
  }> {
    if (!this.validateAddress(params.to)) {
      throw new Error(`Invalid contract address: ${params.to}`);
    }

    if (!this.validateAddress(params.from)) {
      throw new Error(`Invalid sender address: ${params.from}`);
    }

    try {
      // Find the function in the ABI
      const functionAbi = params.abi.find(
        (item) => item.type === "function" && item.name === params.method,
      );

      if (!functionAbi) {
        throw new Error(`Function ${params.method} not found in ABI`);
      }

      // Encode function data using viem
      const encodedData = encodeFunctionData({
        abi: [functionAbi], // Use only the specific function ABI
        functionName: params.method,
        args: params.args || [],
      });

      // Get current nonce
      const nonce = await this.publicClient.getTransactionCount({
        address: params.from,
      });

      // Get gas price
      const gasPrice = await this.getGasPrice();

      // Prepare transaction
      const transaction = {
        to: params.to,
        from: params.from,
        data: encodedData,
        nonce,
        value: params.value || BigInt(0),
        gasPrice,
        gasLimit: params.gasLimit || BigInt(1000000), // Default 1M gas
        chainId: this.chainId,
      };

      // Estimate gas if not provided
      if (!params.gasLimit) {
        try {
          transaction.gasLimit = await this.estimateGas(transaction);
          // Add 10% buffer to estimated gas
          transaction.gasLimit =
            (transaction.gasLimit * BigInt(110)) / BigInt(100);
        } catch (error) {
          if (!params.jsonOutput) {
            console.warn(
              "Gas estimation failed, using default gas limit:",
              error,
            );
          }
        }
      }

      return {
        transaction,
      };
    } catch (error) {
      // Handle common errors
      if (error instanceof Error) {
        if (error.message.includes("nonce too low")) {
          throw new Error("Transaction has already been submitted");
        }
        if (error.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds for transaction");
        }
        if (
          error.message.includes("gas too low") ||
          error.message.includes("underpriced")
        ) {
          throw new Error("Gas price too low for current network conditions");
        }
      }
      throw error;
    }
  }
}
