#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { MPCChainSignatures } from "./MPCChainSignatures";

async function main() {
  console.log(chalk.white.bold("Welcome to NEAR MPC Accounts"));
  console.log(
    chalk.gray(
      "Simplifying Cross-Chain Interactions with Secure Multi-Party Computation\n",
    ),
  );

  const app = new MPCChainSignatures();
  await app.initialize();

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

  program
    .version("1.0.0")
    .description(
      chalk.white(
        "NEAR MPC Accounts - Uniting blockchains with secure multi-party computation",
      ),
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
      try {
        if (options.json) {
          // Clear console to ensure clean JSON output
          console.clear();
        } else {
          console.log(chalk.white.bold("Welcome to NEAR MPC Accounts"));
          console.log(
            chalk.gray(
              "Simplifying Cross-Chain Interactions with Secure Multi-Party Computation\n",
            ),
          );
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
      try {
        if (options.json) {
          // Clear console to ensure clean JSON output
          console.clear();
        } else {
          console.log(chalk.white.bold("Welcome to NEAR MPC Accounts"));
          console.log(
            chalk.gray(
              "Simplifying Cross-Chain Interactions with Secure Multi-Party Computation\n",
            ),
          );
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

  program.addHelpText(
    "after",
    `
    ${chalk.cyan("Example usage:")}
        ${chalk.gray("$")} ${chalk.green("near-mpc-accounts generate-address --chain ethereum")}
        ${chalk.gray("$")} ${chalk.green("near-mpc-accounts sign-payload --payload 0123456789abcdef")}

  ${chalk.cyan("For more information, visit:")} ${chalk.underline("https://docs.near.org/concepts/abstraction/chain-signatures")}
  `,
  );

  program.parse(process.argv);
}

main().catch(console.error);
