import * as nearAPI from "near-api-js";
import BN from "bn.js";
import {
  NEAR_ACCOUNT_ID,
  NEAR_PRIVATE_KEY,
  NEAR_PROXY_ACCOUNT,
  NEAR_PROXY_CONTRACT,
  NEAR_PROXY_ACCOUNT_ID,
  NEAR_PROXY_PRIVATE_KEY,
} from "../config";
import { KeyPairString } from "near-api-js/lib/utils/key_pair";
import { Console } from "console";
import { Writable } from "stream";
import { FailoverRpcProvider } from "near-api-js/lib/providers/failover-rpc-provider";
import { JsonRpcProvider } from "near-api-js/lib/providers/json-rpc-provider";
import { Provider } from "near-api-js/lib/providers";

const { Near, Account, keyStores, KeyPair, utils } = nearAPI;

// Create a null output stream
const nullOutputStream = new Writable({
  write(chunk, encoding, callback) {
    callback();
  },
});

interface JsonRpcCapableProvider extends Provider {
  sendJsonRpc?: (method: string, params: any[]) => Promise<any>;
}

class QuietFailoverProvider implements Provider {
  private currentProviderIndex: number = 0;

  constructor(
    private jsonOutput: boolean,
    private providers: JsonRpcProvider[],
    private maxAttempts: number = 3,
  ) {}

  private switchProvider(index: number): void {
    if (!this.jsonOutput) {
      console.log(`Switched to provider at the index ${index}`);
    }
    this.currentProviderIndex = index;
  }

  async query(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.query(params));
  }

  async status(): Promise<any> {
    return this.withBackoff((provider) => provider.status());
  }

  async sendTransaction(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.sendTransaction(params));
  }

  async txStatus(txHash: Uint8Array, accountId: string): Promise<any> {
    return this.withBackoff((provider) => provider.txStatus(txHash, accountId));
  }

  async txStatusReceipts(txHash: Uint8Array, accountId: string): Promise<any> {
    return this.withBackoff((provider) =>
      provider.txStatusReceipts(txHash, accountId),
    );
  }

  async block(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.block(params));
  }

  async chunk(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.chunk(params));
  }

  async validators(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.validators(params));
  }

  async experimental_protocolConfig(params: any): Promise<any> {
    return this.withBackoff((provider) =>
      // @ts-ignore - Some providers might not implement this method
      provider.experimental_protocolConfig?.(params),
    );
  }

  async lightClientProof(params: any): Promise<any> {
    return this.withBackoff((provider) => provider.lightClientProof(params));
  }

  private async withBackoff<T>(
    fn: (provider: JsonRpcProvider) => Promise<T>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await fn(this.providers[this.currentProviderIndex]);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxAttempts - 1) {
          const nextIndex =
            (this.currentProviderIndex + 1) % this.providers.length;
          this.switchProvider(nextIndex);
        }
      }
    }

    if (lastError) {
      if (this.jsonOutput) {
        throw new Error(
          `Failed to execute request after ${this.maxAttempts} attempts`,
        );
      } else {
        throw lastError;
      }
    }

    throw new Error(
      `Failed to execute request after ${this.maxAttempts} attempts`,
    );
  }
}

export class MPCSigner {
  private near!: nearAPI.Near;
  private account!: nearAPI.Account;
  private isProxyCall: boolean;
  private accountId: string;
  private contractId: string;
  private nullConsole: Console;
  private standardConsole: Console;
  private originalConsoleLog: typeof console.log;

