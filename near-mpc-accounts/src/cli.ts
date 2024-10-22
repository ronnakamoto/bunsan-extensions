import { program } from "commander";
import chalk from "chalk";
import { MPCChainSignatures } from "./MPCChainSignatures";

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
    .option("--json", "Output the result as JSON")
    .action(async (options: { chain: string; json?: boolean }) => {
      const app = new MPCChainSignatures(options.json);

      try {
        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan(`\nGenerating ${options.chain} address...`));
        }

        const address = await app.generateAddress(options.chain);

        if (options.json) {
          outputJson({
            success: true,
            data: { address },
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
    .description("Deploy a smart contract using NEAR MPC")
    .requiredOption("--chain <chain>", "Specify the target blockchain")
    .requiredOption("--from <address>", "Address to deploy from")
    .requiredOption(
      "--bytecode <bytecode>",
      "Contract bytecode (hexadecimal) or path to .bin file",
    )
    .requiredOption(
      "--abi <abi>",
      "Contract ABI (JSON string) or path to .json file",
    )
    .option("--args <args>", "Constructor arguments as JSON array")
    .option("--json", "Output the result as JSON")
    .action(async (options) => {
      const jsonOutput = Boolean(options.json);
      const app = new MPCChainSignatures(jsonOutput);

      try {
        const constructorArgs = options.args ? JSON.parse(options.args) : [];

        if (!options.json) {
          logNonJsonOutput(app);
          console.log(
            chalk.cyan(`\nDeploying contract to ${options.chain}...`),
          );
        }

        const result = await app.deployContract(
          options.chain,
          options.bytecode,
          options.abi,
          options.from,
          constructorArgs,
        );

        if (options.json) {
          outputJson({
            success: true,
            data: {
              contractAddress: result.contractAddress,
              transactionHash: result.transactionHash,
            },
          });
        } else {
          console.log(chalk.green("\n✅ Contract deployed successfully!"));
          console.log(
            chalk.white("\n📄 Contract address:"),
            chalk.yellow(result.contractAddress),
          );
          console.log(
            chalk.white("📝 Transaction hash:"),
            chalk.yellow(result.transactionHash),
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
