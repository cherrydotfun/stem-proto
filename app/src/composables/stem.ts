import { PublicKey } from "@solana/web3.js";
import { reactive, watchEffect } from "vue";
import type { ComputedRef } from "vue";
import { Stem } from "../utils/stem_lib";
import { PeerStatus } from "../utils/types";
import { Connection } from "../utils/solana";

export const useStem = (
  connection: Connection,
  publicKey: ComputedRef<PublicKey | null>
) => {
  let stem: Stem | null = null;

  const retData = reactive({
    isRegistered: false,
    isLoaded: false,
    chats: [] as
      | {
          pubkey: PublicKey | null;
          status: PeerStatus;
        }[]
      | undefined,
    raw: null as Stem | null,
  });

  watchEffect(async () => {
    console.log("Stem watchEffect", publicKey.value);
    if (!publicKey.value) {
      retData.isRegistered = false;
      retData.isLoaded = false;
      retData.chats = [];
      retData.raw = null;
      return;
    }

    stem = new Stem(publicKey.value, connection, true);
    stem.on("onChatsUpdated", () => {
      retData.chats = stem?.chats;
    });
    stem.on("onStatusUpdated", (isRegistered) => {
      retData.isRegistered = isRegistered;
    });
    // stem.on("onLoaded", () => {
    //   retData.isLoaded = true;
    // });
    await stem.init();
    console.log("Stem isLoaded", stem.isLoaded);
    retData.isLoaded = stem.isLoaded;
    retData.raw = stem;
  });

  const useChat = (chatPeer: ComputedRef<PublicKey | null>) => {
    const chat = reactive({
      messages: [] as any[],
      peer: chatPeer.value,
    });

    watchEffect(async () => {
      if (!chatPeer.value) {
        chat.messages = [];
        chat.peer = null;
        return;
      }
      if (stem) {
        const tmp = stem.getChat(chatPeer.value);
        console.log(tmp);
        if (tmp) {
          chat.messages = tmp.messages;
          chat.peer = chatPeer.value;
        }
      }
    });

    return chat;
  };

  return { stem: retData, useChat };
};

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
