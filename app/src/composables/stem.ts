import { PublicKey } from "@solana/web3.js";
import { reactive, watchEffect } from "vue";
import type { ComputedRef } from "vue";
import { Stem } from "../utils/stem";
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
          status: PeerStatus | undefined;
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
        stem.on("onChatUpdated", ({ pubkey, chat: _chat }) => {
          console.log("Stem onChatUpdated", pubkey, _chat);
          if (pubkey && _chat && pubkey.equals(chatPeer.value)) {
            chat.messages = _chat.messages;
          }
        });
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
