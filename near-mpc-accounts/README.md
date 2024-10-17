# NEAR MPC Accounts Bunsan Extension

NEAR MPC Accounts is a powerful extension for Bunsan that leverages Multi-Party Computation (MPC) to enable secure cross-chain interactions on the NEAR Protocol. This extension provides both CLI commands and HTTP endpoints for seamless integration with Bunsan.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [CLI Usage](#cli-usage)
  - [HTTP Endpoints](#http-endpoints)
- [Configuration](#configuration)
- [Commands and Endpoints](#commands-and-endpoints)
- [License](#license)

## Features

- Generate blockchain addresses using MPC
- Sign payloads securely with NEAR MPC
- Support for multiple blockchain networks
- User-friendly CLI
- HTTP endpoints for easy integration with web services

## Installation

To install the NEAR MPC Accounts extension for Bunsan, use the Bunsan CLI:

```bash
bunsan install-extension near-mpc-accounts
```

## Usage

### CLI Usage

After installation, you can use the Bunsan CLI to run the extension commands:

```bash
bunsan run-extension near-mpc-accounts -- [command] [options]
```

### HTTP Endpoints

Once the extension is installed, Bunsan automatically generates HTTP endpoints for each command. You can access these endpoints at:

```
http://localhost:8080/extensions/near-mpc-accounts/[endpoint]
```

Replace `[endpoint]` with the specific command endpoint (e.g., `/generate-address` or `/sign-payload`).

## Configuration

Configuration keys would be automatically added to Bunsan's `config.toml` once the extension is installed. Before using NEAR MPC Accounts, you need to set up your environment variables in the Bunsan configuration. Add the following to your `config.toml` file:

```toml
[extensions.near-mpc-accounts]
NEAR_ACCOUNT_ID = "your_near_account_id"
NEAR_PRIVATE_KEY = "your_near_private_key"
MPC_PATH = "your_mpc_path"
MPC_CONTRACT_ID = "your_mpc_contract_id"
MPC_PUBLIC_KEY = "your_mpc_public_key"
NEAR_PROXY_ACCOUNT = "true_or_false"
NEAR_PROXY_CONTRACT = "true_or_false"
NEAR_PROXY_ACCOUNT_ID = "your_near_proxy_account_id"
NEAR_PROXY_PRIVATE_KEY = "your_near_proxy_private_key"
```

Replace the placeholder values with your actual NEAR account and MPC configuration details.

## Commands and Endpoints

### Generate Address

Generate a blockchain address using MPC:

CLI:
```bash
bunsan run-extension near-mpc-accounts -- generate-address <chain>
```

HTTP:
```
POST /extensions/near-mpc-accounts/generate-address
Content-Type: application/json

{
  "chain": "<chain>"
}
```

Replace `<chain>` with the desired blockchain (e.g., `ethereum`, `bitcoin`).

### Sign Payload

Sign a payload using NEAR MPC:

CLI:
```bash
bunsan run-extension near-mpc-accounts -- sign-payload <payload>
```

HTTP:
```
POST /extensions/near-mpc-accounts/sign-payload
Content-Type: application/json

{
  "payload": "<payload>"
}
```

Replace `<payload>` with the hexadecimal payload you want to sign.

## Credits

Inspired by - [Chainsig Script](https://github.com/near-examples/chainsig-script)

## License

NEAR MPC Accounts Bunsan Extension is released under the [MIT License](LICENSE).

---

For more information about NEAR Protocol and MPC, visit the [official NEAR documentation](https://docs.near.org).
For Bunsan documentation and support, visit [Bunsan's Wiki Page](https://github.com/ronnakamoto/bunsan/wiki).
