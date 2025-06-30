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
  import { PublicKey } from "@solana/web3.js";

  defineProps<{
    chat: any;
    publicKey: PublicKey | null;
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
    background-color: #14f195f0;

    color: #fff;
    min-width: 30%;
    text-align: left;
    transform: skew(-20deg);
  }
  .my .message-content {
    background-color: #9945fff0;
    text-align: right;
    transform: skew(20deg);
  }

  .message-timestamp-text {
    transform: skew(20deg);
  }
  .my .message-timestamp-text {
    transform: skew(-20deg);
  }

  .message-timestamp {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
  }

  /* Мобильные стили */
  @media (max-width: 768px) {
    .message {
      margin-bottom: 15px;
    }

    .message-content {
      padding: 12px 16px;
      min-width: 60%;
      max-width: 85%;
    }

    .message-timestamp {
      font-size: 11px;
      margin-top: 8px;
    }
  }
</style>
