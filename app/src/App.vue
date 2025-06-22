<template>
  <div>
    <div class="page-container" :class="{ 'menu-collapsed': isMenuCollapsed }">
      <div class="menu-container">
        <div class="menu-toggle" @click="toggleMenu">
          <span v-if="isMenuCollapsed">☰</span>
          <span v-else>✕</span>
        </div>
        
        <template v-if="!publicKey">
          <div class="auth-container">
            <button
              v-for="name in names"
              @click="_selectWallet(name)"
              :key="name"
            >
              Connect to {{ name }} wallet
            </button>
          </div>
        </template>
        <template v-else>
          <div class="user-info">
            <AvatarComponent :userKey="publicKey.toBase58()" />
            <div class="user-info-text" v-show="!isMenuCollapsed">
              <div class="user-key" @click="copyKey" :title="'Click to copy'">
                {{ publicKey.toBase58().slice(0, 4) }}...{{
                  publicKey.toBase58().slice(-4)
                }}
              </div>
              <div class="user-balance">
                {{
                  (myAccountInfo.accountInfo?.lamports || 0) / LAMPORTS_PER_SOL
                }}
                SOL
              </div>
            </div>
          </div>
        </template>
        <template v-if="publicKey && !walletDescriptor.isRegistered">
          <div class="auth-container" v-show="!isMenuCollapsed">
            <div>Account is not registered in Cherry chat.</div>
            <button @click="register">Register</button>

            <button @click="requestAirdrop">Request Airdrop</button>
          </div>
        </template>
        <template v-if="publicKey && walletDescriptor.isRegistered">
          <MenuComponent
            :userKey="publicKey?.toBase58() || ''"
            :currentChat="chatPeer"
            :isCollapsed="isMenuCollapsed"
            @openChat="openChat"
            @invite="invite"
            @acceptPeer="acceptPeer"
            @rejectPeer="rejectPeer"
          />
        </template>
      </div>
      <div class="chat-container">
        <div v-if="chatPeer" class="chat-container-inner">
          <div class="chat-header">
            Chat with {{ chatPeer.toBase58().slice(0, 4) }}...{{
              chatPeer.toBase58().slice(-4)
            }}
          </div>
          <div class="chat-messages">
            <chat :chat="chatData" :publicKey="publicKey" />
          </div>
          <div class="chat-input">
            <input type="text" v-model="message" />
            <button @click="sendMessage">Send</button>
          </div>
        </div>
        <div v-else class="chat-placeholder">
          Select a chat to start communication
        </div>
      </div>
    </div>
  </div>
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

  import AvatarComponent from "./components/UI/AvatarComponent.vue";

  import { useLocalWallet } from "./composables/localWallet";
  import { usePhantomWallet } from "./composables/phantomWallet";

  import { useWallet } from "./composables/wallet";

  const { wallet, names, selectWallet } = useWallet([
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

  // import { Stem } from "~/utils/stem";
  import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

  import { Stem } from "./utils/stem";
  import { ref, computed } from "vue";
  import Chat from "./components/chat.vue";
  import MenuComponent from "./components/MenuComponent.vue";
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
    if (wallet.value.publicKey) {
      Stem.register(wallet.value);
    }
  };

  const invite = async (invitee: string) => {
    const inviteePubkey = new PublicKey(invitee);
    if (wallet.value.publicKey && inviteePubkey) {
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
    if (wallet.value.publicKey && peer) {
      try {
        await Stem.reject(wallet.value, peer);
      } catch (error) {
        console.error("Reject error:", error);
        alert(`Ошибка при отклонении приглашения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    }
  };
  const acceptPeer = async (peer: PublicKey) => {
    if (wallet.value.publicKey && peer) {
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
  const sendMessage = async () => {
    if (wallet.value.publicKey && chatPeer.value) {
      await Stem.sendMessage(wallet.value, chatPeer.value, message.value);
      message.value = "";
    }
  };

  // Menu collapse state
  const isMenuCollapsed = ref(false);
  
  const toggleMenu = () => {
    isMenuCollapsed.value = !isMenuCollapsed.value;
  };
</script>

<style scoped>
  .page-container {
    background-color: var(--black-color);
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

  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: rgb(31, 30, 30);
  }

  .chat-header {
    padding: 20px;
    border-bottom: 1px solid var(--purple-color);
    font-size: 18px;
    color: var(--white-color);
    flex-shrink: 0;
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

  .chat-input button {
    padding: 10px 20px;
    border-radius: 5px;
    background-color: var(--purple-color);
    color: var(--white-color);
    border: none;
    cursor: pointer;
  }

  .chat-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--white-color);
    font-size: 18px;
  }

  .auth-container {
    padding: 20px;
    color: var(--white-color);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .auth-container h2 {
    margin-bottom: 15px;
  }

  .auth-container button {
    padding: 10px 20px;
    border-radius: 5px;
    background-color: var(--purple-color);
    color: var(--white-color);
    border: none;
    cursor: pointer;
    width: 100%;
    max-width: 300px;
  }

  .auth-container button:hover {
    opacity: 0.9;
  }

  .chat-container-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background-color: rgb(31, 30, 30);
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

  .user-info-text {
    margin-left: 15px;
  }
</style>
