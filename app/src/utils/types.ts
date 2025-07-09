import { PublicKey } from "@solana/web3.js";

/**
 * for inviter:
 *            Accepted
 *          /
 * Invited -
 *          \
 *            Rejected
 *
 * for invitee:
 *              Accepted
 *            /
 * Requested -
 *            \
 *              Rejected
 */

export enum PeerStatus {
  Invited = 0,
  Requested = 1,
  Accepted = 2,
  Rejected = 3,
}

export type Peer = {
  pubkey: PublicKey;
  status: PeerStatus;
};

export type Descriptor = {
  peers: Peer[];
};

export type PeerBorsh = {
  pubkey: Uint8Array;
  status: PeerStatus;
};

export type DescriptorBorsh = {
  peers: PeerBorsh[];
};

export type Message = {
  readonly sender: PublicKey;
  readonly content: string;
  readonly timestamp: Date;
};

export type Chat = {
  readonly wallets: PublicKey[];
  readonly length: number;
  readonly messages: Message[];
};

export type MessageBorsh = {
  readonly sender: Uint8Array;
  readonly content: string;
  readonly timestamp: Uint8Array;
};

export type ChatBorsh = {
  readonly wallets: Uint8Array[];
  readonly length: number;
  readonly messages: MessageBorsh[];
};
