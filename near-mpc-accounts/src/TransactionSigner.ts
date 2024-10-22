import { MPCSigner } from "./mpc/MPCSigner";
import { Chain } from "./chains/Chain";
import { ethers } from "ethers";
import { Address, Hash, TransactionRequest } from "viem";
const { NEAR_PROXY_CONTRACT } = process.env;

export class TransactionSigner {
  constructor(
    private mpcSigner: MPCSigner,
    private jsonOutput: boolean = false,
  ) {}

  private log(...args: any[]) {
    if (!this.jsonOutput) {
      console.log(...args);
    }
  }

  async signTransaction(
    chain: Chain,
    transaction: TransactionRequest,
    fromAddress: Address,
  ): Promise<string> {
    this.log("\nPreparing to sign transaction...");
    this.log("From address:", fromAddress);

    try {
      // Format numeric values as hex strings
      const baseTx = {
        nonce: ethers.utils.hexlify(transaction.nonce || 0),
        gasPrice: ethers.utils.hexlify(transaction.gasPrice || 0),
        gasLimit: ethers.utils.hexlify(transaction.gasLimit || 0),
        to: transaction.to as string,
        value: ethers.utils.hexlify(transaction.value || 0),
        data: transaction.data as string,
        chainId: chain.getChainId(),
      };

      this.log("Transaction parameters:", {
        nonce: baseTx.nonce,
        gasPrice: baseTx.gasPrice,
        gasLimit: baseTx.gasLimit,
        value: baseTx.value,
      });

      // Create unsigned transaction and get hash
      const unsignedTx = ethers.utils.serializeTransaction(baseTx);
      const txHash = ethers.utils.keccak256(unsignedTx);

      this.log("Transaction hash:", txHash);

      // Prepare payload based on proxy mode
      let payload;
      if (NEAR_PROXY_CONTRACT === "true") {
        payload = unsignedTx;
      } else {
        const txBytes = ethers.utils.arrayify(txHash);
        payload = Array.from(txBytes);
      }

      this.log("Requesting MPC signature...");

      const sig = await this.mpcSigner.sign(payload);

      if (!sig) {
        throw new Error("No signature returned from MPC");
      }

      this.log("Raw signature received:", {
        r: sig.r.toString("hex"),
        s: sig.s.toString("hex"),
        v: sig.v,
      });

      // Format signature for Ethereum
      const signature = {
        r: "0x" + sig.r.toString("hex"),
        s: "0x" + sig.s.toString("hex"),
        v: sig.v + chain.getChainId() * 2 + 35,
      };

      // Verify signature
      const recoveredAddress = ethers.utils.recoverAddress(txHash, signature);

      if (recoveredAddress.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error(
          `Address recovery failed. Got: ${recoveredAddress}, Expected: ${fromAddress}`,
        );
      }

      this.log("Transaction signed successfully");

      // Create final signed transaction
      return ethers.utils.serializeTransaction(baseTx, signature);
    } catch (error) {
      if (!this.jsonOutput) {
        console.error("Detailed signing error:", error);
      }
      throw error;
    }
  }

  async signAndSendTransaction(
    chain: Chain,
    transaction: TransactionRequest,
    fromAddress: Address,
  ): Promise<Hash> {
    this.log("\nInitiating transaction signing and sending...");

    const signedTx = await this.signTransaction(
      chain,
      transaction,
      fromAddress,
    );

    this.log("Broadcasting signed transaction...");

    try {
      const txHash = await chain.sendTransaction(signedTx as `0x${string}`);

      this.log("Transaction broadcast successful");
      this.log("Transaction hash:", txHash);

      return txHash;
    } catch (error) {
      const errorStr = JSON.stringify(error);
      if (/nonce too low/gi.test(errorStr)) {
        throw new Error("Transaction has already been tried");
      }
      if (/gas too low|underpriced/gi.test(errorStr)) {
        throw new Error("Gas price too low for current network conditions");
      }
      if (!this.jsonOutput) {
        console.error("Transaction send error:", error);
      }
      throw error;
    }
  }
}
