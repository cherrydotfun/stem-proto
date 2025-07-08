import {
  LAMPORTS_PER_SOL,
  Connection as Web3Connection,
  PublicKey,
} from "@solana/web3.js";

import type { AccountInfo, Commitment, Transaction } from "@solana/web3.js";

import { EventEmitter } from "events";

/**
 * Account class
 * @param publicKey - The public key of the account
 * @param _connection - The connection to the account
 * @param subscribe - Whether to subscribe to the account
 */
export class Account {
  private _publicKey: PublicKey;
  private _lamports: number;
  private _data: Buffer;
  private _isInitialized: boolean;
  private _connection: Web3Connection | null;
  private _emitter: EventEmitter | null;

  constructor(
    publicKey: PublicKey,
    _connection: Web3Connection | null = null,
    subscribe: boolean = false
  ) {
    this._connection = _connection;

    this._publicKey = publicKey;
    this._lamports = 0;
    this._data = Buffer.alloc(0);
    this._isInitialized = false;
    this._emitter = null;

    this.onUpdate = this.onUpdate.bind(this);

    if (subscribe && this._connection) {
      this._emitter = new EventEmitter();
      this._connection?.onAccountChange(this._publicKey, (accountInfo) => {
        this._update(accountInfo);
        console.log("SOLANA: Account updated", accountInfo);
        this._emitter?.emit("update", this);
      });
    }
  }

  get publicKey() {
    return this._publicKey;
  }

  get lamports() {
    return this._lamports;
  }

  get data() {
    return this._data;
  }

  get isInitialized() {
    return this._isInitialized;
  }

  get balance() {
    return this._lamports / LAMPORTS_PER_SOL;
  }

  async _update(accountInfo: AccountInfo<Buffer> | null) {
    if (!accountInfo) {
      this._isInitialized = false;
      this._lamports = 0;
      this._data = Buffer.alloc(0);
      return this;
    }

    this._isInitialized = true;
    this._lamports = accountInfo?.lamports || 0;
    this._data = accountInfo?.data || Buffer.alloc(0);

    return this;
  }

  async fetch() {
    if (!this._connection) {
      throw new Error("Connection is not set");
    }

    const accountInfo = await this._connection.getAccountInfo(this._publicKey);
    this._update(accountInfo);
    this._emitter?.emit("update", this);

    return this;
  }

  onUpdate(callback: (account: Account) => void) {
    this._emitter?.on("update", callback);
  }
}

/**
 * Connection class
 * @param rpcUrl - The RPC URL of the connection
 * @param wsEndpoint - The WebSocket endpoint of the connection
 * @param commitment - The commitment level of the connection
 */

export class Connection {
  private _connection: Web3Connection;
  private _commitment: Commitment;

  constructor(
    rpcUrl: string = "http://localhost:8899",
    wsEndpoint: string = "ws://localhost:8900",
    commitment: Commitment = "finalized"
  ) {
    this._connection = new Web3Connection(rpcUrl, {
      wsEndpoint,
      commitment,
    });
    this._commitment = commitment;
  }

  getAccount(publicKey: PublicKey, subscribe: boolean = false) {
    const account = new Account(publicKey, this._connection, subscribe);
    account.fetch();
    return account;
  }

  get connection() {
    return this._connection;
  }

  async requestAirdrop(account: Account, amount: number) {
    const signature = await this._connection.requestAirdrop(
      account.publicKey,
      amount * LAMPORTS_PER_SOL
    );
    return await this._connection.confirmTransaction(
      signature,
      this._commitment
    );
  }
}

/**
 * Wallet interface
 * @param name - The name of the wallet
 * @param isInstalled - Whether the wallet is installed
 * @param isConnected - Whether the wallet is connected
 * @param publicKey - The public key of the wallet
 * @param connect - The function to connect to the wallet
 * @param disconnect - The function to disconnect from the wallet
 * @param signTransaction - The function to sign a transaction
 */

export interface Wallet {
  name: string;
  isInstalled: boolean;
  isConnected: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (tx: Transaction) => Promise<string>;
}