  constructor(
    mpcContractId: string,
    private path: string,
    private jsonOutput: boolean = false,
  ) {
    this.isProxyCall = NEAR_PROXY_CONTRACT === "true";
    this.accountId =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_ACCOUNT_ID! : NEAR_ACCOUNT_ID;
    this.contractId = this.isProxyCall ? NEAR_PROXY_ACCOUNT_ID! : mpcContractId;

    // Create consoles for different output modes
    this.nullConsole = new Console({
      stdout: nullOutputStream,
      stderr: nullOutputStream,
    });
    this.standardConsole = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });
    this.originalConsoleLog = console.log;
  }

  private suppressLogs() {
    if (this.jsonOutput) {
      console.log = (...args) => {
        const msg = args.join(" ");
        if (msg.includes("{") && msg.includes("}")) {
          this.originalConsoleLog.apply(console, args);
        }
      };
    }
  }

  private restoreLogs() {
    if (this.jsonOutput) {
      console.log = this.originalConsoleLog;
    }
  }

  private log(...args: any[]) {
    if (!this.jsonOutput) {
      this.standardConsole.log(...args);
    }
  }

  async initialize() {
    if (!this.accountId) {
      throw new Error("Account ID is undefined");
    }

    const privateKey =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_PRIVATE_KEY : NEAR_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Private key is undefined");
    }

    this.suppressLogs();

    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      await keyStore.setKey(
        "testnet",
        this.accountId,
        KeyPair.fromString(privateKey as KeyPairString) as nearAPI.KeyPair,
      );

      const jsonProviders = [
        new JsonRpcProvider(
          {
            url: "https://rpc.testnet.near.org",
          },
          { retries: 3, backoff: 2, wait: 500 },
        ),
        new JsonRpcProvider(
          {
            url: "https://rpc.testnet.pagoda.co",
          },
          { retries: 3, backoff: 2, wait: 500 },
        ),
        new JsonRpcProvider(
          {
            url: "https://test.rpc.fastnear.com",
          },
          { retries: 3, backoff: 2, wait: 500 },
        ),
      ];
      const provider = new QuietFailoverProvider(
        this.jsonOutput,
        jsonProviders,
      );

      const config = {
        networkId: "testnet",
        keyStore,
        provider,
        nodeUrl: "https://rpc.testnet.pagoda.co",
        walletUrl: "https://testnet.mynearwallet.com/",
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://testnet.nearblocks.io",
        logger: this.jsonOutput
          ? {
              log: () => {},
              warn: () => {},
              error: () => {},
              verbose: () => {},
              debug: () => {},
              trace: () => {},
              info: () => {},
            }
          : {
              log: (...args: any[]) => this.log(...args),
              warn: (...args: any[]) => this.log(...args),
              error: (...args: any[]) => this.log(...args),
              verbose: (...args: any[]) => this.log(...args),
              debug: (...args: any[]) => this.log(...args),
              trace: (...args: any[]) => this.log(...args),
              info: (...args: any[]) => this.log(...args),
            },
      };

      this.near = new Near(config);
      this.account = new Account(this.near.connection, this.accountId);

      // Override JSON-RPC logging
      if (this.jsonOutput) {
        const provider = this.account.connection
          .provider as JsonRpcCapableProvider;
        try {
          if (provider && provider.sendJsonRpc) {
            const originalSendJsonRpc = provider.sendJsonRpc.bind(provider);
            provider.sendJsonRpc = async (...args) => {
              // Silently handle the RPC call without logging
              return originalSendJsonRpc(...args);
            };
          }
        } catch (error) {
          // Silently continue if we can't override the logging
          console.debug("Failed to override JSON-RPC logging:", error);
        }
      }
    } catch (error) {
      this.restoreLogs();
      throw error;
    }
  }

  async sign(
    payload: number[] | string,
    pathOverride?: string,
  ): Promise<{ r: Buffer; s: Buffer; v: number } | undefined> {
    this.suppressLogs();

    try {
      const usePath = pathOverride || this.path;

      let formattedPayload: any;
      if (Array.isArray(payload)) {
        formattedPayload = payload;
      } else if (typeof payload === "string") {
        const hexString = payload.startsWith("0x") ? payload.slice(2) : payload;
        formattedPayload = Buffer.from(hexString, "hex").toJSON().data;
      }

      const args = this.isProxyCall
        ? {
            rlp_payload: Buffer.from(formattedPayload).toString("hex"),
            path: usePath,
            key_version: 0,
          }
        : {
            request: {
              payload: formattedPayload,
              path: usePath,
              key_version: 0,
            },
          };

      const attachedDeposit = this.isProxyCall
        ? utils.format.parseNearAmount("1")
        : utils.format.parseNearAmount("0.2");

      this.log(
        "sign payload",
        formattedPayload.length > 200
          ? `[${formattedPayload.length} bytes]`
          : formattedPayload,
      );
      this.log("with path", usePath);
      this.log("using contract:", this.contractId);
      this.log("this may take approx. 30 seconds to complete");
      this.log("argument to sign:", args);

      const res = await this.account.functionCall({
        contractId: this.contractId,
        methodName: "sign",
        args,
        gas: new BN("300000000000000"),
        attachedDeposit: attachedDeposit
          ? new BN(attachedDeposit)
          : new BN("0"),
      });

      if (!("SuccessValue" in (res.status as any))) {
        throw new Error(`Unexpected response: ${JSON.stringify(res)}`);
      }

      const successValue = (res.status as any).SuccessValue;
      if (!successValue) {
        throw new Error("Empty success value returned");
      }

      const decodedValue = Buffer.from(successValue, "base64").toString();
      this.log("decoded value:", decodedValue);

      const { big_r, s: S, recovery_id } = JSON.parse(decodedValue);

      if (!big_r?.affine_point || !S?.scalar) {
        throw new Error(`Invalid signature format: ${decodedValue}`);
      }

      const r = Buffer.from(big_r.affine_point.substring(2), "hex");
      const s = Buffer.from(S.scalar, "hex");

      const signature = {
        r,
        s,
        v: recovery_id,
      };

      this.log("Signature received:", {
        r: r.toString("hex"),
        s: s.toString("hex"),
        v: recovery_id,
      });

      return signature;
    } catch (error) {
      if (!this.jsonOutput) {
        console.error("MPC signing error details:", error);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`MPC signing failed: ${errorMessage}`);
    } finally {
      this.restoreLogs();
    }
  }

  getAccountId(): string {
    return this.accountId;
  }

  getContractId(): string {
    return this.contractId;
  }
}
