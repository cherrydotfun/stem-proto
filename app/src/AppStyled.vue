<template>
  <div>
    <div class="page-container">
      <div class="menu-container">
        <template v-if="!keypair">
          <div class="auth-container">
            <div v-if="hasSavedKeypair">
              <h2>You have a saved key</h2>
              <div>
                <button @click="loadKeypair">Load key from storage</button>
              </div>
            </div>
            <div>
              <button @click="generateKeypair">Create new key</button>
            </div>
          </div>
        </template>
        <template v-else-if="!walletDescriptor.isRegistered">
          <div class="auth-container">
            <div>Account is not registered in Cherry chat.</div>
            <button @click="register">Register</button>

            <button @click="requestAirdrop">Request Airdrop</button>
          </div>
        </template>
        <template v-else>
          <MenuComponent 
            :userKey="publicKey?.toBase58() || ''" 
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
    <!-- <div v-if="!keypair">
      <div v-if="hasSavedKeypair">
        <h2>You have a saved keypair</h2>
        <div>
          <button @click="loadKeypair">Load Keypair from storage</button>
        </div>
      </div>
      <div>
        <button @click="generateKeypair">Generate new keypair</button>
      </div>
    </div> -->

    <!-- <div v-if="keypair">
      <button @click="generateKeypair">Generate new keypair</button>
      <div>Public key: {{ keypair.publicKey.toBase58() }}</div> -->
      <!-- {{ myAccountInfo }} -->
      <!-- <div v-if="myAccountInfo.isRegistered">
        Balance: {{ solana.balance_sol(myAccountInfo.accountInfo) }} SOL | (-{{
          1 - solana.balance_sol(myAccountInfo.accountInfo)
        }}
        SOL) |(-${{
          (1 - solana.balance_sol(myAccountInfo.accountInfo)) * 145
        }})
      </div>
      <div v-else>Account is not initialized. Request Airdrop before.</div>
    </div>
    <div>
      <button @click="requestAirdrop">Request Airdrop</button>
    </div>
    <hr />
    <div v-if="!walletDescriptor.isRegistered">
      <div>Account is not registered in Cherry chat.</div>
      <button @click="register">Register</button>
    </div>
    <div v-else>
      <h2>Your peers</h2>
      <div
        v-for="peer in walletDescriptor.data?.peers"
        :key="peer.pubkey.toBase58()"
      >
        <div>
          <PubKey :pubkey="peer.pubkey" />
          <b>[{{ PeerState[peer.status] }}]</b>
          <span v-if="peer.status === PeerState.Requested">
            <button @click="acceptPeer(peer.pubkey)">Accept</button>
            <button @click="rejectPeer(peer.pubkey)">Reject</button>
          </span>
          <span v-if="peer.status === PeerState.Accepted">
            <button @click="openChat(peer.pubkey)">Open chat</button>
          </span>
        </div>
      </div>
      <div>
        <input type="text" v-model="invitee" />
        <button @click="invite">Invite peer</button>
      </div>
    </div>
  </div>
  <hr />
  <div v-if="chatPeer">
    <div>
      Chat with {{ chatPeer.toBase58().slice(0, 4) }}...{{
        chatPeer.toBase58().slice(-4)
      }}
    </div>
    <div>
      <chat :chat="chatData" :publicKey="publicKey" />
    </div>
    <div>
      <input type="text" v-model="message" />
      <button @click="sendMessage">Send message</button>
    </div>-->


    
  </div> 
</template>
<script setup lang="ts">
  // import { Stem } from "~/utils/stem";
  import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
  import {
    getAccountInfo,
    getRawSolana,
    getWalletDescriptor,
    getChatData,
  } from "./composables/stem";
  import { Stem, PeerState } from "./utils/stem";
  import { ref, computed } from "vue";
  import PubKey from "./components/PubKey.vue";
  import Chat from "./components/chat.vue";
  import MenuComponent from "./components/MenuComponent.vue";
  const solana = getRawSolana();

  const keypair = ref<Keypair | null>(null);
  const publicKey = computed(() => keypair.value?.publicKey || null);
  const myAccountInfo = getAccountInfo(publicKey);

  // let stem = null;

  const _data = localStorage.getItem("keypair");
  const hasSavedKeypair = ref<boolean>(!!_data);

  const loadKeypair = async () => {
    const _data = localStorage.getItem("keypair");
    if (_data) {
      console.log("Key found. Loading from local storage.");
      const parsedData = JSON.parse(_data);

      keypair.value = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(parsedData.secretKey, "base64"))
      );
      console.log("Key loaded from local storage.");
      // await requestAirdrop();
    }
  };

  const generateKeypair = async () => {
    keypair.value = Keypair.generate();
    const savedData = {
      secretKey: Buffer.from(keypair.value.secretKey).toString("base64"),
      publicKey: keypair.value.publicKey.toBase58(),
    };
    console.log(savedData);
    localStorage.setItem("keypair", JSON.stringify(savedData));
    console.log("Key saved to local storage.");
    // await requestAirdrop();
  };

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

  const register = async () => {
    if (keypair.value) {
      try {
        // Проверяем баланс
        const balance = await solana.connection.getBalance(keypair.value.publicKey);
        if (balance < LAMPORTS_PER_SOL * 0.1) { // Минимум 0.1 SOL
          await requestAirdrop();
        }
        
        await Stem.register(solana.connection, keypair.value);
      } catch (error) {
        console.error("Registration error:", error);
        if (error instanceof Error) {
          alert(`Registration error: ${error.message}`);
        }
      }
    }
  };

  const invite = (invitee: string) => {
    const inviteePubkey = new PublicKey(invitee);
    if (keypair.value && inviteePubkey) {
      Stem.invite(solana.connection, keypair.value, inviteePubkey);
    }
  };
  const rejectPeer = (peer: PublicKey) => {
    if (keypair.value && peer) {
      Stem.reject(solana.connection, keypair.value, peer);
    }
  };
  const acceptPeer = (peer: PublicKey) => {
    if (keypair.value && peer) {
      Stem.accept(solana.connection, keypair.value, peer);
    }
  };

  const chatPeer = ref<PublicKey | null>(null);

  const chatData = getChatData(publicKey, chatPeer);

  const openChat = (peer: PublicKey) => {
    chatPeer.value = peer;
    console.log("set current chat peer", peer.toBase58());
  };

  const message = ref<string>("");
  const sendMessage = async () => {
    if (keypair.value && chatPeer.value) {
      await Stem.sendMessage(
        solana.connection,
        keypair.value,
        chatPeer.value,
        message.value
      );
      message.value = "";
    }
  };
</script>

<style scoped>
.page-container {
  background-color: var(--black-color);
  display: grid;
  grid-template-columns: 20% 80%;
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
  background-color: rgb(31, 30, 30);
}
</style>