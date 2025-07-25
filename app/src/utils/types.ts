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

export enum GroupPeerStatus {
  Invited = 0,
  Joined = 1,
  Rejected = 2,
  Left = 3,
  Kicked = 4,
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

export type GroupBorsh = {
  account: Uint8Array;
  state: GroupPeerStatus;
};

export type DescriptorBorsh = {
  peers: PeerBorsh[];
  groups: GroupBorsh[];
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


export type ChatListItem = {
  pubkey: PublicKey;
  status: PeerStatus | undefined;
  lastMessage: string | undefined;
  timestamp: Date | undefined;
  lastMessageSender: string | undefined;
}[]

export type ChatList =ChatListItem[];

export type MessageBorsh = {
  readonly sender: Uint8Array;
  readonly content: Uint8Array;
  readonly timestamp: Uint8Array;
};

export type ChatBorsh = {
  readonly wallets: Uint8Array[];
  readonly length: number;
  readonly messages: MessageBorsh[];
};

export type GroupDescriptorBorsh = {
  readonly title: Uint8Array;
  readonly description: Uint8Array;
  readonly image_url: Uint8Array;
  readonly owner: Uint8Array;
  readonly group_type: number;
  readonly state: number;
  readonly members: GroupBorsh[];
  readonly length: number;
  readonly messages: MessageBorsh[];
};