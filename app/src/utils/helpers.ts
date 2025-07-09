import { PublicKey } from "@solana/web3.js";

export const copyKey = async (publicKey: PublicKey) => {
  try {
    await navigator.clipboard.writeText(publicKey?.toBase58() || "");
    // alert("Key copied to clipboard");
  } catch (err) {
    console.error("Error copying:", err);
    alert("Failed to copy key");
  }
};