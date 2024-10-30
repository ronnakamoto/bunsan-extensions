import { program } from "commander";
import chalk from "chalk";
import { MPCChainSignatures } from "./MPCChainSignatures";
import { readFileSync } from "fs";

interface JsonOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface SignatureResponse {
  r: string;
  s: string;
  v: number;
}

interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
}

function logNonJsonOutput(app: MPCChainSignatures): void {
  console.log(chalk.white.bold("Welcome to NEAR MPC Accounts"));
  console.log(
    chalk.gray(
      "Simplifying Cross-Chain Interactions with Secure Multi-Party Computation\n",
    ),
  );

  console.log(chalk.yellow("🔐 NEAR MPC Account Details:"));
  console.log(chalk.yellow("━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(
    chalk.white("📇 NEAR Account ID:"),
    chalk.green(app.getNearAccountId()),
  );
  console.log(
    chalk.white("🏭 MPC Contract ID:"),
    chalk.green(app.getContractId()),
  );
  console.log();
}

function outputJson(data: JsonOutput): void {
  console.log(JSON.stringify(data));
  process.exit(data.success ? 0 : 1);
}

function handleError(error: Error | unknown, isJson: boolean): never {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (isJson) {
    outputJson({
      success: false,
      error: errorMessage,
    });
  } else {
    console.error(chalk.red("\n❌ Error:"), errorMessage);
    process.exit(1);
  }
  throw error; // This will never be reached
}

async function main(): Promise<void> {
  // Remove existing handlers to prevent duplicates
  process.removeAllListeners("uncaughtException");
  process.removeAllListeners("unhandledRejection");

  program
    .version("1.0.0")
    .description(
      "NEAR MPC Accounts - Uniting blockchains with secure multi-party computation",
    );

  program
    .command("generate-address")
    .description("Generate a blockchain address using MPC")
    .requiredOption(
      "--chain <chain>",
      "Specify the blockchain (e.g., ethereum, bitcoin)",
    )
    .option("-i, --index <number>", "Index for path generation (e.g., 1,2,3)")
    .option("--json", "Output the result as JSON")
    .action(async (options: any) => {
      const app = new MPCChainSignatures(options.json);

      try {
        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan(`\nGenerating ${options.chain} address...`));
        }

        const address = await app.generateAddress(options.chain, {
          index: options.index ? parseInt(options.index) : undefined,
        });

        if (options.json) {
          outputJson({
            success: true,
            data: address,
          });
        } else {
          console.log(chalk.green("\n✅ Address generated successfully!"));
          console.log(
            chalk.white("\n🔑 Your new address:"),
            chalk.yellow(address),
          );
          process.exit(0);
        }
      } catch (error) {
        handleError(error, Boolean(options.json));
      }
    });

  program
    .command("sign-payload")
    .description("Sign a payload using NEAR MPC")
    .requiredOption(
      "--payload <payload>",
      "Specify the payload to sign (in hexadecimal)",
    )
    .option("--json", "Output the result as JSON")
    .action(async (options: { payload: string; json?: boolean }) => {
      const app = new MPCChainSignatures(options.json);

      try {
        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan("\nSigning payload..."));
        }

        const signature = await app.signPayload(options.payload);

        if (!signature) {
          throw new Error("Failed to sign payload");
        }

        if (options.json) {
          outputJson({
            success: true,
            data: {
              signature: {
                r: signature.r,
                s: signature.s,
                v: signature.v,
              },
            },
          });
        } else {
          console.log(chalk.green("\n✅ Payload signed successfully!"));
          console.log(chalk.white("\n📝 Signature details:"));
          console.log(chalk.yellow("  r:"), signature.r);
          console.log(chalk.yellow("  s:"), signature.s);
          console.log(chalk.yellow("  v:"), signature.v);
          process.exit(0);
        }
      } catch (error) {
        handleError(error, Boolean(options.json));
      }
    });

  program
    .command("deploy-contract")
    .description("Deploy a smart contract")
    .requiredOption("-c, --chain <chain>", "Chain to deploy the contract on")
    .requiredOption(
      "-b, --bytecode <path>",
      "Path to bytecode file or hex string",
    )
    .requiredOption("-a, --abi <path>", "Path to ABI file or JSON string")
    .requiredOption("-f, --from <address>", "From address")
    .option("-i, --index <number>", "Index for path generation")
    .option("--json", "Output in JSON format")
    .option("--no-confirmation", "Do not wait for transaction confirmation")
    .option("--constructor-args [args...]", "Constructor arguments")
    .action(async (options) => {
      try {
        const mpc = new MPCChainSignatures(options.json || false);

        const result = await mpc.deployContract(
          options.chain,
          options.bytecode,
          options.abi,
          options.from,
          {
            waitForConfirmation: options.confirmation !== false,
            index: options.index ? parseInt(options.index) : undefined,
          },
          options.constructorArgs || [],
        );

        // The result handling is now managed by the ContractDeployer class
      } catch (error) {
        // Error handling is now managed by the ContractDeployer class
        process.exit(1);
      }
    });

  program
    .command("send-bitcoin")
    .description("Send a Bitcoin transaction")
    .requiredOption(
      "-c, --chain <chain>",
      "Chain to use (bitcoin or bitcoin-testnet)",
    )
    .requiredOption("-f, --from <address>", "Sender's address")
    .requiredOption("-t, --to <address>", "Recipient's address")
    .requiredOption("-a, --amount <amount>", "Amount in satoshis")
    .requiredOption("-p, --public-key <key>", "Sender's public key")
    .option("--json", "Output the result as JSON")
    .action(async (options) => {
      try {
        const mpcChainSignatures = new MPCChainSignatures(options.json);

        await mpcChainSignatures.sendBitcoinTransaction(options.chain, {
          from: options.from,
          to: options.to,
          amount: parseInt(options.amount),
          publicKey: options.publicKey,
        });
      } catch (error) {
        if (!options.json) {
          console.error("\n❌ Error:", error.message);
        }
        process.exit(1);
      }
    });

  program
    .command("contract-call")
    .description("Call a smart contract method")
    .requiredOption("-c, --chain <chain>", "Chain to call the contract on")
    .requiredOption("-t, --to <address>", "Contract address")
    .requiredOption("-f, --from <address>", "From address")
    .requiredOption("-m, --method <name>", "Method name to call")
    .requiredOption("-a, --abi <path>", "Path to ABI file or JSON string")
    .option("-i, --index <number>", "Index for path generation")
    .option("-v, --value <amount>", "ETH value to send (in wei)")
    .option("-g, --gas-limit <limit>", "Custom gas limit")
    .option("--args [args...]", "Method arguments")
    .option("--json", "Output in JSON format")
    .action(async (options) => {
      const app = new MPCChainSignatures(options.json);

      try {
        // Parse ABI
        let abi: any[];
        try {
          abi = options.abi.endsWith(".json")
            ? JSON.parse(readFileSync(options.abi, "utf8"))
            : JSON.parse(options.abi);
        } catch (error) {
          throw new Error(`Failed to parse ABI: ${error.message}`);
        }

        // Parse arguments if provided
        const args = options.args?.map((arg: string) => {
          // Try to parse numbers and booleans
          if (arg.toLowerCase() === "true") return true;
          if (arg.toLowerCase() === "false") return false;
          if (/^\d+$/.test(arg)) return Number(arg);
          return arg;
        });

        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan("\nCalling contract method..."));
          console.log(chalk.white("Contract:"), chalk.yellow(options.to));
          console.log(chalk.white("Method:"), chalk.yellow(options.method));
          console.log(chalk.white("From:"), chalk.yellow(options.from));
          if (args) {
            console.log(chalk.white("Arguments:"), chalk.yellow(args));
          }
          if (options.value) {
            console.log(
              chalk.white("Value:"),
              chalk.yellow(options.value),
              "wei",
            );
          }
        }

        const result = await app.callContract(options.chain, {
          to: options.to as `0x${string}`,
          from: options.from as `0x${string}`,
          method: options.method,
          args: args || [],
          abi,
          value: options.value ? BigInt(options.value) : undefined,
          gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined,
          index: options.index ? parseInt(options.index) : undefined,
        });

        if (options.json) {
          outputJson({
            success: true,
            data: result,
          });
        } else {
          console.log(chalk.green("\n✅ Contract call successful!"));
          console.log(chalk.white("\n📝 Transaction Details:"));
          console.log(chalk.white("Hash:"), chalk.yellow(result.hash));
          console.log(
            chalk.white("Explorer URL:"),
            chalk.yellow(result.explorerUrl),
          );
          process.exit(0);
        }
      } catch (error) {
        handleError(error, Boolean(options.json));
      }
    });

  // Single handlers for uncaught errors
  process.on("uncaughtException", (error: Error) => {
    handleError(error, process.argv.includes("--json"));
  });

  process.on("unhandledRejection", (reason: unknown) => {
    handleError(
      reason instanceof Error ? reason : new Error(String(reason)),
      process.argv.includes("--json"),
    );
  });

  await program.parseAsync(process.argv);
}

// Start the program
void main().catch((error: unknown) => {
  handleError(error, process.argv.includes("--json"));
});
