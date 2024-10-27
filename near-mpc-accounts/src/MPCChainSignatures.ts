import { ChainFactory } from "./chains/ChainFactory";
import { MPCSigner } from "./mpc/MPCSigner";
import { ContractDeployer } from "./ContractDeployer";
import { TransactionSigner } from "./TransactionSigner";
import { readFileSync } from "fs";
import { isAddress, getAddress } from "viem";
import {
  MPC_CONTRACT_ID,
  MPC_PATH,
  MPC_PUBLIC_KEY,
  NEAR_ACCOUNT_ID,
} from "./config";
import { BitcoinChain } from "./chains/BitcoinChain";
import { ContractCallParams, ContractCallResult } from "./chains/Chain";

export interface DeployContractOptions {
  waitForConfirmation?: boolean;
  index?: number;
}

export interface BitcoinTransactionRequest {
  from: string;
  to: string;
  amount: number; // in satoshis
  publicKey: string;
}

export class MPCChainSignatures {
  private mpcSigner: MPCSigner;
  private transactionSigner: TransactionSigner;
  private contractDeployer: ContractDeployer;
  private initialized: boolean = false;
  private jsonOutput: boolean;

  constructor(jsonOutput: boolean = false) {
    this.jsonOutput = jsonOutput;
    this.mpcSigner = new MPCSigner(MPC_CONTRACT_ID, MPC_PATH, jsonOutput);
    this.transactionSigner = new TransactionSigner(this.mpcSigner, jsonOutput);
  }

  private getPath(chainType: string, index?: number): string {
    return index !== undefined ? `${chainType},${index}` : MPC_PATH;
  }

  private log(...args: any[]) {
    if (!this.jsonOutput) {
      console.log(...args);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.mpcSigner.initialize();
    this.initialized = true;
  }

  getNearAccountId(): string {
    return NEAR_ACCOUNT_ID;
  }

  getContractId(): string {
    return MPC_CONTRACT_ID;
  }

  async generateAddress(
    chainType: string,
    options: any = {},
  ): Promise<{ address: string; publicKey?: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const chain = ChainFactory.createChain(chainType);
      this.log(`\nGenerating ${chainType} address...`);

      // Generate dynamic path based on chain type and index
      const path =
        options.index !== undefined
          ? `${chainType},${options.index}`
          : MPC_PATH;

      const result = await chain.generateAddress(
        MPC_PUBLIC_KEY,
        NEAR_ACCOUNT_ID,
        path,
      );

      if (this.jsonOutput) {
      } else {
        this.log("\n✅ Address generated successfully!");
        this.log("\n🔑 Your new address:", result.address);
        if (result.publicKey) {
          this.log("📝 Public Key:", result.publicKey);
        }
      }

      process.exitCode = 0;
      setTimeout(() => process.exit(0), 1000);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        );
      } else {
        console.error("\n❌ Error generating address:", errorMessage);
      }

      process.exitCode = 1;
      setTimeout(() => process.exit(1), 1000);

