import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";

import * as CryptoJS from 'crypto-js';
import * as borsh from "borsh";
import { Buffer } from 'buffer';

import { EventEmitter } from "./events";

import { Account, Connection } from "./solana";
import { ChatSchema, DescriptorSchema, GroupDescriptorSchema, GroupSchema } from "./schemas";
import type { DescriptorBorsh, ChatBorsh, GroupBorsh, GroupDescriptorBorsh } from "./types";
import { GroupPeerStatus, PeerStatus } from "./types";

import { PROGRAM_ID, SEED_DESCRIPTOR, SEED_PRIVATE_CHAT, SEED_GROUP_DESCRIPTOR } from "./const";

const getHash = async (data: Buffer | string) => {
  if (typeof data === 'string') {
    const hash = CryptoJS.SHA256(data);
    return  Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
  }
  const wordArray = CryptoJS.lib.WordArray.create(data);
  const hash = CryptoJS.SHA256(wordArray);
  return  Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');
};

const numToBuffer_64 = (num: number) => {
  const buf = Buffer.alloc(8);
  buf.writeUIntLE(num, 0, 8);
  return buf;
}
const numToBuffer_32 = (num: number) => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(num, 0);
  return buf;
}
const numToBuffer_8 = (num: number) => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(num, 0);
  return buf;
}

export const helpers = {
  getdisc: async (name: string) => (await getHash(Buffer.from(`global:${name}`))).subarray(0, 8),

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

    return getHash(raw);
  },
  getChatPda: async (publicKey: PublicKey, peer: PublicKey) => {
    const [chatPda] = PublicKey.findProgramAddressSync(
      [SEED_PRIVATE_CHAT, await helpers.getChatHash(publicKey, peer)],
      PROGRAM_ID
    );
    return chatPda;
  },
  getNewGroupPda: async (publicKey: PublicKey, groups_count: number) => {
    const [newGroupPda] = PublicKey.findProgramAddressSync(
      [SEED_GROUP_DESCRIPTOR, publicKey.toBuffer(), numToBuffer_64(groups_count)],
      PROGRAM_ID
    );
    return newGroupPda;
  },
};

type PeerAccount = {
  account: Account | null;
  status: PeerStatus;
};
type GroupAccount = {
  account: Account | null;
  state: GroupPeerStatus;
};

type ChatMetadata = Record<string, {
  lastMessage: string;
  timestamp: string;
  lastMessageSender: string;
}>;

export class Stem {
  private _publicKey: PublicKey;
  private _connection: Connection;
  private _descriptorAccount: Account;
  private _chatsAccounts: Map<string, PeerAccount>;
  private _groupsAccounts: Map<string, GroupAccount>;
  private _isRegistered: boolean;
  private _isLoaded: boolean;
  private _subscribe: boolean;
  private _metadata: ChatMetadata = {};

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
    this._groupsAccounts = new Map();
    this._isRegistered = false;
    this._isLoaded = false;

