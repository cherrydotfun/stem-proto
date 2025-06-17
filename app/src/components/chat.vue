<template>
  <div v-if="chat" class="chat">
    <div
      v-for="message in chat.messages"
      :key="message.timestamp"
      :class="{ message: true, my: message.sender.equals(publicKey) }"
    >
      <!-- <div class="message-sender">
        <pubkey :pubkey="message.sender" />
      </div> -->
      <div class="message-content">
        <div class="message-timestamp-text">
          {{ message.content }}
        </div>
      </div>
      <div class="message-timestamp">
        {{ message.timestamp.toLocaleString() }}
      </div>
    </div>
    <!-- {{ chat }} -->
  </div>
</template>
<script lang="ts" setup>
  import { ref } from "vue";
  import { PublicKey } from "@solana/web3.js";
  import Pubkey from "./PubKey.vue";

  const props = defineProps<{
    chat: any;
    publicKey: PublicKey;
  }>();
</script>
<style scoped>
  .chat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .message {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .message.my {
    align-items: flex-end;
  }
  .message-content {
    padding: 10px 20px;
    border-radius: 3px;
    background-color: #9945ff;

    color: #fff;
    min-width: 30%;
    text-align: left;
    transform: skew(-20deg);
  }
  .my .message-content {
    background-color: #14f195;
    text-align: right;
    transform: skew(20deg);
  }

  .message-timestamp-text {
    transform: skew(20deg);
  }
  .my .message-timestamp-text {
    transform: skew(-20deg);
  }
</style>
