import { Chain } from "./Chain";
import { EVMChain } from "./EVMChain";
import { BitcoinChain } from "./BitcoinChain";

export class ChainFactory {
  static createChain(chainType: string): Chain {
    switch (chainType.toLowerCase()) {
      case "ethereum":
        return new EVMChain();
      case "bitcoin":
        return new BitcoinChain();
      // Add more cases here for additional chains
      default:
        throw new Error(`Unsupported chain type: ${chainType}`);
    }
  }
}
