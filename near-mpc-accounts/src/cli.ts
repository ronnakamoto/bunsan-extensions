#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { MPCChainSignatures } from "./MPCChainSignatures";

function logNonJsonOutput(app) {
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

async function main() {
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
    .action(async (options) => {
      const app = new MPCChainSignatures(options.json);
      await app.initialize();

      try {
        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan(`\nGenerating ${options.chain} address...`));
        }

        const address = await app.generateAddress(options.chain);

        if (options.json) {
          console.log(JSON.stringify({ address }));
        } else {
          console.log(chalk.green("\n✅ Address generated successfully!"));
          console.log(
            chalk.white("\n🔑 Your new address:"),
            chalk.yellow(address),
          );
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: error.message }));
        } else {
          console.error(chalk.red("\n❌ Error generating address:"), error);
        }
        process.exit(1);
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
    .action(async (options) => {
      const app = new MPCChainSignatures(options.json);
      await app.initialize();

      try {
        if (!options.json) {
          logNonJsonOutput(app);
          console.log(chalk.cyan("\nSigning payload..."));
        }

        const signature = await app.signPayload(options.payload);

        if (options.json) {
          console.log(JSON.stringify(signature));
        } else {
          if (signature) {
            console.log(chalk.green("\n✅ Payload signed successfully!"));
            console.log(chalk.white("\n📝 Signature details:"));
            console.log(chalk.yellow("  r:"), signature.r);
            console.log(chalk.yellow("  s:"), signature.s);
            console.log(chalk.yellow("  v:"), signature.v);
          } else {
            console.log(chalk.red("\n❌ Failed to sign payload"));
          }
        }
      } catch (error) {
        if (options.json) {
          console.log(JSON.stringify({ error: error.message }));
        } else {
          console.error(chalk.red("\n❌ Error signing payload:"), error);
        }
        process.exit(1);
      }
    });

  program.parse(process.argv);
}

main().catch(console.error);
