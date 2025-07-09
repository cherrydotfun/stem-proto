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
  import { computed, watch } from "vue";
  import { useRouter } from "vue-router";
  import { useStem } from "./composables/stem";

  const router = useRouter();

  const rpcUrl = import.meta.env.VITE_RPC_URL || "http://localhost:8899";

  import { getConnection, useAccount } from "./composables/solana";

  const connection = getConnection({
    rpcUrl: rpcUrl,
    wsEndpoint: "ws://localhost:8900",
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
</script>

<style scoped>
  /* Global styles can be added here */
</style>
