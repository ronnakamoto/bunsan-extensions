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

const { Near, Account, keyStores, KeyPair, utils } = nearAPI;

export class MPCSigner {
  private near!: nearAPI.Near;
  private account!: nearAPI.Account;
  private isProxyCall: boolean;
  private accountId: string;
  private contractId: string;
  private rpcLogger: Console;

  constructor(
    mpcContractId: string,
    private path: string,
    private jsonOutput: boolean = false,
  ) {
    this.isProxyCall = NEAR_PROXY_CONTRACT === "true";
    this.accountId =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_ACCOUNT_ID! : NEAR_ACCOUNT_ID;
    this.contractId = this.isProxyCall ? NEAR_PROXY_ACCOUNT_ID! : mpcContractId;

    // Create a custom logger that only logs when not in JSON mode
    this.rpcLogger = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
      ignoreErrors: true,
    });
  }

  private log(...args: any[]) {
    if (!this.jsonOutput) {
      console.log(...args);
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

    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey(
      "testnet",
      this.accountId,
      KeyPair.fromString(privateKey as KeyPairString) as nearAPI.KeyPair,
    );

    const config = {
      networkId: "testnet",
      keyStore,
      nodeUrl: "https://rpc.testnet.near.org",
      walletUrl: "https://testnet.mynearwallet.com/",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://testnet.nearblocks.io",
      // Add logger configuration to suppress logs
      logger: this.jsonOutput
        ? {
            log: () => {},
            warn: () => {},
            error: () => {},
          }
        : this.rpcLogger,
    };

    this.near = new Near(config);
    this.account = new Account(this.near.connection, this.accountId);

    // Override the default console.log for RPC calls if in JSON mode
    if (this.jsonOutput) {
      this.account.connection.provider.sendJsonRpc = async (...args) => {
        try {
          // @ts-ignore - Accessing private property
          return await this.account.connection.provider.__proto__.sendJsonRpc.apply(
            this.account.connection.provider,
            args,
          );
        } catch (error) {
          throw error;
        }
      };
    }
  }

  async sign(
    payload: number[] | string,
    pathOverride?: string,
  ): Promise<{ r: Buffer; s: Buffer; v: number } | undefined> {
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

    try {
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
    }
  }

  getAccountId(): string {
    return this.accountId;
  }

  getContractId(): string {
    return this.contractId;
  }
}
