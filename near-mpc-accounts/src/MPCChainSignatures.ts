import { ChainFactory } from "./chains/ChainFactory";
import { MPCSigner } from "./mpc/MPCSigner";
import {
  MPC_CONTRACT_ID,
  MPC_PATH,
  MPC_PUBLIC_KEY,
  NEAR_ACCOUNT_ID,
} from "./config";

export class MPCChainSignatures {
  private mpcSigner: MPCSigner;

  constructor() {
    this.mpcSigner = new MPCSigner(MPC_CONTRACT_ID, MPC_PATH);
  }

  async initialize() {
    await this.mpcSigner.initialize();
  }

  async generateAddress(chainType: string): Promise<string> {
    const chain = ChainFactory.createChain(chainType);
    return chain.generateAddress(MPC_PUBLIC_KEY, NEAR_ACCOUNT_ID, MPC_PATH);
  }

  async signPayload(
    payload: string,
  ): Promise<{ r: string; s: string; v: number } | undefined> {
    const payloadArray = Buffer.from(payload, "hex").toJSON().data;
    return this.mpcSigner.sign(payloadArray);
  }

  getNearAccountId(): string {
    return NEAR_ACCOUNT_ID;
  }

  getContractId(): string {
    return MPC_CONTRACT_ID;
  }
}
