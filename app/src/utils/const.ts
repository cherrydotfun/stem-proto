import { PublicKey } from "@solana/web3.js";
import { Buffer } from 'buffer';

export const PROGRAM_ID = new PublicKey(
  "68DEzyuChhLYQjR8Ymo88JWRUh5hrPhuWHWMLBFGHzHC"
);
export const SEED_DESCRIPTOR = Buffer.from("wallet_descriptor");
export const SEED_PRIVATE_CHAT = Buffer.from("privite_chat");
export const SEED_GROUP_DESCRIPTOR = Buffer.from("group_descriptor");

export const WALLET_DESCRIPTOR_VERSION = Buffer.from([1]);
export const PRIVATE_CHAT_VERSION = Buffer.from([1]);
