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

const { Near, Account, keyStores, KeyPair, utils } = nearAPI;

export class MPCSigner {
  private near!: nearAPI.Near;
  private account!: nearAPI.Account;
  private isProxyCall: boolean;
  private accountId: string;
  private contractId: string;

  constructor(
    mpcContractId: string,
    private path: string,
    private jsonOutput: boolean = false,
  ) {
    this.isProxyCall = NEAR_PROXY_CONTRACT === "true";
    this.accountId =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_ACCOUNT_ID! : NEAR_ACCOUNT_ID;
    this.contractId = this.isProxyCall ? NEAR_PROXY_ACCOUNT_ID! : mpcContractId;
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
    };

    this.near = new Near(config);
    this.account = new Account(this.near.connection, this.accountId);
  }

  async sign(
    payload: number[] | string,
    pathOverride?: string,
  ): Promise<{ r: Buffer; s: Buffer; v: number } | undefined> {
    const usePath = pathOverride || this.path;

    // Format payload based on type
    let formattedPayload: any;
    if (Array.isArray(payload)) {
      formattedPayload = payload;
    } else if (typeof payload === "string") {
      const hexString = payload.startsWith("0x") ? payload.slice(2) : payload;
      formattedPayload = Buffer.from(hexString, "hex").toJSON().data;
    }

    // Prepare contract call arguments
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

    // Set attached deposit based on proxy mode
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
      // Throw a cleaner error message for JSON output
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
