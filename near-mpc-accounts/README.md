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
bunsan run-extension near-mpc-accounts -- generate-address --chain <chain> [--json]
```

HTTP:
```
POST /extensions/near-mpc-accounts/generate-address
Content-Type: application/json

{
  "chain": "<chain>",
  "json": true
}
```

Replace `<chain>` with the desired blockchain (e.g., `ethereum`, `bitcoin`).
The `--json` flag (CLI) or `"json": true` (HTTP) is optional (**required** for HTTP endpoint in Bunsan) and will return the result in JSON format.

### Sign Payload

Sign a payload using NEAR MPC:

CLI:
```bash
bunsan run-extension near-mpc-accounts -- sign-payload --payload <payload> [--json]
```

HTTP:
```
POST /extensions/near-mpc-accounts/sign-payload
Content-Type: application/json

{
  "payload": "<payload>",
  "json": true
}
```

Replace `<payload>` with the hexadecimal payload you want to sign.

### Deploy Contract
Deploy a contract to a smart contract supported chain like Aurora, Ethereum, Sepolia.

CLI:
```bash
bunsan run-extension near-mpc-accounts deploy-contract \
  --chain <chain> \
  --from <address> \
  --bytecode <bytecode_path_or_hex> \
  --abi <abi_path_or_json> \
  --json
```

HTTP:
```
POST /extensions/near-mpc-accounts/deploy-contract
Content-Type: application/json

{
  "chain": "ethereum",
  "from": "0x...",
  "bytecode": "0x...",
  "abi": "[...]",
  "constructorArgs": [],
  "waitForConfirmation": true,
  "json": true
}
```

### Send ETH

Send ETH or other native tokens on EVM chains

CLI:
```bash
bunsan run-extension near-mpc-accounts -- send-eth \
  --chain <chain> \
  --from <address> \
  --to <address> \
  --value <amount_in_wei> \
  [--gas-limit <limit>] \
  [--gas-price <price_in_wei>] \
  [--index <number>] \
  [--json]
```

HTTP:

```
POST /extensions/near-mpc-accounts/send-eth
Content-Type: application/json

{
  "chain": "ethereum",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "gasLimit": "21000",
  "gasPrice": "20000000000",
  "index": 0,
  "json": true
}
```
Note: The value is in wei (1 ETH = 1000000000000000000 wei)

### Send Bitcoin

Send Bitcoin transactions

CLI:

```bash
bunsan run-extension near-mpc-accounts -- send-bitcoin \
  --chain <bitcoin|bitcoin-testnet> \
  --from <address> \
  --to <address> \
  --amount <amount_in_satoshis> \
  --public-key <key> \
  [--json]
```

HTTP:

```
POST /extensions/near-mpc-accounts/send-bitcoin
Content-Type: application/json

{
  "chain": "bitcoin-testnet",
  "from": "...",
  "to": "...",
  "amount": 100000,
  "publicKey": "...",
  "json": true
}
```

### Contract Call
Call a smart contract method

CLI:

```bash
bunsan run-extension near-mpc-accounts -- contract-call \
  --chain <chain> \
  --to <contract_address> \
  --from <sender_address> \
  --method <method_name> \
  --abi <abi_path_or_json> \
  [--args ...args] \
  [--value <amount_in_wei>] \
  [--gas-limit <limit>] \
  [--index <number>] \
  [--json]
```

HTTP:

```
POST /extensions/near-mpc-accounts/contract-call
Content-Type: application/json

{
  "chain": "ethereum",
  "to": "0x...",
  "from": "0x...",
  "method": "transfer",
  "abi": "[...]",
  "args": ["0x...", "1000"],
  "value": "0",
  "gasLimit": "100000",
  "index": 0,
  "json": true
}
```

## Credits

Inspired by - [Chainsig Script](https://github.com/near-examples/chainsig-script)

## License

NEAR MPC Accounts Bunsan Extension is released under the [MIT License](LICENSE).

---

For more information about NEAR Protocol and MPC, visit the [official NEAR documentation](https://docs.near.org).
For Bunsan documentation and support, visit [Bunsan's Wiki Page](https://github.com/ronnakamoto/bunsan/wiki).
