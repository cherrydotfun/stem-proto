<template>
  <router-view v-slot="{ Component }">
    <component
      :is="Component"
      :publicKey="publicKey"
      :names="names"
      :myAccountInfo="myAccountInfo"
      :isMenuCollapsed="isMenuCollapsed"
      :walletDescriptor="walletDescriptor"
      :register="register"
      :requestAirdrop="requestAirdrop"
      :copyKey="copyKey"
      :_selectWallet="_selectWallet"
      :invite="invite"
      :acceptPeer="acceptPeer"
      :rejectPeer="rejectPeer"
      :sendMessage="sendMessage"
      :openChat="openChat"
      :toggleMenu="toggleMenu"
    />
  </router-view>
</template>

<script setup lang="ts">
  import {
    initSolana,
    getRawSolana,
    getAccountInfo,
    getWalletDescriptor,
    getChatData,
  } from "./composables/stem";
  const rpcUrl = import.meta.env.VITE_RPC_URL || "http://localhost:8899";
  initSolana(rpcUrl);

  import { useLocalWallet } from "./composables/localWallet";
  import { usePhantomWallet } from "./composables/phantomWallet";
  import { useWallet } from "./composables/wallet";
  import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
  import { Stem } from "./utils/stem";
  import { ref, computed, watch } from "vue";
  import { useRouter } from "vue-router";

  const router = useRouter();

  const { wallet, names, selectWallet, disconnect } = useWallet([
    useLocalWallet(rpcUrl),
    usePhantomWallet(rpcUrl),
  ]);

  const publicKey = computed(() => wallet.value?.publicKey || null);

  const _selectWallet = (name: string) => {
    selectWallet(name);
    wallet.value?.connect();
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(publicKey.value?.toBase58() || "");
      alert("Key copied to clipboard");
    } catch (err) {
      console.error("Error copying:", err);
      alert("Failed to copy key");
    }
  };

  const solana = getRawSolana();
  const myAccountInfo = getAccountInfo(publicKey);

  const requestAirdrop = async () => {
    console.log("Requesting airdrop");
    if (publicKey.value) {
      try {
        const signature = await solana.connection.requestAirdrop(
          publicKey.value,
          LAMPORTS_PER_SOL
        );
        await solana.connection.confirmTransaction(signature);
        console.log("Airdrop successful");
      } catch (error) {
        console.error("Airdrop failed:", error);
        if (error instanceof Error) {
          alert(`Error getting SOL: ${error.message}`);
        }
      }
    }
  };

  const walletDescriptor = getWalletDescriptor(publicKey);

  const register = () => {
    if (wallet.value?.publicKey) {
      Stem.register(wallet.value);
    }
  };

  const invite = async (invitee: string) => {
    const inviteePubkey = new PublicKey(invitee);
    if (wallet.value?.publicKey && inviteePubkey) {
      try {
        await Stem.invite(wallet.value, inviteePubkey);
      } catch (error) {
        console.error("Invite error:", error);
        if (error instanceof Error && error.message.includes("0x1770")) {
          alert("Этот пользователь уже был приглашен ранее. Вы можете принять или отклонить существующее приглашение.");
        } else {
          alert(`Ошибка при отправке приглашения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
      }
    }
  };

  const rejectPeer = async (peer: PublicKey) => {
    if (wallet.value?.publicKey && peer) {
      try {
        await Stem.reject(wallet.value, peer);
      } catch (error) {
        console.error("Reject error:", error);
        alert(`Ошибка при отклонении приглашения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  };

  const acceptPeer = async (peer: PublicKey) => {
    if (wallet.value?.publicKey && peer) {
      try {
        await Stem.accept(wallet.value, peer);
      } catch (error) {
        console.error("Accept error:", error);
        alert(`Ошибка при принятии приглашения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  };

  const chatPeer = ref<PublicKey | null>(null);

  const chatData = getChatData(
    publicKey,
    computed(() => chatPeer.value)
  );

  const openChat = (peer: PublicKey) => {
    chatPeer.value = peer;
    console.log("set current chat peer", peer.toBase58());
  };

  const message = ref<string>("");
  const sendMessage = async (messageText: string) => {
    if (wallet.value?.publicKey && chatPeer.value) {
      await Stem.sendMessage(wallet.value, chatPeer.value, messageText);
    }
  };

  // Menu collapse state
  const isMenuCollapsed = ref(false);
  
  const toggleMenu = () => {
    isMenuCollapsed.value = !isMenuCollapsed.value;
  };

  // Автоматическое переключение между страницами
  watch(publicKey, (val) => {
    if (val && walletDescriptor.value?.isRegistered) {
      if (router.currentRoute.value.path !== '/chat') {
        router.push('/chat');
      }
    } else if (!val) {
      if (router.currentRoute.value.path !== '/') {
        router.push('/');
      }
    }
  });

  // Следим за регистрацией
  watch(walletDescriptor, (descriptor) => {
    if (publicKey.value && descriptor?.isRegistered) {
      if (router.currentRoute.value.path !== '/chat') {
        router.push('/chat');
      }
    }
  });
</script>

<style scoped>
/* Глобальные стили можно добавить здесь */
</style>
