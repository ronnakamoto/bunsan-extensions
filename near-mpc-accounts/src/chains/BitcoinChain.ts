import { Chain } from "./Chain";
import {
  deriveChildPublicKey,
  uncompressedHexPointToBtcAddress,
  najPublicKeyStrToUncompressedHexPoint,
} from "../utils/crypto";
import bs58check from "bs58check";

export class BitcoinChain implements Chain {
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
    return uncompressedHexPointToBtcAddress(
      childPublicKey,
      Buffer.from([0x6f]),
    ); // Testnet
  }

  validateAddress(address: string): boolean {
    try {
      bs58check.decode(address);
      return true;
    } catch {
      return false;
    }
  }
}
