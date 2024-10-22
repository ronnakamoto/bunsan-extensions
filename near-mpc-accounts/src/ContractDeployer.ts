import { TransactionSigner } from "./TransactionSigner";
import { Chain } from "./chains/Chain";
import { Address, Hex, getAddress, isAddress } from "viem";
import { readFileSync } from "fs";
import { ethers } from "ethers";

export class ContractDeployer {
  private jsonOutput: boolean;

  constructor(
    private transactionSigner: TransactionSigner,
    jsonOutput: boolean = false,
  ) {
    this.jsonOutput = jsonOutput;
  }

  private log(...args: any[]) {
    if (!this.jsonOutput) {
      console.log(...args);
    }
  }

  private cleanBytecode(bytecode: string): string {
    return bytecode
      .trim()
      .replace(/[\s\n\r]/g, "")
      .replace(/^(?!0x)/, "0x");
  }

  async deployContract(
    chain: Chain,
    bytecodePathOrHex: string,
    abiPathOrJson: string,
    fromAddress: string,
    constructorArgs: any[] = [],
  ): Promise<{ contractAddress: string; transactionHash: string }> {
    try {
      this.log("\nPreparing contract deployment...");

      if (!isAddress(fromAddress)) {
        throw new Error(`Invalid address format: ${fromAddress}`);
      }
      const normalizedAddress = getAddress(fromAddress);
      this.log("From address:", normalizedAddress);

      if (!chain.supportsSmartContracts()) {
        throw new Error(
          `Chain ${chain.getName()} does not support smart contracts`,
        );
      }

      // Load and validate bytecode
      let bytecode: string;
      try {
        if (bytecodePathOrHex.endsWith(".bin")) {
          const rawBytecode = readFileSync(bytecodePathOrHex, "utf8");
          bytecode = this.cleanBytecode(rawBytecode);
        } else {
          bytecode = this.cleanBytecode(bytecodePathOrHex);
        }

        if (!ethers.utils.isHexString(bytecode)) {
          throw new Error("Invalid bytecode format");
        }

        this.log("Bytecode loaded and validated, length:", bytecode.length);
      } catch (error) {
        throw new Error(`Failed to load bytecode: ${error.message}`);
      }

      // Get deployment parameters
      const publicClient = chain.getPublicClient();
      this.log("\nFetching deployment parameters...");

      const [nonce, gasPrice] = await Promise.all([
        publicClient.getTransactionCount({ address: normalizedAddress }),
        chain.getGasPrice(),
      ]);

      this.log("Nonce:", nonce);
      this.log("Gas Price:", gasPrice.toString());

      const calculatedContractAddress = ethers.utils.getContractAddress({
        from: normalizedAddress,
        nonce,
      });
      this.log("\nCalculated contract address:", calculatedContractAddress);

      // Handle constructor arguments
      let deployData = bytecode;
      if (constructorArgs.length > 0) {
        try {
          const abi = abiPathOrJson.endsWith(".json")
            ? JSON.parse(readFileSync(abiPathOrJson, "utf8"))
            : JSON.parse(abiPathOrJson);

          const constructorFragment = abi.find(
            (fragment: any) => fragment.type === "constructor",
          );

          if (constructorFragment) {
            const iface = new ethers.utils.Interface([constructorFragment]);
            const encodedArgs = iface.encodeDeploy(constructorArgs);
            deployData = bytecode + encodedArgs.slice(2);
            this.log("Constructor arguments encoded successfully");
          }
        } catch (error) {
          throw new Error(
            `Failed to encode constructor arguments: ${error.message}`,
          );
        }
      }

      const transaction = {
        from: normalizedAddress,
        nonce,
        data: deployData as Hex,
        value: BigInt(0),
        gasLimit: BigInt(6000000),
        gasPrice,
        chainId: chain.getChainId(),
      };

      this.log("\nSending deployment transaction...");

      const txHash = await this.transactionSigner.signAndSendTransaction(
        chain,
        transaction,
        normalizedAddress,
      );

      this.log("Transaction hash:", txHash);
      this.log("Waiting for deployment confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Contract deployment failed");
      }

      const result = {
        contractAddress: calculatedContractAddress,
        transactionHash: txHash,
        explorerUrl: chain.getExplorerUrl(txHash),
      };

      if (this.jsonOutput) {
        console.log(JSON.stringify(result));
      } else {
        this.log("\nContract deployed successfully!");
        this.log("Contract address:", result.contractAddress);
        this.log("Transaction hash:", result.transactionHash);
        this.log("Explorer link:", result.explorerUrl);
      }

      // Exit the process after successful deployment
      process.exitCode = 0;
      setTimeout(() => process.exit(0), 1000); // Give time for any pending logs

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
        console.error("\nDeployment failed:", errorMessage);
      }

      // Exit with error code
      process.exitCode = 1;
      setTimeout(() => process.exit(1), 1000);

      throw error;
    }
  }
}
