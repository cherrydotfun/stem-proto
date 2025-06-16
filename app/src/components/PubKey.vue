<template>
  <span>
    {{ pubkey.toBase58().slice(0, 4) }}...{{ pubkey.toBase58().slice(-4) }}
  </span>
</template>

<script setup lang="ts">
  import { PublicKey } from "@solana/web3.js";

  defineProps<{
    pubkey: PublicKey;
  }>();
</script>