    this._parseAndUpdatePeers = this._parseAndUpdatePeers.bind(this);
  }

  get connection() {
    return this._connection;
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

  get publicKey() {
    return this._publicKey;
  }
  get account() {
    return this._descriptorAccount;
  }

  async _parseAndUpdatePeers() {
    // console.log("Stem._parseAndUpdatePeers()");

    let statusUpdated = false;
    let chatListUpdated = false;
    let groupListUpdated = false;

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
          const chatPda = await helpers.getChatPda(this._publicKey, peerPubKey);
          const account = new Account(
            chatPda,
            this._connection.connection,
            this._subscribe
          );
          if (this._subscribe) {
            account.onUpdate(() => {
              console.log("STEM: Chat updated", this._parseChat(account));
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

      for (const group of chats.groups) {
        const groupPubKey = new PublicKey(group.account);
        const groupPubKeyString = groupPubKey.toBase58();
        const obj = this._groupsAccounts.get(groupPubKeyString);
        if (!obj) {
          this._groupsAccounts.set(groupPubKeyString, {
            account: null,
            state: group.state,
          });
          groupListUpdated = true;
        }
        if (group.state === GroupPeerStatus.Joined && !obj?.account) {
         const account = new Account(
            groupPubKey,
            this._connection.connection,
            this._subscribe
          );
          if (this._subscribe) {
            account.onUpdate(() => {
              console.log("STEM: Group updated", this._parseGroup(account));
              this._emitter.emit("onGroupUpdated", {
                pubkey: groupPubKey,
                group: this._parseGroup(account),
              });
            });
          }
          account.fetch();
          this._groupsAccounts.set(groupPubKeyString, {
            account,
            state: group.state,
          });
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
    await this._descriptorAccount.fetch();
    await this._parseAndUpdatePeers();

    if (this._subscribe) {
      this._descriptorAccount.onUpdate(this._parseAndUpdatePeers);
    }

    this._isLoaded = true;
    console.log('Stem is loaded');

    this._emitter.emit("onChatsUpdated", this);

    this._emitter.on("onChatUpdated", (chat) => {
      this._metadata[chat.pubkey.toString()] = {
        lastMessage: chat.chat.messages[chat.chat.messages.length - 1]?.content,
        timestamp: chat.chat.messages[chat.chat.messages.length - 1]?.timestamp,
        lastMessageSender: chat.chat.messages[chat.chat.messages.length - 1]?.sender.toString(),
      };
      this._emitter.emit("onChatsUpdated", this);
    });

    return this;
  }

  get chats() {
    if (!this._isLoaded) {
      return [];
    }

    return Array.from(this._chatsAccounts.keys()).map((pubKeyString) => {
      const pubKey = new PublicKey(pubKeyString);
      // const chat = this._chatsAccounts.get(pubKeyString)?.account;
      // const chat = this.getChat(pubKey);
      return {
        pubkey: pubKey,
        status: this._chatsAccounts.get(pubKeyString)?.status,
        lastMessage: this._metadata[pubKeyString]?.lastMessage,
        timestamp: this._metadata[pubKeyString]?.timestamp,
        lastMessageSender: this._metadata[pubKeyString]?.lastMessageSender,
      };
    });
  }

  get groups() {
    if (!this._isLoaded) {
      return [];
    }

    return Array.from(this._groupsAccounts.keys()).map((pubKeyString) => {
      const pubKey = new PublicKey(pubKeyString);
      return {
        account: pubKey,
        state: this._groupsAccounts.get(pubKeyString)?.state,
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
        content: Buffer.from(message.content).toString(),
        timestamp: new Date(
          Buffer.from(message.timestamp.slice(0, 4)).readUint32LE() * 1000
        ),
      })),
    };
  }

  _parseGroup(account: Account) {
    const group = borsh.deserialize(
      GroupDescriptorSchema,
      account.data.subarray(8)
    ) as GroupDescriptorBorsh;
    return {
      title: Buffer.from(group.title).toString(),
      description: Buffer.from(group.description).toString(),
      image_url: Buffer.from(group.image_url).toString(),
      owner: new PublicKey(group.owner),
      group_type: group.group_type,
      state: group.state,
      members: group.members.map((member) => ({account: new PublicKey(member.account), state: member.state})),
      length: group.length,
      messages: group.messages.map((message) => ({
        sender: new PublicKey(message.sender),
        content: Buffer.from(message.content).toString(),
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

  getGroup(pubkey: PublicKey) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Account not registred");
    }

    const groupAccount = this._groupsAccounts.get(pubkey.toBase58());

    if (!groupAccount) {
      return null;
    }

    return groupAccount?.account ? this._parseGroup(groupAccount.account) : null;
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

    const descriptorPda = await helpers.getDescriptorPda(this._publicKey);

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
      data: await helpers.getdisc("register"),
    });

    const blockhash = await this._connection.getLatestBlockhash();

    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);

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

    const inviterPda = await helpers.getDescriptorPda(this._publicKey);
    const inviteePda = await helpers.getDescriptorPda(invitee);

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
      data: await helpers.getdisc("invite"),
    });

    const blockhash = await this._connection.getLatestBlockhash();

    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);

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

    const inviterPda = await helpers.getDescriptorPda(this._publicKey);
    const inviteePda = await helpers.getDescriptorPda(invitee);

    if (!inviterPda || !inviteePda) {
      throw new Error("Descriptor PDA not generated");
    }

    if (this._publicKey.toBase58() === invitee.toBase58()) {
      throw new Error("You can't invite yourself");
    }

    console.log( await helpers.getdisc("accept"),);
    console.log(await helpers.getChatHash(this._publicKey, invitee),);

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
          pubkey: await helpers.getChatPda(this._publicKey, invitee),
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
        await helpers.getdisc("accept"),
        await helpers.getChatHash(this._publicKey, invitee),
      ]),
    });

    const blockhash = await this._connection.getLatestBlockhash();

    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);
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

    const inviterPda = await helpers.getDescriptorPda(this._publicKey);
    const inviteePda = await helpers.getDescriptorPda(invitee);

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
      data: await helpers.getdisc("reject"),
    });

    const blockhash = await this._connection.getLatestBlockhash();

    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);

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
    buf.writeUInt32LE(Buffer.from(message).length, 0);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: await helpers.getChatPda(this._publicKey, invitee),
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
        await helpers.getdisc("sendmessage"),
        await helpers.getChatHash(this._publicKey, invitee),
        buf,
        Buffer.from(message),
      ]),
    });

    const blockhash = await this._connection.getLatestBlockhash();

    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);

    return tx;
  }

  async _createTxWrapper(createIx: () => Promise<TransactionInstruction>) {
    if (!this._isLoaded) {
      throw Error("Account is not loaded");
    }

    if (!this._isRegistered) {
      throw Error("Stem Account not registred");
    }

    const ix = await createIx();

    const blockhash = await this._connection.getLatestBlockhash();
    const txMessage  = new TransactionMessage({
      payerKey: this._publicKey,
      recentBlockhash: blockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();

    const tx = new VersionedTransaction(txMessage);

    return tx;
  }

  async createCreateGroupTx(type: number, title: string, description: string, image_url: string) {
    return this._createTxWrapper(async () => 
       new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: this._publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: await helpers.getDescriptorPda(this._publicKey),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: await helpers.getNewGroupPda(this._publicKey, this._groupsAccounts.size),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data:
        Buffer.from(borsh.serialize({struct: {
          disc: {array: {type: "u8", len: 8}},
          group_type: 'u8',
          title: {array: {type: "u8"}},
          description: {array: {type: "u8"}},
          image_url: {array: {type: "u8"}},
        }}, {
          disc: await helpers.getdisc("create_group"), 
          group_type: type,
          title: Buffer.from(title),
          description: Buffer.from(description),
          image_url: Buffer.from(image_url),
        }))
      })
    );
  }

  async createSendMessageToGroupTx(group: PublicKey, content: string) {
    return this._createTxWrapper(async () => 
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: this._publicKey,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: group,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          }],
          data: Buffer.from(borsh.serialize({struct: {
            disc: {array: {type: "u8", len: 8}},
            content: {array: {type: "u8"}},
          }}, {
            disc: await helpers.getdisc("send_message_to_group"),
            content: Buffer.from(content),
          }))
        })
    );
  }
  async createInviteToGroupTx(group: PublicKey, invitee: PublicKey) {
    return this._createTxWrapper(async () => 
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: this._publicKey,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: group,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: await helpers.getDescriptorPda(invitee),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          }],
          data: Buffer.from(borsh.serialize({struct: {
            disc: {array: {type: "u8", len: 8}},
            invitee: {array: {type: "u8", len: 32}},
          }}, {
            disc: await helpers.getdisc("invite_to_group"),
            invitee: invitee.toBuffer(),
          }))
        })
    );
  }
  async createAcceptInviteToGroupTx(group: PublicKey) {
    return this._createTxWrapper(async () => 
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: this._publicKey,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: group,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: await helpers.getDescriptorPda(this._publicKey),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          }],
          data: Buffer.from(borsh.serialize({struct: {
            disc: {array: {type: "u8", len: 8}}
          }}, {
            disc: await helpers.getdisc("accept_invite_to_group"),
          }))
        })
    );
  }
  async createJoinGroupTx(group: PublicKey) {
    return this._createTxWrapper(async () => 
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          {
            pubkey: this._publicKey,
            isSigner: true,
            isWritable: false,
          },
          {
            pubkey: await helpers.getDescriptorPda(this._publicKey),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: group,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          }],
          data: Buffer.from(borsh.serialize({struct: {
            disc: {array: {type: "u8", len: 8}}
          }}, {
            disc: await helpers.getdisc("join_group"),
          }))
        })
    );
  }

}






