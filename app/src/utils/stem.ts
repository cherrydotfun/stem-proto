import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  type AccountInfo,
  TransactionInstruction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";

import { createHash } from "crypto";

import * as borsh from "borsh";

const PROGRAM_ID = new PublicKey(
  "BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB"
);
const SEED_DESCRIPTOR = Buffer.from("wallet_descriptor");
const SEED_PRIVATE_CHAT = Buffer.from("privite_chat");

export class Solana {
  connection: Connection;
  static LAMPORTS_PER_SOL: number = LAMPORTS_PER_SOL;

  constructor(rpcUrl: string = "http://localhost:8899") {
    this.connection = new Connection(rpcUrl, {
      wsEndpoint: "ws://localhost:8900",
      commitment: "finalized",
      // commitment: "confirmed",
    });
  }

  async getAccountInfo(publicKey: PublicKey) {
    return await this.connection.getAccountInfo(publicKey);
  }

  balance_sol(accountInfo: AccountInfo<Buffer> | null) {
    return accountInfo ? accountInfo.lamports / LAMPORTS_PER_SOL : 0;
  }
  async requestAirdrop(publicKey: PublicKey) {
    const signature = await this.connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(signature, "confirmed");
  }
  subscribeToProgram(programId: PublicKey) {
    console.log("Subscribing to program", programId.toBase58());
    return this.connection.onProgramAccountChange(programId, (accountInfo) => {
      console.log("Program changed", accountInfo);
    });
  }
  subscribeToAccount(publicKey: PublicKey) {
    console.log("Subscribing to account", publicKey.toBase58());
    return this.connection.onAccountChange(publicKey, (accountInfo, ctx) => {
      console.log("Account changed", accountInfo, ctx);
    });
  }
  subscribeToLogs(publicKey: PublicKey) {
    console.log("Subscribing to logs", publicKey.toBase58());
    return this.connection.onLogs(publicKey, (logs) => {
      console.log("Logs", logs);
    });
  }
}

export const StemHelpers = {
  getDescriptorPda: (publicKey: PublicKey | null) => {
    if (!publicKey) {
      return null;
    }
    const [descriptorPda] = PublicKey.findProgramAddressSync(
      [SEED_DESCRIPTOR, publicKey.toBuffer()],
      PROGRAM_ID
    );
    return descriptorPda;
  },
  getChatHash: (publicKey: PublicKey, peer: PublicKey) => {
    let raw = Buffer.alloc(64);
    for (let i = 0; i < 32; i++) {
      if (publicKey.toBuffer()[i] == peer.toBuffer()[i]) {
        continue;
      }
      if (publicKey.toBuffer()[i] < peer.toBuffer()[i]) {
        publicKey.toBuffer().copy(raw, 0);
        peer.toBuffer().copy(raw, 32);
      } else {
        peer.toBuffer().copy(raw, 0);
        publicKey.toBuffer().copy(raw, 32);
      }
      break;
    }

    return createHash("sha256").update(raw).digest();
  },
  getChatPda: (publicKey: PublicKey, peer: PublicKey) => {
    const [chatPda] = PublicKey.findProgramAddressSync(
      [
        SEED_PRIVATE_CHAT,
        StemHelpers.getChatHash(publicKey, peer).subarray(0, 64),
      ],
      PROGRAM_ID
    );
    console.log("Chat PDA:", chatPda.toBase58());
    return chatPda;
  },
};

const disc = (name: string) =>
  createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);

const PubkeySchema: borsh.Schema = {
  array: { type: "u8", len: 32 },
};

