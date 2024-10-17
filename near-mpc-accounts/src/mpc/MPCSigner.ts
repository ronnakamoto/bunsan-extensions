import * as nearAPI from "near-api-js";
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

  constructor(
    private contractId: string,
    private path: string,
  ) {
    this.isProxyCall = NEAR_PROXY_CONTRACT === "true";
  }

  async initialize() {
    const accountId =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_ACCOUNT_ID : NEAR_ACCOUNT_ID;
    const privateKey =
      NEAR_PROXY_ACCOUNT === "true" ? NEAR_PROXY_PRIVATE_KEY : NEAR_PRIVATE_KEY;

    if (!accountId || !privateKey) {
      throw new Error("Account ID or private key is undefined");
    }

    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey(
      "testnet",
      accountId,
      KeyPair.fromString(privateKey as KeyPairString) as nearAPI.KeyPair,
    );

    const config = {
      networkId: "testnet",
      keyStore: keyStore,
      nodeUrl: "https://rpc.testnet.near.org",
      walletUrl: "https://testnet.mynearwallet.com/",
      helperUrl: "https://helper.testnet.near.org",
      explorerUrl: "https://testnet.nearblocks.io",
    };

    this.near = new Near(config);
    this.account = new Account(this.near.connection, accountId);

    console.log("Near Chain Signature (NCS) call details:");
    console.log("Near accountId", accountId);
    console.log("NCS contractId", this.contractId);
  }

  async sign(
    payload: number[],
  ): Promise<{ r: string; s: string; v: number } | undefined> {
    const args = this.isProxyCall
      ? {
          rlp_payload: Buffer.from(payload).toString("hex"),
          path: this.path,
          key_version: 0,
        }
      : {
          request: {
            payload,
            path: this.path,
            key_version: 0,
          },
        };

    const attachedDeposit = this.isProxyCall
      ? utils.format.parseNearAmount("1")
      : utils.format.parseNearAmount("0.2");

    console.log(
      "sign payload",
      payload.length > 200 ? payload.length : payload.toString(),
    );
    console.log("with path", this.path);
    console.log("this may take approx. 30 seconds to complete");
    console.log("argument to sign: ", args);

    try {
      const res = await this.account.functionCall({
        contractId: this.contractId,
        methodName: "sign",
        args,
        gas: BigInt("300000000000000"),
        attachedDeposit: attachedDeposit ? BigInt(attachedDeposit) : BigInt(0),
      });

      if ("SuccessValue" in (res.status as any)) {
        const successValue = (res.status as any).SuccessValue;
        const decodedValue = Buffer.from(successValue, "base64").toString();
        console.log("decoded value: ", decodedValue);
        const { big_r, s: S, recovery_id } = JSON.parse(decodedValue);
        const r = big_r.affine_point.substring(2);
        const s = S.scalar;

        return {
          r,
          s,
          v: recovery_id,
        };
      }
    } catch (e) {
      console.error("Error signing:", e);
    }

    return undefined;
  }
}
