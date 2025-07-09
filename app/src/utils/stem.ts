import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { createHash } from "crypto";
import * as borsh from "borsh";
import { EventEmitter } from "events";

import { Account, Connection } from "./solana";
import { ChatSchema, DescriptorSchema } from "./schemas";
import type { DescriptorBorsh, ChatBorsh } from "./types";
import { PeerStatus } from "./types";

import { PROGRAM_ID, SEED_DESCRIPTOR, SEED_PRIVATE_CHAT } from "./const";


export const helpers = {
  getdisc: (name: string) =>
    createHash("sha256").update(`global:${name}`).digest().subarray(0, 8),

  getDescriptorPda: (publicKey: PublicKey) => {
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
      [SEED_PRIVATE_CHAT, helpers.getChatHash(publicKey, peer).subarray(0, 64)],
      PROGRAM_ID
    );
    return chatPda;
  },
};

type PeerAccount = {
  account: Account | null;
  status: PeerStatus;
};

export class Stem {
  private _publicKey: PublicKey;
  private _connection: Connection;
  private _descriptorAccount: Account;
  private _chatsAccounts: Map<string, PeerAccount>;
  private _isRegistered: boolean;
  private _isLoaded: boolean;
  private _subscribe: boolean;

  private _emitter: EventEmitter = new EventEmitter();

  constructor(
    publicKey: PublicKey,
    connection: Connection,
    subscribe: boolean = false
  ) {
    this._publicKey = publicKey;
    this._connection = connection;
    this._subscribe = subscribe;
    this._descriptorAccount = new Account(
      helpers.getDescriptorPda(this._publicKey),
      this._connection.connection,
      this._subscribe
    );
    this._chatsAccounts = new Map();
    this._isRegistered = false;
    this._isLoaded = false;

    // bind
    console.log("Binding _parseAndUpdatePeers");
    this._parseAndUpdatePeers = this._parseAndUpdatePeers.bind(this);
  }

  get isLoaded() {
    return this._isLoaded;
  }

  get isRegistered() {
    if (!this._isLoaded) {
      throw new Error("Peer is not loaded");
    }
    return this._isRegistered;
  }

  async _parseAndUpdatePeers() {
    console.log("Stem._parseAndUpdatePeers()");

    let statusUpdated = false;
    let chatListUpdated = false;

    if (!this._descriptorAccount || !this._descriptorAccount.isInitialized) {
      if (this._isRegistered) {
        statusUpdated = true;
      }
      this._isRegistered = false;
    } else {
      if (!this._isRegistered) {
        statusUpdated = true;
      }
      this._isRegistered = true;
    }

    if (this._descriptorAccount.isInitialized) {
      const chats = borsh.deserialize(
        DescriptorSchema,
        this._descriptorAccount.data.subarray(8)
      ) as DescriptorBorsh;

      for (const peer of chats.peers) {
        const peerPubKey = new PublicKey(peer.pubkey);
        const peerPubKeyString = peerPubKey.toBase58();
        const obj = this._chatsAccounts.get(peerPubKeyString);
        // ??
        if (!obj) {
          this._chatsAccounts.set(peerPubKeyString, {
            account: null,
            status: peer.status,
          });
          chatListUpdated = true;
        }

        // only accepted peer has chat account
        if (peer.status === PeerStatus.Accepted && !obj?.account) {
          const account = new Account(
            helpers.getChatPda(this._publicKey, peerPubKey),
            this._connection.connection,
            this._subscribe
          );
          if (this._subscribe) {
            account.onUpdate(() => {
              console.log("STEM: Chat updated", account.data);
              this._emitter.emit("onChatUpdated", {
                pubkey: peerPubKey,
                chat: this._parseChat(account),
              });
            });
          }

          account.fetch();
          this._chatsAccounts.set(peerPubKeyString, {
            account,
            status: peer.status,
          });

          chatListUpdated = true;
        } else {
          const peerAccount = this._chatsAccounts.get(peerPubKeyString);
          if (!peerAccount || peerAccount.status !== peer.status) {
            this._chatsAccounts.set(peerPubKeyString, {
              account: null,
              status: peer.status,
            });
            chatListUpdated = true;
          }
        }
      }
    }

    if (chatListUpdated) {
      console.log("STEM: Chat list updated");
      this._emitter.emit("onChatsUpdated", this._chatsAccounts);
    }
    if (statusUpdated) {
      console.log("STEM: Status updated");
      this._emitter.emit("onStatusUpdated", this._isRegistered);
    }

    return chatListUpdated;
  }

  async init() {
    // load descriptor account
    await this._descriptorAccount.fetch();
    await this._parseAndUpdatePeers();

    if (this._subscribe) {
      this._descriptorAccount.onUpdate(this._parseAndUpdatePeers);
    }

    // load chats accounts

    this._isLoaded = true;
    return this;
  }

