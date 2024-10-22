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
    this.contractDeployer = new ContractDeployer(
      this.transactionSigner,
      jsonOutput,
    );
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
  ): Promise<{ address: string; publicKey?: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const chain = ChainFactory.createChain(chainType);
      this.log(`\nGenerating ${chainType} address...`);

      const result = await chain.generateAddress(
        MPC_PUBLIC_KEY,
        NEAR_ACCOUNT_ID,
        MPC_PATH,
      );

      if (this.jsonOutput) {
        console.log(
          JSON.stringify({
            success: true,
            ...result,
          }),
        );
      } else {
        this.log("\n✅ Address generated successfully!");
        this.log("\n🔑 Your new address:", result.address);
        if (result.publicKey) {
          this.log("📝 Public Key:", result.publicKey);
        }
      }

      // Exit the process after successful address generation
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

      // Exit with error code
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

        // Exit the process after successful signing
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

      // Exit with error code
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
    constructorArgs: any[] = [],
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    if (!this.initialized) {
      await this.initialize();
    }

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
}
