import type { Schema } from "borsh";

export const PubkeySchema: Schema = {
  array: { type: "u8", len: 32 },
};

export const PeerSchema: Schema = {
  struct: {
    pubkey: {
      array: {
        type: "u8",
        len: 32,
      },
    },
    status: "u8",
  },
};

export const DescriptorSchema: Schema = {
  struct: {
    peers: { array: { type: PeerSchema } },
  },
};
