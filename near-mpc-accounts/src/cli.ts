#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { MPCChainSignatures } from "./MPCChainSignatures";

const ASCII_ART = `
 _   _ _____    _    ____    __  __ ____   ____
| \\ | | ____|  / \\  |  _ \\  |  \\/  |  _ \\ / ___|
|  \\| |  _|   / _ \\ | |_) | | |\\/| | |_) | |
| |\\  | |___ / ___ \\|  _ <  | |  | |  __/| |___
|_| \\_|_____/_/   \\_\\_| \\_\\ |_|  |_|_|    \\____|
                 _    ____ ____ ___  _   _ _   _ _____ ____
                / \\  / ___/ ___/ _ \\| | | | \\ | |_   _/ ___|
               / _ \\| |  | |  | | | | | | |  \\| | | | \\___ \\
              / ___ \\ |__| |__| |_| | |_| | |\\  | | |  ___) |
             /_/   \\_\\____\\____\\___/ \\___/|_| \\_| |_| |____/
`;

async function main() {
  console.log(chalk.cyan(ASCII_ART));

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
    .command("generate-address <chain>")
    .description("Generate a blockchain address using MPC")
    .action(async (chain: string) => {
      try {
        console.log(chalk.cyan(`\nGenerating ${chain} address...`));
        const address = await app.generateAddress(chain);
        console.log(chalk.green("\n✅ Address generated successfully!"));
        console.log(
          chalk.white("\n🔑 Your new address:"),
          chalk.yellow(address),
        );
      } catch (error) {
        console.error(chalk.red("\n❌ Error generating address:"), error);
      }
    });

  program
    .command("sign-payload <payload>")
    .description("Sign a payload using NEAR MPC")
    .action(async (payload: string) => {
      try {
        console.log(chalk.cyan("\nSigning payload..."));
        const signature = await app.signPayload(payload);
        if (signature) {
          console.log(chalk.green("\n✅ Payload signed successfully!"));
          console.log(chalk.white("\n📝 Signature details:"));
          console.log(chalk.yellow("  r:"), signature.r);
          console.log(chalk.yellow("  s:"), signature.s);
          console.log(chalk.yellow("  v:"), signature.v);
        } else {
          console.log(chalk.red("\n❌ Failed to sign payload"));
        }
      } catch (error) {
        console.error(chalk.red("\n❌ Error signing payload:"), error);
      }
    });

  program.addHelpText(
    "after",
    `
  ${chalk.cyan("Example usage:")}
    ${chalk.gray("$")} ${chalk.green("near-mpc-accounts generate-address ethereum")}
    ${chalk.gray("$")} ${chalk.green("near-mpc-accounts sign-payload 0123456789abcdef")}

  ${chalk.cyan("For more information, visit:")} ${chalk.underline("https://docs.near.org/concepts/abstraction/chain-signatures")}
  `,
  );

  program.parse(process.argv);
}

main().catch(console.error);
