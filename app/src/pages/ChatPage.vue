<template>
  <div class="chat-page">
    <div class="page-container" :class="{ 'menu-collapsed': isMenuCollapsed }">
      <!-- Боковое меню -->
      <div class="menu-container">
        <div class="menu-toggle" @click="toggleMenu">
          <span v-if="isMenuCollapsed">☰</span>
          <span v-else>✕</span>
        </div>

        <!-- Информация о пользователе -->
        <div class="user-info" v-show="!isMenuCollapsed">
          <AvatarComponent :userKey="publicKey?.toBase58() || ''" />
          <div class="user-details">
            <div class="user-key" @click="copyKey" :title="'Click to copy'">
              {{ publicKey?.toBase58().slice(0, 4) }}...{{
                publicKey?.toBase58().slice(-4)
              }}
            </div>
            <div class="user-balance">
              {{ (myAccountInfo.accountInfo?.lamports || 0) / LAMPORTS_PER_SOL }} SOL
            </div>
          </div>
        </div>

        <!-- Меню чатов и контактов -->
        <div class="menu-content" v-show="!isMenuCollapsed">
          <MenuComponent
            :userKey="publicKey?.toBase58() || ''"
            :currentChat="chatPeer"
            :isCollapsed="isMenuCollapsed"
            @openChat="handleOpenChat"
            @invite="invite"
            @acceptPeer="acceptPeer"
            @rejectPeer="rejectPeer"
          />
        </div>
      </div>

      <!-- Основная область чата -->
      <div class="chat-container">
        <div v-if="chatPeer" class="chat-container-inner">
          <div class="chat-header">
            <div class="chat-peer-info">
              <AvatarComponent :userKey="chatPeer.toBase58()" />
              <span class="peer-name">
                Chat with {{ chatPeer.toBase58().slice(0, 4) }}...{{
                  chatPeer.toBase58().slice(-4)
                }}
              </span>
            </div>
          </div>
          
          <div class="chat-messages">
            <chat :chat="chatData" :publicKey="publicKey" />
          </div>
          
          <div class="chat-input">
            <input 
              type="text" 
              v-model="message" 
              placeholder="Type a message..."
              @keyup.enter="handleSendMessage"
            />
            <button @click="handleSendMessage" :disabled="!message.trim()">
              Send
            </button>
          </div>
        </div>
        
        <div v-else class="chat-placeholder">
          <div class="placeholder-content">
            <div class="placeholder-icon">💬</div>
            <h3>Select a chat</h3>
            <p>Choose a user from the list on the left to start chatting</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicKey } from "@solana/web3.js";
import { ref, computed, watch } from "vue";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getChatData } from "../composables/stem";
import AvatarComponent from "../components/UI/AvatarComponent.vue";
import MenuComponent from "../components/MenuComponent.vue";
import Chat from "../components/chat.vue";

const props = defineProps<{
  publicKey: PublicKey | null;
  myAccountInfo: any;
  isMenuCollapsed: boolean;
  invite: (invitee: string) => void;
  acceptPeer: (peer: PublicKey) => void;
  rejectPeer: (peer: PublicKey) => void;
  sendMessage: (message: string) => void;
  openChat: (peer: PublicKey) => void;
  copyKey: () => void;
  logout: () => void;
  toggleMenu: () => void;
}>();

const chatPeer = ref<PublicKey | null>(null);
const chatData = ref<any>(null);

const updateChatData = () => {
  console.log("updateChatData called, publicKey:", props.publicKey?.toBase58(), "chatPeer:", chatPeer.value?.toBase58());
  if (props.publicKey && chatPeer.value) {
    // @ts-ignore - getChatData ожидает PublicKey, но мы проверяем на null выше
    const data = getChatData(
      computed(() => props.publicKey),
      computed(() => chatPeer.value)
    );
    chatData.value = data.value;
    console.log("chatData updated:", chatData.value);
  } else {
    chatData.value = null;
    console.log("chatData set to null");
  }
};

// Обновляем chatData при изменении chatPeer
watch(chatPeer, updateChatData);
watch(() => props.publicKey, updateChatData);

const message = ref<string>("");

const handleSendMessage = () => {
  if (message.value.trim() && chatPeer.value) {
    props.sendMessage(message.value);
    message.value = "";
  }
};

const handleOpenChat = (peer: PublicKey) => {
  console.log("handleOpenChat called with peer:", peer.toBase58());
  chatPeer.value = peer;
  props.openChat(peer);
  updateChatData(); // Обновляем данные чата
  console.log("chatPeer updated to:", chatPeer.value?.toBase58());
};
</script>

<style scoped>
.chat-page {
  height: 100vh;
  background-color: var(--black-color);
}

.page-container {
  display: grid;
  grid-template-columns: 245px 1fr;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  transition: grid-template-columns 0.3s ease;
}

.page-container.menu-collapsed {
  grid-template-columns: 80px 1fr;
}

.menu-container {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--purple-color);
  position: relative;
  overflow: hidden;
  padding-top: 50px;
  background-color: var(--black-color);
}

.menu-toggle {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 30px;
  height: 30px;
  background-color: var(--purple-color);
  color: var(--white-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  font-size: 14px;
  transition: all 0.3s ease;
}

.page-container.menu-collapsed .menu-toggle {
  left: 50%;
  transform: translateX(-50%);
  right: auto;
}

.menu-toggle:hover {
  background-color: rgba(150, 70, 253, 0.8);
}

.user-info {
  padding: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid var(--purple-color);
  transition: padding 0.3s ease;
}

.page-container.menu-collapsed .user-info {
  justify-content: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--purple-color);
}

.user-details {
  margin-left: 15px;
}

.user-key {
  font-family: monospace;
  font-size: 14px;
  color: var(--white-color);
  cursor: pointer;
  padding: 8px;
  background: rgba(150, 70, 253, 0.1);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.3s ease;
}

.user-key:hover {
  background: rgba(150, 70, 253, 0.2);
}

.user-balance {
  font-size: 14px;
  color: var(--purple-color);
}

.menu-content {
  flex: 1;
  overflow-y: auto;
}

.logout-section {
  padding: 20px;
  border-top: 1px solid var(--purple-color);
}

.logout-button {
  width: 100%;
  padding: 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.3s ease;
}

.logout-button:hover {
  background: #c82333;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: rgb(31, 30, 30);
}

.chat-container-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: rgb(31, 30, 30);
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid var(--purple-color);
  font-size: 18px;
  color: var(--white-color);
  flex-shrink: 0;
  background-color: rgb(31, 30, 30);
}

.chat-peer-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.peer-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--white-color);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid var(--purple-color);
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.chat-input input {
  flex: 1;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid var(--purple-color);
  background-color: var(--black-color);
  color: var(--white-color);
}

.chat-input input:focus {
  outline: none;
  border-color: var(--purple-color);
}

.chat-input button {
  padding: 10px 20px;
  border-radius: 5px;
  background-color: var(--purple-color);
  color: var(--white-color);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-input button:hover:not(:disabled) {
  background-color: rgba(150, 70, 253, 0.8);
}

.chat-input button:disabled {
  background: #666;
  cursor: not-allowed;
}

.chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--white-color);
  font-size: 18px;
  background-color: rgb(31, 30, 30);
}

.placeholder-content {
  text-align: center;
  color: var(--white-color);
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.placeholder-content h3 {
  margin-bottom: 10px;
  color: var(--white-color);
}

.placeholder-content p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--purple-color);
}
</style> 