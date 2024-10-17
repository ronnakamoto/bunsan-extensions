import dotenv from "dotenv";

dotenv.config();

export const NEAR_ACCOUNT_ID = process.env.NEAR_ACCOUNT_ID!;
export const NEAR_PRIVATE_KEY = process.env.NEAR_PRIVATE_KEY!;
export const MPC_PATH = process.env.MPC_PATH!;
export const MPC_CONTRACT_ID = process.env.MPC_CONTRACT_ID!;
export const MPC_PUBLIC_KEY = process.env.MPC_PUBLIC_KEY!;
export const NEAR_PROXY_ACCOUNT = process.env.NEAR_PROXY_ACCOUNT;
export const NEAR_PROXY_CONTRACT = process.env.NEAR_PROXY_CONTRACT;
export const NEAR_PROXY_ACCOUNT_ID = process.env.NEAR_PROXY_ACCOUNT_ID;
export const NEAR_PROXY_PRIVATE_KEY = process.env.NEAR_PROXY_PRIVATE_KEY;

if (
  !NEAR_ACCOUNT_ID ||
  !NEAR_PRIVATE_KEY ||
  !MPC_PATH ||
  !MPC_CONTRACT_ID ||
  !MPC_PUBLIC_KEY
) {
  console.error("Please set all required environment variables.");
  process.exit(1);
}