      throw error;
    }
  }

  async signPayload(payload: string): Promise<{
    r: string;
    s: string;
    v: number;
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!payload.startsWith("0x")) {
        payload = "0x" + payload;
      }

      const payloadArray = Array.from(Buffer.from(payload.slice(2), "hex"));
      const signature = await this.mpcSigner.sign(payloadArray);

      if (signature) {
        const result = {
          r: signature.r.toString("hex"),
          s: signature.s.toString("hex"),
          v: signature.v,
        };

        if (this.jsonOutput) {
          console.log(
            JSON.stringify({
              success: true,
              signature: result,
            }),
          );
        } else {
          this.log("\n✅ Payload signed successfully!");
          this.log("\n📝 Signature details:");
          this.log("r:", result.r);
          this.log("s:", result.s);
          this.log("v:", result.v);
        }

        process.exitCode = 0;
        setTimeout(() => process.exit(0), 1000);

        return result;
      }

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        );
      } else {
        console.error("\n❌ Error signing payload:", errorMessage);
      }

      process.exitCode = 1;
      setTimeout(() => process.exit(1), 1000);

      throw error;
    }
  }

  async deployContract(
    chainType: string,
    bytecodePathOrHex: string,
    abiPathOrJSON: string,
    fromAddress: string,
    options: DeployContractOptions = {},
    constructorArgs: any[] = [],
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const path = this.getPath(chainType, options.index);
    this.transactionSigner = new TransactionSigner(
      this.mpcSigner,
      this.jsonOutput,
      path,
    );

    // Create ContractDeployer instance with current options
    this.contractDeployer = new ContractDeployer(
      this.transactionSigner,
      this.jsonOutput,
      options.waitForConfirmation ?? true, // default to true if not specified
    );

    if (!fromAddress || !isAddress(fromAddress)) {
      throw new Error(`Invalid address format: ${fromAddress}`);
    }

    const chain = ChainFactory.createChain(chainType);

    // Read and validate bytecode
    let bytecode: string = bytecodePathOrHex;
    if (bytecodePathOrHex.endsWith(".bin")) {
      try {
        bytecode = readFileSync(bytecodePathOrHex, "utf8");
      } catch (error) {
        throw new Error(`Failed to read bytecode file: ${error.message}`);
      }
    }

    // Read and validate ABI
    let abi: any[] = [];
    if (typeof abiPathOrJSON === "string") {
      try {
        abi = abiPathOrJSON.endsWith(".json")
          ? JSON.parse(readFileSync(abiPathOrJSON, "utf8"))
          : JSON.parse(abiPathOrJSON);
      } catch (error) {
        throw new Error(`Failed to parse ABI: ${error.message}`);
      }
    }

    try {
      return await this.contractDeployer.deployContract(
        chain,
        bytecode,
        JSON.stringify(abi),
        fromAddress,
        constructorArgs,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        );
      }

      throw error;
    }
  }

  async sendBitcoinTransaction(
    chainType: string,
    transaction: BitcoinTransactionRequest,
  ): Promise<{ txHash: string; explorerUrl: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const chain = ChainFactory.createChain(chainType);
    if (!(chain instanceof BitcoinChain)) {
      throw new Error("Chain must be a Bitcoin chain");
    }

    try {
      this.log("\nPreparing Bitcoin transaction...");
      this.log("From:", transaction.from);
      this.log("To:", transaction.to);
      this.log("Amount:", transaction.amount, "satoshis");

      // Create a signer function that uses our MPCSigner
      const signer = async (payload: number[]) => {
        const signature = await this.mpcSigner.sign(payload);
        if (!signature) {
          throw new Error("Failed to get signature from MPC");
        }
        return {
          r: signature.r.toString("hex"),
          s: signature.s.toString("hex"),
          v: signature.v,
        };
      };

      const txHash = await chain.sendBitcoinTransaction(transaction, signer);

      const result = {
        txHash,
        explorerUrl: chain.getExplorerUrl(txHash),
      };

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: true,
            ...result,
          }),
        );
      } else {
        this.log("\n✅ Transaction sent successfully!");
        this.log("📝 Transaction Hash:", txHash);
        this.log("🔍 Explorer URL:", result.explorerUrl);
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        );
      } else {
        console.error("\n❌ Error sending Bitcoin transaction:", errorMessage);
      }

      throw error;
    }
  }

  async callContract(
    chainType: string,
    params: ContractCallParams,
  ): Promise<ContractCallResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const chain = ChainFactory.createChain(chainType);

    if (!chain.supportsSmartContracts()) {
      throw new Error(`Chain ${chainType} does not support smart contracts`);
    }

    try {
      const path = this.getPath(chainType, params.index);
      // Create transaction signer with the correct path
      this.transactionSigner = new TransactionSigner(
        this.mpcSigner,
        this.jsonOutput,
        path,
      );

      // Let EVMChain prepare the transaction but use our signer to sign and send it
      const preparedTx = await chain.callContract({
        ...params,
        jsonOutput: this.jsonOutput,
      });

      if (!preparedTx || !preparedTx.transaction) {
        throw new Error("Failed to prepare transaction");
      }

      // Sign and send the transaction using our MPC signer
      const txHash = await this.transactionSigner.signAndSendTransaction(
        chain,
        preparedTx.transaction,
        params.from,
      );

      return {
        hash: txHash,
        explorerUrl: chain.getExplorerUrl(txHash),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        );
      } else {
        console.error("\n❌ Error calling contract:", errorMessage);
      }

      throw error;
    }
  }
}
