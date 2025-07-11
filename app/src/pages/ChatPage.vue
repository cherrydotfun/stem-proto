<template>
  <div class="chat-page">
    <div
      class="page-container"
      :class="{
        'menu-collapsed': isMenuCollapsed,
        'mobile-menu-open': !isMenuCollapsed && isMobile,
      }"
    >
      <!-- Side menu -->

      <div class="menu-container" :class="{ 'mobile-menu': isMobile }">
        <div class="menu-toggle" @click="toggleMenu">
          <span v-if="isMenuCollapsed">☰</span>
          <span v-else>✕</span>
        </div>
        <!-- User info -->
        <div class="user-info" v-show="!isMenuCollapsed">
          <AvatarComponent :userKey="publicKey?.toBase58() || ''" />
          <div class="user-details">
            <div class="user-key" @click="copyKey(publicKey as PublicKey)" :title="'Click to copy'">
              {{ publicKey?.toBase58().slice(0, 4) }}...{{
                publicKey?.toBase58().slice(-4)
              }}
            </div>
            <div class="user-balance">
              {{
                myAccount.balance
              }}
              SOL
            </div>
          </div>
        </div>

        <!-- Collapsed state with avatars -->
        <div class="collapsed-menu" v-show="isMenuCollapsed">
          <div class="user-avatar-collapsed">
            <AvatarComponent :userKey="publicKey?.toBase58() || ''" />
          </div>

          <div class="collapsed-divider"></div>

          <div class="collapsed-section">
            <div class="collapsed-section-title">Chats</div>
            <div class="collapsed-chats">
              <div
                v-for="peer in acceptedPeers"
                :key="peer.pubkey.toBase58()"
                @click="handleOpenChat(peer.pubkey)"
                :class="{
                  'collapsed-chat-item': true,
                  'active-chat':
                    chatPeer?.toBase58() === peer.pubkey.toBase58(),
                }"
              >
                <AvatarComponent :userKey="peer.pubkey.toBase58()" />
              </div>
            </div>
          </div>
        </div>

        <!-- Chat menu and contacts -->
        <div class="menu-content" v-show="!isMenuCollapsed">
          <MenuComponent
            :userKey="publicKey?.toBase58() || ''"
            :currentChat="chatPeer || null"
            :isCollapsed="isMenuCollapsed"
            :chats="stem.chats"
            @openChat="handleOpenChat"
            @invite="invite"
            @acceptPeer="acceptPeer"
            @rejectPeer="rejectPeer"
          />
        </div>
      </div>

      <!-- Main chat area -->
      <div class="chat-container">
        <div v-if="chatPeer" class="chat-container-inner">
          <div class="chat-header">
            <!-- Mobile menu button -->
            <button
              v-if="isMobile"
              class="mobile-menu-button"
              @click="toggleMenu"
            >
              ☰
            </button>

            <div class="chat-peer-info">
              <AvatarComponent :userKey="chatPeer!.toBase58()" />
              <span class="peer-name">
                Chat with {{ chatPeer!.toBase58().slice(0, 4) }}...{{
                  chatPeer!.toBase58().slice(-4)
                }}
              </span>
            </div>
          </div>

          <div class="chat-messages">
            <chat :messages="chat.messages" :publicKey="publicKey as PublicKey" />
          </div>

          <div class="chat-input">
            <input
              type="text"
              v-model="message"
              placeholder="Type a message..."
              @keyup.enter="handleSendMessage"
            />
            <button v-if="canSendMessage" @click="handleSendMessage" :disabled="!message.trim()" class="send-button">
              <span v-if="!isMobile">Send</span>
              <span v-else class="send-icon">
                <img src="../assets/img/icons/send.svg" alt="Send"/>
              </span>
            </button>
            <div v-else class="loader"></div>
          </div>
        </div>

        <div v-else class="chat-placeholder">
          <!-- Mobile menu button in placeholder -->
          <button
            v-if="isMobile"
            class="mobile-menu-button placeholder-menu-button"
            @click="toggleMenu"
          >
            ☰
          </button>

          <div class="placeholder-content">
            <div class="placeholder-icon">💬</div>
            <h3>Select a chat</h3>
            <p>Choose a user from the list on the left to start chatting</p>
          </div>
        </div>
      </div>

      <!-- Mobile overlay -->
      <div
        v-if="isMobile && !isMenuCollapsed"
        class="mobile-overlay"
        @click="toggleMenu"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { PublicKey } from "@solana/web3.js";
  import { ref, computed, onMounted, onUnmounted } from "vue";
  import { PeerStatus } from "../utils/types";
  import AvatarComponent from "../components/UI/AvatarComponent.vue";
  import MenuComponent from "../components/MenuComponent.vue";
  import Chat from "../components/chat.vue";  
  import { copyKey } from "../utils/helpers";

  const props = defineProps<{
    publicKey: PublicKey | null;
    myAccount: any;
    stem: any;
    wallet: any;
    useChat: any;
  }>();

  const isMobile = ref(false);

  // Menu collapse state
  const isMenuCollapsed = ref(false);

  const toggleMenu = () => {
    isMenuCollapsed.value = !isMenuCollapsed.value;
  };

  const acceptedPeers = computed(() => {
    if (!props.stem || !props.stem.chats) return [];
    return props.stem.chats.filter((peer: any) => peer.status === PeerStatus.Accepted);
  });

  // Check if the device is mobile

  const checkMobile = () => {
    isMobile.value = window.innerWidth <= 768;
  };

  onMounted(() => {
    checkMobile();
    window.addEventListener("resize", checkMobile);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", checkMobile);
  });

  const invite = async (invitee: string) => {
    const inviteePubkey = new PublicKey(invitee);
    if (props.wallet.publicKey && inviteePubkey && props.stem.raw) {
      const tx = await props.stem.raw.createInviteTx(inviteePubkey);
      const signatureObject = await props.wallet.signTransaction(tx);
      await signatureObject.confirm("finalized");
      console.log("Invite TX sent");
    }
  };

  const rejectPeer = async (peer: PublicKey) => {
    if (props.wallet.publicKey && peer && props.stem.raw) {
      const tx = await props.stem.raw.createRejectTx(peer);
      const signatureObject = await props.wallet.signTransaction(tx);
      await signatureObject.confirm("finalized");
      console.log("Reject TX sent");
    }
  };
  const acceptPeer = async (peer: PublicKey) => {
    if (props.wallet.publicKey && peer && props.stem.raw) {
      const tx = await props.stem.raw.createAcceptTx(peer);
      const signatureObject = await props.wallet.signTransaction(tx);
      await signatureObject.confirm("finalized");
      console.log("Accept TX sent");
    }
  };

  const chatPeer = ref<PublicKey | null>(null);

  const chat = props.useChat(computed(() => chatPeer.value));

  const message = ref<string>("");
  const canSendMessage = ref(true);

  const handleSendMessage = async () => {
    if (message.value.trim() && chatPeer.value) {
      const tx = await props.stem.raw.createSendMessageTx(chatPeer.value, message.value);
      message.value = "";
      canSendMessage.value = false;
      const signatureObject = await props.wallet.signTransaction(tx);
      await signatureObject.confirm("finalized");
      console.log("Send message TX sent");
      canSendMessage.value = true;
    }
  };

  const handleOpenChat = (peer: PublicKey) => {
    console.log("handleOpenChat called with peer:", peer.toBase58());
    chatPeer.value = peer;
    // On mobile devices, close the menu after selecting a chat
    if (isMobile.value) {
      toggleMenu();

    }
  };

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
  .chat-page {
    height: calc(var(--vh, 1vh) * 100);
    background-color: var(--black-color);
  }

  .page-container {
    display: grid;
    grid-template-columns: 245px 1fr;
    height: 100vh;
    width: 100vw;
    min-width: 0;
    overflow: hidden;
    transition: grid-template-columns 0.3s ease;
    position: relative;
  }

  .page-container.menu-collapsed {
    grid-template-columns: 80px 1fr;
  }

  .page-container.mobile-menu-open {
    grid-template-columns: 1fr;
  }

  .menu-container {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--purple-color);
    position: relative;
    overflow: hidden;
    padding-top: 50px;
    background-color: var(--black-color);
    z-index: 1000;
  }

  .menu-container.mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 2000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .page-container.mobile-menu-open .menu-container.mobile-menu {
    transform: translateX(0);
  }

  /* Свернутое состояние меню */
  .collapsed-menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 15px 5px;
    height: 100%;
  }

  .user-avatar-collapsed {
    margin-bottom: 20px;
    padding: 8px;
    border-radius: 50%;
    background: rgba(150, 70, 253, 0.1);
  }

  .collapsed-divider {
    width: 100%;
    height: 1px;
    background-color: var(--purple-color);
    margin: 15px 0;
  }

  .collapsed-section {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .collapsed-section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--white-color);
    margin-bottom: 8px;
  }

  .collapsed-chats {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }

  .collapsed-chat-item {
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .collapsed-chat-item:hover {
    background: rgba(150, 70, 253, 0.1);
    transform: scale(1.1);
  }

  .collapsed-chat-item.active-chat {
    border-color: var(--purple-color);
    background: rgba(150, 70, 253, 0.2);
  }

  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1500;
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
    /* flex: 1;
  overflow-y: auto; */
    height: calc(100vh - 170px);
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
    height: calc(var(--vh, 1vh) * 100);
    background-color: rgb(31, 30, 30);
    min-width: 0;
  }

  .chat-container-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: rgb(31, 30, 30);
    min-width: 0;
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
    min-width: 0;
  }

  .chat-input {
    padding: 20px;
    border-top: 1px solid var(--purple-color);
    display: flex;
    gap: 10px;
    flex-shrink: 0;
    align-items: center;
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
    background-color: #9646fdcc;
  }

  .chat-input button:disabled {
    cursor: not-allowed;
  }

  .send-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-icon img {
    width: 19px;
    height: 19px;
    margin-right: 2px;
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

  .debug-info {
    padding: 20px;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid #ffc107;
    border-radius: 8px;
    color: #ffc107;
    font-family: monospace;
    font-size: 14px;
  }

  .debug-info p {
    margin: 5px 0;
  }

/* HTML: <div class="loader"></div> */
.loader {
  width: 35px;
  aspect-ratio: 1;
  color: var(--purple-color);
  background: conic-gradient(currentColor 0 270deg,#0000 0);
  border-radius: 50%;
  animation: l14-0 4s infinite linear;
}
.loader::before {
  content: "";
  display: block;
  height: 50%;
  width: 50%;
  border-top-left-radius: 100px;
  background: currentColor;
  animation: l14 0.5s infinite alternate;
}
@keyframes l14-0 {
    0%,24.99%  {transform: rotate(0deg)}
    25%,49.99% {transform: rotate(90deg)}
    50%,74.99% {transform: rotate(180deg)}
    75%,100%   {transform: rotate(270deg)}
}
@keyframes l14 {
    100%  {transform: translate(-10px,-10px)}
}

  /* Мобильные стили */
  @media (max-width: 768px) {
    .page-container {
      grid-template-columns: 1fr;
    }

    .page-container.menu-collapsed {
      grid-template-columns: 1fr;
    }

    .menu-container {
      display: none;
    }

    .menu-container.mobile-menu {
      display: flex;
    }

    .mobile-menu-button {
      position: absolute;
      left: 15px;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      background-color: var(--purple-color);
      color: var(--white-color);
      border: none;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 100;
    }

    .mobile-menu-button:hover {
      background-color: rgba(150, 70, 253, 0.8);
      transform: translateY(-50%) scale(1.1);
    }

    .chat-header {
      padding: 15px;
      position: relative;
    }

    .chat-peer-info {
      margin-left: 60px;
    }

    .chat-placeholder {
      position: relative;
    }

    .placeholder-menu-button {
      position: absolute;
      top: 20px;
      left: 20px;
      transform: none;
    }

    .placeholder-menu-button:hover {
      transform: scale(1.1);
    }

    .collapsed-menu {
      padding: 15px 5px;
    }

    .user-avatar-collapsed {
      margin-bottom: 20px;
      padding: 8px;
    }

    .collapsed-divider {
      margin: 15px 0;
    }

    .collapsed-section-title {
      font-size: 16px;
      margin-bottom: 8px;
    }

    .collapsed-chats {
      gap: 12px;
    }

    .collapsed-chat-item {
      padding: 6px;
    }

    .chat-input {
      padding: 15px;
    }

    .chat-input .send-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--purple-color);
      color: var(--white-color);
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .chat-input .send-button:hover:not(:disabled) {
      background-color: rgba(150, 70, 253, 0.8);
      transform: scale(1.1);
    }

    .chat-input .send-button:disabled {
      cursor: not-allowed;
    }

    .chat-messages {
      padding: 15px;
    }

    .placeholder-icon {
      font-size: 48px;
    }

    .placeholder-content h3 {
      font-size: 20px;
    }

    .placeholder-content p {
      font-size: 14px;
    }
  }

  @media (max-width: 443px) {
    .chat-input {
      padding: 10px;
    }
    .chat-input .send-button {
      width: 35px;
      height: 35px;
    }
  }

  @media (max-width: 370px) {
    .chat-header {
      padding: 8px;
    }
    .chat-messages {
      padding: 5px;
    }
  }
</style>
