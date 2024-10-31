import { Chain } from "./Chain";
import { EVMChain } from "./EVMChain";
import { BitcoinChain, BitcoinNetwork } from "./BitcoinChain";
import {
  mainnet,
  sepolia,
  auroraTestnet,
  Chain as ViemChain,
} from "viem/chains";

interface EVMChainConfig {
  type: "evm";
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  viemChain: ViemChain;
}

interface BitcoinChainConfig {
  type: "bitcoin";
  network: BitcoinNetwork;
  explorerUrl?: string;
}

type ChainConfig = EVMChainConfig | BitcoinChainConfig;

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  // EVM Chains
  ethereum: {
    type: "evm",
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "http://localhost:8080/eth",
    explorerUrl: "https://etherscan.io",
    viemChain: mainnet,
  },
  sepolia: {
    type: "evm",
    name: "Sepolia",
    chainId: 11155111,
    rpcUrl: "https://1rpc.io/sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
    viemChain: sepolia,
  },
  auroratestnet: {
    type: "evm",
    name: "Aurora Testnet",
    chainId: 1313161555,
    rpcUrl: "https://testnet.aurora.dev",
    explorerUrl: "https://explorer.testnet.aurora.dev",
    viemChain: auroraTestnet,
  },

  // Bitcoin Chains
  bitcoin: {
    type: "bitcoin",
    network: "mainnet",
  },
  "bitcoin-testnet": {
    type: "bitcoin",
    network: "testnet",
  },
};

export class ChainFactory {
  static createChain(chainType: string): Chain {
    const normalizedChainType = chainType.toLowerCase();
    const config = CHAIN_CONFIGS[normalizedChainType];

    if (!config) {
      throw new Error(`Unsupported chain type: ${chainType}`);
    }

    switch (config.type) {
      case "evm":
        return new EVMChain(
          config.name,
          config.chainId,
          config.rpcUrl,
          config.explorerUrl,
          config.viemChain,
        );

      case "bitcoin":
        return new BitcoinChain(config.network, config.explorerUrl);
    }
  }

  static getSupportedChains(): string[] {
    return Object.keys(CHAIN_CONFIGS);
  }

  static getSupportedChainsByType(): Record<string, string[]> {
    const chainsByType: Record<string, string[]> = {
      evm: [],
      bitcoin: [],
    };

    Object.entries(CHAIN_CONFIGS).forEach(([chainName, config]) => {
      chainsByType[config.type].push(chainName);
    });

    return chainsByType;
  }

  static isEVMChain(chainType: string): boolean {
    const config = CHAIN_CONFIGS[chainType.toLowerCase()];
    return config?.type === "evm";
  }

  static isBitcoinChain(chainType: string): boolean {
    const config = CHAIN_CONFIGS[chainType.toLowerCase()];
    return config?.type === "bitcoin";
  }

  static validateChainType(chainType: string): void {
    if (!CHAIN_CONFIGS[chainType.toLowerCase()]) {
      throw new Error(
        `Unsupported chain type: ${chainType}. Supported chains are: ${ChainFactory.getSupportedChains().join(
          ", ",
        )}`,
      );
    }
  }

  static getConfig(chainType: string): ChainConfig {
    const config = CHAIN_CONFIGS[chainType.toLowerCase()];
    if (!config) {
      throw new Error(`Unsupported chain type: ${chainType}`);
    }
    return config;
  }
}

// Type guard functions for config types
export function isEVMChainConfig(
  config: ChainConfig,
): config is EVMChainConfig {
  return config.type === "evm";
}

export function isBitcoinChainConfig(
  config: ChainConfig,
): config is BitcoinChainConfig {
  return config.type === "bitcoin";
}
