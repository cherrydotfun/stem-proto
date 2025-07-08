<template>
  <div>
    <div class="page-container">
      <div class="menu-container">
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
            <div class="user-info-text">
              <div class="user-key" @click="copyKey" :title="'Click to copy'">
                {{ publicKey.toBase58().slice(0, 4) }}...{{
                  publicKey.toBase58().slice(-4)
                }}
              </div>
              <div class="user-balance">
                {{ myAccount.balance }}
                SOL
              </div>
              <div>
                <button @click="requestAirdrop">Request Airdrop</button>
              </div>
            </div>
          </div>
        </template>
        <template v-if="publicKey && !stem.isRegistered">
          <div class="auth-container">
            <div>Account is not registered in Cherry chat.</div>

            <button @click="register">Register</button>
          </div>
        </template>
        <template v-if="publicKey && stem.isRegistered">
          <MenuComponent
            :currentChat="chatPeer"
            :chats="stem.chats"
            :userKey="publicKey?.toBase58() || ''"
            @invite="invite"
            @acceptPeer="acceptPeer"
            @rejectPeer="rejectPeer"
            @openChat="openChat"
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
            <chat :messages="chat.messages" :publicKey="publicKey" />
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
  import AvatarComponent from "./components/UI/AvatarComponent.vue";
  import { PublicKey } from "@solana/web3.js";
  import { useStem } from "./composables/stem";
  import { Account } from "./utils/solana";

  import { computed, ref } from "vue";

  const rpcUrl = import.meta.env.VITE_RPC_URL || "http://localhost:8899";
  // initSolana(rpcUrl);

  // import AvatarComponent from "./components/UI/AvatarComponent.vue";

  import { useLocalWallet } from "./composables/localWallet";
  import { usePhantomWallet } from "./composables/phantomWallet";

  import { useWallet } from "./composables/wallet";

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

  const publicKey = computed(() => wallet.value?.publicKey || null);

  const myAccount = useAccount(
    computed(() => publicKey.value),
    connection
  );

  // const connection = new Connection(rpcUrl, "ws://localhost:8900", "finalized");
  // let stem: StemLib | null = null;

  // const printAccount = () => {
  //   console.log("STEM instance", stem);
  // };

  const _selectWallet = async (name: string) => {
    selectWallet(name);
    await wallet.value?.connect();
    // solana.subscribeToAccount(publicKey.value);
    // solana.subscribeToProgram(
    //   new PublicKey("BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB")
    // );
    // solana.subscribeToLogs(
    //   // new PublicKey("BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB")
    //   publicKey.value
    // );

    // account = connection.getAccount(publicKey.value, true);
    // account.onUpdate((account) => {
    //   console.log("Account updated", account.balance);
    // });

    // stem = new StemLib(publicKey.value, connection);
    // await stem.init();
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

  import Chat from "./components/chat.vue";
  import MenuComponent from "./components/MenuComponent.vue";

  const requestAirdrop = async () => {
    console.log("Requesting airdrop");
    if (publicKey.value && myAccount && myAccount.raw) {
      try {
        await connection.requestAirdrop(myAccount.raw as Account, 1);
        console.log("Airdrop successful");
      } catch (error) {
        console.error("Airdrop failed:", error);
        if (error instanceof Error) {
          alert(`Error getting SOL: ${error.message}`);
        }
      }
    }
  };

  const { stem, useChat } = useStem(connection, publicKey);

  const register = async () => {
    if (wallet.value.publicKey && stem.raw) {
      const tx = await stem.raw.createRegisterTx();
      await wallet.value.signTransaction(tx);
      console.log("Register TX sent");
    }
  };

  const invite = async (invitee: string) => {
    const inviteePubkey = new PublicKey(invitee);
    if (wallet.value.publicKey && inviteePubkey && stem.raw) {
      const tx = await stem.raw.createInviteTx(inviteePubkey);
      await wallet.value.signTransaction(tx);
      console.log("Invite TX sent");
    }
  };
  const rejectPeer = async (peer: PublicKey) => {
    if (wallet.value.publicKey && peer && stem.raw) {
      const tx = await stem.raw.createRejectTx(peer);
      await wallet.value.signTransaction(tx);
      console.log("Reject TX sent");
    }
  };
  const acceptPeer = async (peer: PublicKey) => {
    if (wallet.value.publicKey && peer && stem.raw) {
      const tx = await stem.raw.createAcceptTx(peer);
      await wallet.value.signTransaction(tx);
      console.log("Accept TX sent");
    }
  };

  const chatPeer = ref<PublicKey | null>(null);

  const chat = useChat(computed(() => chatPeer.value));

  const openChat = (peer: PublicKey) => {
    chatPeer.value = peer;
    console.log("set current chat peer", peer.toBase58());
  };

  const message = ref<string>("");
  const sendMessage = async () => {
    if (wallet.value.publicKey && chatPeer.value && message.value && stem.raw) {
      const tx = await stem.raw.createSendMessageTx(
        chatPeer.value,
        message.value
      );
      await wallet.value.signTransaction(tx);
      console.log("Send message TX sent");
    }
  };
</script>

<style scoped>
  .page-container {
    background-color: var(--black-color);
    display: grid;
    grid-template-columns: 245px 1fr;
    height: 100vh;
    width: 100vw;
  }

  .menu-container {
    border-right: 1px solid var(--purple-color);
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: rgb(31, 30, 30);
  }

  .chat-header {
    padding: 20px;
    border-bottom: 1px solid var(--purple-color);
    font-size: 18px;
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
    position: sticky;
    bottom: 0;
  }

  .chat-input input {
    flex: 1;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid var(--purple-color);
    background-color: var(--black-color);
    color: var(--white-color);
  }

  button {
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
    background-color: rgb(31, 30, 30);
  }

  .user-info {
    padding: 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-bottom: 1px solid var(--purple-color);
  }
</style>
