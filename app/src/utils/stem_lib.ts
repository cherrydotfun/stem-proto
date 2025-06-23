import { PublicKey } from "@solana/web3.js";
import { Account, Connection } from "./solana";

import * as borsh from "borsh";

import { DescriptorSchema } from "./schemas";

export class Peer {
  private _publicKey: PublicKey;
  private _connection: Connection;
  private _descriptorAccount: Account;
  private _chatsAccounts: Map<PublicKey, Account>;
  private _isRegistered: boolean;

  constructor(publicKey: PublicKey, connection: Connection) {
    this._publicKey = publicKey;
    this._connection = connection;
    this._descriptorAccount = new Account(
      this._publicKey,
      this._connection.connection
    );
    this._chatsAccounts = new Map();
    this._isRegistered = false;
  }

  get isRegistered() {
    return this._isRegistered;
  }

  async getChatsList() {
    await this._descriptorAccount.fetch();
    const chats = borsh.deserialize(
      DescriptorSchema,
      this._descriptorAccount.data
    );
  }

  async getChat() {}

  async init() {
    await this._descriptorAccount.fetch();
    // this._descriptorAccount.onUpdate();

    return this;
  }
}
