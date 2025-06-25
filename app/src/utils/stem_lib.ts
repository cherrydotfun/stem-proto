import { PublicKey } from "@solana/web3.js";
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

  private _emitter: EventEmitter = new EventEmitter();

  constructor(publicKey: PublicKey, connection: Connection) {
    this._publicKey = publicKey;
    this._connection = connection;
    this._descriptorAccount = new Account(
      helpers.getDescriptorPda(this._publicKey),
      this._connection.connection,
      true
    );
    this._chatsAccounts = new Map();
    this._isRegistered = false;
    this._isLoaded = false;

    // bind
    console.log("Binding _parseAndUpdatePeers");
    this._parseAndUpdatePeers = this._parseAndUpdatePeers.bind(this);
  }

  get isRegistered() {
    if (!this._isLoaded) {
      throw new Error("Peer is not loaded");
    }
    return this._isRegistered;
  }

  async _parseAndUpdatePeers() {
    console.log("Stem._parseAndUpdatePeers()");

    const chats = borsh.deserialize(
      DescriptorSchema,
      this._descriptorAccount.data.subarray(8)
    ) as DescriptorBorsh;

    let updated = false;

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
        updated = true;
      }

      // only accepted peer has chat account
      if (peer.status === PeerStatus.Accepted && !obj?.account) {
        const account = new Account(
          helpers.getChatPda(this._publicKey, peerPubKey),
          this._connection.connection,
          true
        );
        account.fetch();
        this._chatsAccounts.set(peerPubKeyString, {
          account,
          status: peer.status,
        });
        updated = true;
      } else {
        const peerAccount = this._chatsAccounts.get(peerPubKeyString);
        if (!peerAccount || peerAccount.status !== peer.status) {
          this._chatsAccounts.set(peerPubKeyString, {
            account: null,
            status: peer.status,
          });
          updated = true;
        }
      }
    }

    if (updated) {
      this._emitter.emit("onChatsUpdate", this._chatsAccounts);
    }

    return updated;
  }

  async init() {
    // load descriptor account
    await this._descriptorAccount.fetch();
    await this._parseAndUpdatePeers();
    this._descriptorAccount.onUpdate(this._parseAndUpdatePeers);

    // load chats accounts

    this._isLoaded = true;
    return this;
  }

  get chats() {
    return Array.from(this._chatsAccounts.values()).map((peer) => {
      return {
        pubkey: peer.account
          ? new PublicKey(peer.account.publicKey.toBuffer())
          : null,
        status: peer.status,
      };
    });
  }

  _parseChat(account: Account) {
    const chat = borsh.deserialize(
      ChatSchema,
      account.data.subarray(8)
    ) as ChatBorsh;

    return {
      wallets: chat.wallets.map((wallet) => new PublicKey(wallet)),
      length: chat.length,
      messages: chat.messages.map((message) => ({
        sender: new PublicKey(message.sender),
        content: message.content,
        timestamp: new Date(Number(message.timestamp)),
      })),
    };
  }

  getChat(pubkey: PublicKey) {
    const peerAccount = this._chatsAccounts.get(pubkey.toBase58());
    return peerAccount?.account ? this._parseChat(peerAccount.account) : null;
  }

  // async load() {
  //   await this.loadPeers(); // this._descriptorAccount.onUpdate();

  //   this._isLoaded = true;
  //   return this;
  // }
}
