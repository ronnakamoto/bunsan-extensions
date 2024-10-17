import { ethers } from "ethers";
import { Chain } from "./Chain";
import {
  deriveChildPublicKey,
  uncompressedHexPointToEvmAddress,
  najPublicKeyStrToUncompressedHexPoint,
} from "../utils/crypto";

export class EVMChain implements Chain {
  async generateAddress(
    publicKey: string,
    accountId: string,
    path: string,
  ): Promise<string> {
    const childPublicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(publicKey),
      accountId,
      path,
    );
    return uncompressedHexPointToEvmAddress(childPublicKey);
  }

  validateAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }
}