const PeerSchema: borsh.Schema = {
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

const DescriptorSchema: borsh.Schema = {
  struct: {
    peers: { array: { type: PeerSchema } },
  },
};

const MessageSchema: borsh.Schema = {
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

const ChatSchema: borsh.Schema = {
  struct: {
    wallets: { array: { type: PubkeySchema, len: 2 } },
    length: "u32",
    messages: { array: { type: MessageSchema } },
  },
};

type Message = {
  sender: PublicKey;
  content: string;
  timestamp: Date;
};

type Chat = {
  wallets: PublicKey[];
  length: number;
  messages: Message[];
};

export const PeerState = {
  Invited: 0,
  Requested: 1,
  Accepted: 2,
  Rejected: 3,
  0: "Invited",
  1: "Requested",
  2: "Accepted",
  3: "Rejected",
};

export const Stem = {
  async register(wallet: any) {
    const descriptorPda = StemHelpers.getDescriptorPda(wallet.publicKey);

    if (!descriptorPda) {
      throw new Error("Descriptor PDA not generated");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: descriptorPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: disc("register"),
    });
    console.log(ix);
    const tx = new Transaction().add(ix);
    await wallet.signTransaction(tx);
    console.log("✅ PDA initialized");
  },
  deserializeDescriptor: (data: Buffer) => {
    const descriptor = borsh.deserialize(DescriptorSchema, data);
    return descriptor;
  },
  deserializeChat: (data: Buffer) => {
    const chat = borsh.deserialize(ChatSchema, data) as Chat;
    // console.log(chat);
    chat.messages.forEach((message: any) => {
      message.sender = new PublicKey(message.sender);
      message.timestamp = new Date(
        Buffer.from(message.timestamp.slice(0, 4)).readUint32LE() * 1000
      );
      // message.timestamp = new Date(
      //   Buffer.from(message.timestamp.slice(0, 4)).readUint32LE() * 1000
      // );
    });
    return chat;
  },
  async invite(wallet: any, invitee: PublicKey) {
    const inviterPda = StemHelpers.getDescriptorPda(wallet.publicKey);
    const inviteePda = StemHelpers.getDescriptorPda(invitee);

    if (!inviterPda || !inviteePda) {
      throw new Error("Descriptor PDA not generated");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: invitee,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: inviterPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: inviteePda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: disc("invite"),
    });

    const tx = new Transaction().add(ix);
    const signature = await wallet.signTransaction(tx);
    console.log("✅ Invite sent");
    return signature;
  },
  async reject(wallet: any, peer: PublicKey) {
    const mePda = StemHelpers.getDescriptorPda(wallet.publicKey);
    const peerPda = StemHelpers.getDescriptorPda(peer);

    if (!mePda || !peerPda) {
      throw new Error("Descriptor PDA not generated");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: peer,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mePda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: peerPda,
          isSigner: false,
          isWritable: true,
        },
      ],
      data: disc("reject"),
    });

    const tx = new Transaction().add(ix);
    const signature = await wallet.signTransaction(tx);
    console.log("✅ Peer rejected");
    return signature;
  },
  async accept(wallet: any, peer: PublicKey) {
    const mePda = StemHelpers.getDescriptorPda(wallet.publicKey);
    const peerPda = StemHelpers.getDescriptorPda(peer);

    if (!mePda || !peerPda) {
      throw new Error("Descriptor PDA not generated");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: peer,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: mePda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: peerPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: StemHelpers.getChatPda(wallet.publicKey, peer),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        Buffer.from(disc("accept")),
        StemHelpers.getChatHash(wallet.publicKey, peer),
      ]),
    });

    const tx = new Transaction().add(ix);
    const signature = await wallet.signTransaction(tx);
    console.log("✅ Peer accepted");
    return signature;
  },
  async sendMessage(wallet: any, peer: PublicKey, content: string) {
    const chatPda = StemHelpers.getChatPda(wallet.publicKey, peer);

    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(content.length, 0);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: chatPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: Buffer.concat([
        Buffer.from(disc("sendmessage")),
        StemHelpers.getChatHash(wallet.publicKey, peer),
        buf,
        Buffer.from(content),
      ]),
    });

    const tx = new Transaction().add(ix);
    const signature = await wallet.signTransaction(tx);
    console.log("✅ Message sent");
    return signature;
  },
};
