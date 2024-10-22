import { base_decode, base_encode } from "near-api-js/lib/utils/serialize";
import { ec as EC } from "elliptic";
import keccak from "keccak";
import hash from "hash.js";
import bs58check from "bs58check";
import { bech32 } from "bech32";
import { sha3_256 } from "js-sha3";
import { createHash, subtle } from "crypto";
import { ethers } from "ethers";

export function najPublicKeyStrToUncompressedHexPoint(
  najPublicKeyStr: string,
): string {
  return (
    "04" +
    Buffer.from(base_decode(najPublicKeyStr.split(":")[1])).toString("hex")
  );
}

export async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex: string,
  signerId: string,
  path = "",
): Promise<string> {
  const ec = new EC("secp256k1");
  const scalarHex = sha3_256(
    `near-mpc-recovery v0.1.0 epsilon derivation:${signerId},${path}`,
  );

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  const oldPublicKeyPoint = ec.curve.point(x, y);
  const scalarTimesG = ec.g.mul(scalarHex);
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);

  const newX = newPublicKeyPoint.getX().toString("hex").padStart(64, "0");
  const newY = newPublicKeyPoint.getY().toString("hex").padStart(64, "0");

  return "04" + newX + newY;
}

export function compressPublicKey(uncompressedKey: string): string {
  if (uncompressedKey.startsWith("0x")) {
    uncompressedKey = uncompressedKey.slice(2);
  }

  const ec = new EC("secp256k1");
  const key = ec.keyFromPublic(uncompressedKey, "hex");
  const compressedKey = key.getPublic(true, "hex");

  return Buffer.from(compressedKey, "hex").toString("base64");
}

export function uncompressedHexPointToEvmAddress(
  uncompressedHexPoint: string,
): string {
  const address = keccak("keccak256")
    .update(Buffer.from(uncompressedHexPoint.substring(2), "hex"))
    .digest("hex");

  return "0x" + address.substring(address.length - 40);
}

export async function uncompressedHexPointToBtcAddress(
  publicKeyHex: string,
  networkByte: Buffer,
): Promise<string> {
  const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
  const sha256HashOutput = await subtle.digest("SHA-256", publicKeyBytes);
  const ripemd160 = hash
    .ripemd160()
    .update(Buffer.from(sha256HashOutput))
    .digest();
  const networkByteAndRipemd160 = Buffer.concat([
    networkByte,
    Buffer.from(ripemd160),
  ]);
  return bs58check.encode(networkByteAndRipemd160);
}

export const hash160 = (buffer: Buffer): Buffer => {
  const sha256Hash = createHash("sha256").update(buffer).digest();
  try {
    return createHash("rmd160").update(sha256Hash).digest();
  } catch (err) {
    return createHash("ripemd160").update(sha256Hash).digest();
  }
};

export function evmToBech32(evmAddress: string, prefix: string): string {
  if (evmAddress.startsWith("0x")) {
    evmAddress = evmAddress.slice(2);
  }
  const hexBuffer = Buffer.from(evmAddress, "hex");
  const words = bech32.toWords(hexBuffer);
  return bech32.encode(prefix, words);
}

export function bech32ToEvm(bech32Address: string): string {
  const { words } = bech32.decode(bech32Address);
  const hexBuffer = Buffer.from(bech32.fromWords(words));
  const evmAddress = "0x" + hexBuffer.toString("hex");
  return ethers.utils.getAddress(evmAddress);
}
