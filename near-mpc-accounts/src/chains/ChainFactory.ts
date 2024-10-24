import { Chain } from "./Chain";
import { EVMChain } from "./EVMChain";
import { BitcoinChain } from "./BitcoinChain";
import { mainnet, sepolia, Chain as ViemChain } from "viem/chains";

interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  viemChain: ViemChain;
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    viemChain: mainnet,
  },
  sepolia: {
    name: "Sepolia",
    chainId: 11155111,
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    viemChain: sepolia,
  },
  // Add more chains as needed
};

export class ChainFactory {
  static createChain(chainType: string): Chain {
    const normalizedChainType = chainType.toLowerCase();

    if (normalizedChainType in CHAIN_CONFIGS) {
      const config = CHAIN_CONFIGS[normalizedChainType];
      return new EVMChain(
        config.name,
        config.chainId,
        config.rpcUrl,
        config.explorerUrl,
        config.viemChain,
      );
    }

    switch (normalizedChainType) {
      case "bitcoin":
        return new BitcoinChain("Bitcoin", 0x00, "https://blockstream.info");
      case "bitcoin-testnet":
        return new BitcoinChain(
          "Bitcoin Testnet",
          0x6f,
          "https://blockstream.info/testnet",
        );
      default:
        throw new Error(`Unsupported chain type: ${chainType}`);
    }
  }

  static getSupportedChains(): string[] {
    return [...Object.keys(CHAIN_CONFIGS), "bitcoin", "bitcoin-testnet"];
  }
}
