// import { Solana, StemHelpers, Stem } from "../utils/stem";
// import { type AccountInfo, PublicKey } from "@solana/web3.js";
// import { ref, type ComputedRef, watchEffect, computed } from "vue";

import type { Commitment, PublicKey } from "@solana/web3.js";

import { Connection } from "../utils/solana";

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

export const useStem = (connection: Connection, publicKey: PublicKey) => {};

// let solana = new Solana();

// export const initSolana = (rpcUrl: string = "http://localhost:8899") => {
//   solana = new Solana(rpcUrl);
// };

// export const getRawSolana = () => {
//   return solana;
// };

// type RAccountInfo = {
//   accountInfo: AccountInfo<Buffer> | null;
//   isRegistered: boolean;
// };

// export const getAccountInfo = (publicKey: ComputedRef<PublicKey | null>) => {
//   const accountInfo = ref<RAccountInfo>({
//     accountInfo: null,
//     isRegistered: false,
//   });

//   const _loadData = async () => {
//     // console.log("Loading data", publicKey.value);
//     if (publicKey.value) {
//       const _tmp = await solana.getAccountInfo(publicKey.value);
//       accountInfo.value = {
//         accountInfo: _tmp,
//         isRegistered: _tmp ? true : false,
//       };
//     }
//   };

//   watchEffect(async (onCleanup) => {
//     let _interval = null;
//     if (publicKey.value) {
//       _loadData();
//       _interval = setInterval(_loadData, 5000);
//     } else {
//       accountInfo.value = {
//         accountInfo: null,
//         isRegistered: false,
//       };
//     }
//     onCleanup(() => {
//       console.log("Clearing interval");
//       if (_interval) {
//         clearInterval(_interval);
//       }
//     });
//   });

//   return accountInfo;
// };

// function accountRef(timeout: number = 5000) {
//   return (publicKey: ComputedRef<PublicKey | null>) => {
//     const _account = ref<AccountInfo<Buffer> | null>(null);

//     const _loadData = async () => {
//       // console.log("Loading data", publicKey.value?.toBase58());
//       if (publicKey.value) {
//         const _tmp = await solana.getAccountInfo(publicKey.value);
//         _account.value = _tmp;
//       }
//     };

//     watchEffect((onCleanup) => {
//       let _interval = null;
//       if (publicKey.value) {
//         _loadData();
//         _interval = setInterval(_loadData, timeout);
//       }
//       onCleanup(() => {
//         // console.log("Clearing interval");
//         if (_interval) {
//           clearInterval(_interval);
//         }
//       });
//     });

//     return _account;
//   };
// }

// type Peer = {
//   pubkey: PublicKey;
//   status: number;
// };

// type WalletDescriptor = {
//   peers: Peer[];
// };

// export const getWalletDescriptor = (
//   publicKey: ComputedRef<PublicKey | null>
// ) => {
//   const pda = computed(() => StemHelpers.getDescriptorPda(publicKey.value));

//   const _wallet = accountRef()(pda);

//   return computed(() => {
//     const _tmp = _wallet.value;
//     if (_tmp) {
//       // console.log(_tmp.data);
//       const data = Stem.deserializeDescriptor(
//         _tmp.data.subarray(8)
//       ) as WalletDescriptor;
//       // console.log(data);
//       for (const peer of data.peers) {
//         peer.pubkey = new PublicKey(peer.pubkey);
//       }
//       return {
//         data,
//         isRegistered: true,
//       };
//     } else {
//       return {
//         data: null,
//         isRegistered: false,
//       };
//     }
//   });
// };

// export const getChatData = (
//   peer1: ComputedRef<PublicKey | null>,
//   peer2: ComputedRef<PublicKey | null>
// ) => {
//   const pda = computed(() => {
//     if (!peer1.value || !peer2.value) {
//       return null;
//     }
//     return StemHelpers.getChatPda(peer1.value, peer2.value);
//   });

//   console.log("chat pda", pda.value?.toBase58());
//   const _chat = accountRef(5000)(pda);

//   return computed(() => {
//     const _tmp = _chat.value;
//     if (_tmp) {
//       const data = Stem.deserializeChat(_tmp.data.subarray(8));
//       if (!data) {
//         throw new Error("Failed to deserialize chat");
//       }
//       console.log("chat data", data);
//       data.wallets[0] = new PublicKey(data.wallets[0]);
//       data.wallets[1] = new PublicKey(data.wallets[1]);
//       return data;
//     }
//     return null;
//   });
// };
