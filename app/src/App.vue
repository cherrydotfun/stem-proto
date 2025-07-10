<template>
  <router-view v-slot="{ Component }">
    <component
      :is="Component"
      :publicKey="publicKey"
      :names="names"
      :myAccount="myAccount"
      :_selectWallet="_selectWallet"
      :stem="stem"
      :connection="connection"  
      :wallet="wallet"
      :useChat="useChat"
      />
  </router-view>
</template>

<script setup lang="ts">

  import { useLocalWallet } from "./composables/localWallet";
  import { usePhantomWallet } from "./composables/phantomWallet";
  import { useWallet } from "./composables/wallet";
  import { computed, watch, onMounted, onUnmounted } from "vue";
  import { useRouter } from "vue-router";
  import { useStem } from "./composables/stem";

  const router = useRouter();

  const rpcUrl = import.meta.env.VITE_RPC_URL || "http://localhost:8899";
  const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8900";

  import { getConnection, useAccount } from "./composables/solana";

  const connection = getConnection({
    rpcUrl: rpcUrl,
    wsEndpoint: wsUrl,
    commitment: "finalized",
  });


  const { wallet, names, selectWallet } = useWallet([
    useLocalWallet(rpcUrl),
    usePhantomWallet(rpcUrl),
  ]);

  const _selectWallet = (name: string) => {
    selectWallet(name);
    wallet.value?.connect();
  };

  const publicKey = computed(() => wallet.value?.publicKey || null);

  const myAccount = useAccount(
    computed(() => publicKey.value),
    connection
  );

  const { stem, useChat } = useStem(connection, publicKey);

  watch(stem, (stem) => {
    if (publicKey.value && stem.isRegistered) {
      if (router.currentRoute.value.path !== "/chat") {
        router.push("/chat");
      }
    }

  });

// Dynamic vh fix for mobile browsers
const setVh = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
onMounted(() => {
  setVh();
  window.addEventListener('resize', setVh);
});
onUnmounted(() => {
  window.removeEventListener('resize', setVh);
});
</script>

<style scoped>
  /* Global styles can be added here */
  :global(html), :global(body), :global(#app) {
    height: calc(var(--vh, 1vh) * 100);
    min-height: calc(var(--vh, 1vh) * 100);
  }
</style>