  get chats() {
    return Array.from(this._chatsAccounts.keys()).map((pubKeyString) => {
      const pubKey = new PublicKey(pubKeyString);
      return {
        pubkey: pubKey,
        status: this._chatsAccounts.get(pubKeyString)?.status,
      };
    });
  }

  _parseChat(account: Account) {
    const chat = borsh.deserialize(
      ChatSchema,
      account.data.subarray(8)
    ) as ChatBorsh;
    // debugger;
    return {
      wallets: chat.wallets.map((wallet) => new PublicKey(wallet)),
      length: chat.length,
      messages: chat.messages.map((message) => ({
        sender: new PublicKey(message.sender),
        content: message.content,
        timestamp: new Date(
          Buffer.from(message.timestamp.slice(0, 4)).readUint32LE() * 1000
        ),
      })),
    };
  }

  getChat(pubkey: PublicKey) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }
    if (!this._isRegistered) {
      throw Error("Account is not registered");
    }

    const peerAccount = this._chatsAccounts.get(pubkey.toBase58());

    if (!peerAccount) {
      return null;
    }

    return peerAccount?.account ? this._parseChat(peerAccount.account) : null;
  }

  on(event: string, callback: (...args: any[]) => void) {
    this._emitter.on(event, callback);
  }

  // Programm calls
  // Register
  // Invite
  // Accept
  // Reject
  // send message

  async createRegisterTx() {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (this._isRegistered) {
      throw Error("Stem Account already registred");
    }

    const descriptorPda = helpers.getDescriptorPda(this._publicKey);

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
          pubkey: this._publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: helpers.getdisc("register"),
    });

    const tx = new Transaction().add(ix);

    return tx;
  }
  async createInviteTx(invitee: PublicKey) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Stem Account not registred");
    }

    if (this._chatsAccounts.get(invitee.toBase58())?.status) {
      throw Error("Peer already invited");
    }

    const inviterPda = helpers.getDescriptorPda(this._publicKey);
    const inviteePda = helpers.getDescriptorPda(invitee);

    if (!inviterPda || !inviteePda) {
      throw new Error("Descriptor PDA not generated");
    }
    if (this._publicKey.toBase58() === invitee.toBase58()) {
      throw new Error("You can't invite yourself");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
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
      data: helpers.getdisc("invite"),
    });

    const tx = new Transaction().add(ix);
    return tx;
  }
  async createAcceptTx(invitee: PublicKey) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Stem Account not registred");
    }

    if (
      this._chatsAccounts.get(invitee.toBase58())?.status !==
      PeerStatus.Requested
    ) {
      throw Error("Peer not invited");
    }

    const inviterPda = helpers.getDescriptorPda(this._publicKey);
    const inviteePda = helpers.getDescriptorPda(invitee);

    if (!inviterPda || !inviteePda) {
      throw new Error("Descriptor PDA not generated");
    }

    if (this._publicKey.toBase58() === invitee.toBase58()) {
      throw new Error("You can't invite yourself");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
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
          pubkey: helpers.getChatPda(this._publicKey, invitee),
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
        Buffer.from(helpers.getdisc("accept")),
        helpers.getChatHash(this._publicKey, invitee),
      ]),
    });

    const tx = new Transaction().add(ix);
    return tx;
  }
  async createRejectTx(invitee: PublicKey) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Stem Account not registred");
    }

    if (
      this._chatsAccounts.get(invitee.toBase58())?.status !==
      PeerStatus.Requested
    ) {
      throw Error("Peer not invited");
    }

    const inviterPda = helpers.getDescriptorPda(this._publicKey);
    const inviteePda = helpers.getDescriptorPda(invitee);

    if (!inviterPda || !inviteePda) {
      throw new Error("Descriptor PDA not generated");
    }

    if (this._publicKey.toBase58() === invitee.toBase58()) {
      throw new Error("You can't invite yourself");
    }

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
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
      ],
      data: helpers.getdisc("reject"),
    });

    const tx = new Transaction().add(ix);
    return tx;
  }
  async createSendMessageTx(invitee: PublicKey, message: string) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Stem Account not registred");
    }

    if (
      this._chatsAccounts.get(invitee.toBase58())?.status !==
      PeerStatus.Accepted
    ) {
      throw Error("Peer not invited");
    }

    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(message.length, 0);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: helpers.getChatPda(this._publicKey, invitee),
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
        Buffer.from(helpers.getdisc("sendmessage")),
        helpers.getChatHash(this._publicKey, invitee),
        buf,
        Buffer.from(message),
      ]),
    });

    const tx = new Transaction().add(ix);
    return tx;
  }
}
