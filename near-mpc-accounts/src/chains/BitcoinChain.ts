import { Chain, ContractCallParams, ContractCallResult } from "./Chain";
import {
  deriveChildPublicKey,
  uncompressedHexPointToBtcAddress,
  najPublicKeyStrToUncompressedHexPoint,
} from "../utils/crypto";
import bs58check from "bs58check";
import * as bitcoinJs from "bitcoinjs-lib";

export type BitcoinNetwork = "mainnet" | "testnet";

interface BitcoinConfig {
  name: string;
  networkByte: number;
  explorerUrl: string;
  apiUrl: string;
  network: bitcoinJs.Network;
}

interface BitcoinTransaction {
  from: string;
  to: string;
  amount: number; // in satoshis
  publicKey: string;
}

interface UTXO {
  txid: string;
  vout: number;
  value: number;
}

const BITCOIN_NETWORKS: Record<BitcoinNetwork, BitcoinConfig> = {
  mainnet: {
    name: "Bitcoin Mainnet",
    networkByte: 0x00,
    explorerUrl: "https://blockstream.info",
    apiUrl: "https://blockstream.info/api",
    network: bitcoinJs.networks.bitcoin,
  },
  testnet: {
    name: "Bitcoin Testnet",
    networkByte: 0x6f,
    explorerUrl: "https://blockstream.info/testnet",
    apiUrl: "https://blockstream.info/testnet/api",
    network: bitcoinJs.networks.testnet,
  },
};

export class BitcoinChain implements Chain {
  private readonly config: BitcoinConfig;

  constructor(
    private readonly network: BitcoinNetwork = "testnet",
    explorerUrlOverride?: string,
  ) {
    this.config = {
      ...BITCOIN_NETWORKS[network],
      ...(explorerUrlOverride && { explorerUrl: explorerUrlOverride }),
    };
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
    const address = await uncompressedHexPointToBtcAddress(
      childPublicKey,
      Buffer.from([this.config.networkByte]),
    );
    return {
      address,
      publicKey: childPublicKey,
    };
  }

  validateAddress(address: string): boolean {
    try {
      bs58check.decode(address);
      return true;
    } catch {
      return false;
    }
  }

  supportsSmartContracts(): boolean {
    return false;
  }

  getType(): string {
    return "bitcoin";
  }

  getName(): string {
    return this.config.name;
  }

  getChainId(): number {
    // Bitcoin doesn't have chain IDs like Ethereum, but we return network byte for consistency
    return this.config.networkByte;
  }

  getRpcUrl(): string {
    // Bitcoin doesn't use RPC URLs in the same way as Ethereum
    return "";
  }

  getExplorerUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  getNetwork(): BitcoinNetwork {
    return this.network;
  }

  getNetworkByte(): number {
    return this.config.networkByte;
  }

  // Required by Chain interface but not applicable for Bitcoin
  getViemChain() {
    throw new Error("Bitcoin does not support Viem chains");
  }

  getPublicClient() {
    throw new Error("Bitcoin does not support Viem public clients");
  }

  getWalletClient() {
    throw new Error("Bitcoin does not support Viem wallet clients");
  }

  async getGasPrice(): Promise<bigint> {
    throw new Error("Bitcoin does not use gas pricing");
  }

  async estimateGas(): Promise<bigint> {
    throw new Error("Bitcoin does not use gas estimation");
  }

  private async fetchJson(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  private async fetchTransaction(txid: string): Promise<bitcoinJs.Transaction> {
    const data = await this.fetchJson(`${this.config.apiUrl}/tx/${txid}`);
    const tx = new bitcoinJs.Transaction();

    tx.version = data.version;
    tx.locktime = data.locktime;

    data.vin.forEach((vin: any) => {
      const txHash = Buffer.from(vin.txid, "hex").reverse();
      tx.addInput(
        txHash,
        vin.vout,
        vin.sequence,
        vin.scriptsig ? Buffer.from(vin.scriptsig, "hex") : undefined,
      );
    });

    data.vout.forEach((vout: any) => {
      tx.addOutput(Buffer.from(vout.scriptpubkey, "hex"), vout.value);
    });

    data.vin.forEach((vin: any, index: number) => {
      if (vin.witness?.length > 0) {
        const witness = vin.witness.map((w: string) => Buffer.from(w, "hex"));
        tx.setWitness(index, witness);
      }
    });

    return tx;
  }

  async getBalance(
    address: string,
  ): Promise<{ balance: number; utxos: UTXO[] }> {
    const utxos = await this.fetchJson(
      `${this.config.apiUrl}/address/${address}/utxo`,
    );

    const formattedUtxos = utxos.map((utxo: any) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
    }));

    const balance = formattedUtxos.reduce(
      (sum: number, utxo: UTXO) => sum + utxo.value,
      0,
    );

    return { balance, utxos: formattedUtxos };
  }

  async sendBitcoinTransaction(
    tx: BitcoinTransaction,
    signer: (payload: number[]) => Promise<{ r: string; s: string; v: number }>,
  ): Promise<string> {
    // 1. Get UTXOs
    const { utxos } = await this.getBalance(tx.from);
    if (!utxos.length) {
      throw new Error("No UTXOs found for address");
    }

    // For simplicity, use largest UTXO (can be improved to handle multiple UTXOs)
    const [utxo] = utxos.sort((a, b) => b.value - a.value);

    if (utxo.value < tx.amount) {
      throw new Error("Insufficient funds");
    }

    // 2. Create PSBT
    const psbt = new bitcoinJs.Psbt({ network: this.config.network });

    // 3. Get input transaction
    const inputTx = await this.fetchTransaction(utxo.txid);
    const inputData = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: inputTx.outs[utxo.vout].script,
        value: utxo.value,
      },
    };

    psbt.addInput(inputData);

    // 4. Add outputs
    psbt.addOutput({
      address: tx.to,
      value: tx.amount,
    });

    // Calculate and add change output
    const feeRate = await this.fetchJson(`${this.config.apiUrl}/fee-estimates`);
    const estimatedSize = 148 + 2 * 34 + 10; // Simplified size estimation
    const fee = estimatedSize * (feeRate[6] + 3);
    const change = utxo.value - tx.amount - fee;

    if (change > 0) {
      psbt.addOutput({
        address: tx.from,
        value: change,
      });
    }

    // 5. Sign transaction
    const keyPair = {
      publicKey: Buffer.from(tx.publicKey, "hex"),
      sign: async (transactionHash: Buffer) => {
        const payload = Array.from(ethers.utils.arrayify(transactionHash));
        const signature = await signer(payload);
        return Buffer.from(signature.r + signature.s, "hex");
      },
    };

    await psbt.signInputAsync(0, keyPair);
    psbt.finalizeAllInputs();

    // 6. Broadcast transaction
    const response = await fetch(`${this.config.apiUrl}/tx`, {
      method: "POST",
      body: psbt.extractTransaction().toHex(),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to broadcast transaction: ${await response.text()}`,
      );
    }

    const txHash = await response.text();
    return txHash;
  }

  async sendTransaction(signedTx: `0x${string}`): Promise<`0x${string}`> {
    throw new Error(
      "Use sendBitcoinTransaction instead for Bitcoin transactions",
    );
  }

  async callContract(params: ContractCallParams): Promise<ContractCallResult> {
    throw new Error("Bitcoin does not support smart contract calls");
  }
}
