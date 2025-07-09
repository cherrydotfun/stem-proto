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

export const MessageSchema: Schema = {
  struct: {
    sender: {
      array: {
        type: "u8",
        len: 32,
      },
    },
    content: "string",
    timestamp: {
      array: {
        type: "u8",
        len: 8,
      },
    },
  },
};

export const ChatSchema: Schema = {
  struct: {
    wallets: { array: { type: PubkeySchema, len: 2 } },
    length: "u32",
    messages: { array: { type: MessageSchema } },
  },
};
