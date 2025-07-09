import type { Commitment, PublicKey } from "@solana/web3.js";
import { watchEffect, type ComputedRef, type Ref, reactive } from "vue";

import { Connection, Account } from "../utils/solana";

type State = {
  _connections: Record<string, Connection>;
};

const state: State = {
  _connections: {},
};

// Connection params or exists connetion id
type useConnectionParams =
  | {
      rpcUrl: string;
      wsEndpoint: string;
      commitment: Commitment;
    }
  | string;

export const getConnection = (params: useConnectionParams = "_default") => {
  if (typeof params == "string") {
    return state._connections[params];
  }

  state._connections["_default"] = new Connection(
    params.rpcUrl,
    params.wsEndpoint,
    params.commitment
  );

  return state._connections["_default"];
};

export const useAccount = (
  publicKey: ComputedRef<PublicKey | null> | Ref<PublicKey | null>,
  connection: Connection = getConnection()
) => {
  let account: Account | null = null;

  const retData = reactive({
    lamports: 0,
    balance: 0,
    data: new Uint8Array(0),
    isInitialized: false,
    raw: null as Account | null,
  });

  watchEffect(() => {
    console.log("Composable Account watchEffect", publicKey.value);
    if (publicKey.value) {
      account = connection.getAccount(publicKey.value, true);
      retData.raw = account;
      account.onUpdate((account) => {
        console.log("Composable Account updated", account);
        retData.lamports = account.lamports;
        retData.balance = account.balance;
        retData.data = new Uint8Array(account.data);
        retData.isInitialized = account.isInitialized;
      });
    }
  });

  return retData;
};
