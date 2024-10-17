# NEAR MPC Accounts

NEAR MPC Accounts is a powerful command-line interface (CLI) tool that leverages Multi-Party Computation (MPC) to enable secure cross-chain interactions on the NEAR Protocol.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Commands](#commands)
- [Contributing](#contributing)
- [License](#license)

## Features

- Generate blockchain addresses using MPC
- Sign payloads securely with NEAR MPC
- Support for multiple blockchain networks
- User-friendly CLI with colorful output

## Installation

To install NEAR MPC Accounts, you need Node.js (version 18 or later) and npm installed on your system.

```bash
npm install
```

## Usage

After installation, you can use the `npm start` command to interact with the tool:

```bash
npm start -- [command] [options]
```

## Configuration

Before using NEAR MPC Accounts, you need to set up your environment variables. Create a `.env` file in your project root with the following contents:

```env
NEAR_ACCOUNT_ID=your_near_account_id
NEAR_PRIVATE_KEY=your_near_private_key
MPC_PATH=your_mpc_path
MPC_CONTRACT_ID=your_mpc_contract_id
MPC_PUBLIC_KEY=your_mpc_public_key
NEAR_PROXY_ACCOUNT=true_or_false
NEAR_PROXY_CONTRACT=true_or_false
NEAR_PROXY_ACCOUNT_ID=your_near_proxy_account_id
NEAR_PROXY_PRIVATE_KEY=your_near_proxy_private_key
```

Replace the placeholder values with your actual NEAR account and MPC configuration details.

## Commands

### Generate Address

Generate a blockchain address using MPC:

```bash
near-mpc-accounts generate-address <chain>
```

Replace `<chain>` with the desired blockchain (e.g., `ethereum`, `bitcoin`).

### Sign Payload

Sign a payload using NEAR MPC:

```bash
near-mpc-accounts sign-payload <payload>
```

Replace `<payload>` with the hexadecimal payload you want to sign.

## Credits

Inspired by - [Chainsig Script](https://github.com/near-examples/chainsig-script)

## License

NEAR MPC Accounts is released under the [MIT License](LICENSE).

---

For more information about NEAR Protocol and MPC, visit the [official NEAR documentation](https://docs.near.org).
