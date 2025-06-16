<template>
  <div>
    <div v-if="!keypair">
      <div v-if="hasSavedKeypair">
        <h2>You have a saved keypair</h2>
        <div>
          <button @click="loadKeypair">Load Keypair from storage</button>
        </div>
      </div>
      <div>
        <button @click="generateKeypair">Generate new keypair</button>
      </div>
    </div>

    <div v-if="keypair">
      <button @click="generateKeypair">Generate new keypair</button>
      <div>Public key: {{ keypair.publicKey.toBase58() }}</div>
      <!-- {{ myAccountInfo }} -->
      <div v-if="myAccountInfo.isRegistered">
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
    </div>
  </div>
</template>
<script setup lang="ts">
  // import { Stem } from "~/utils/stem";
  import { Keypair, PublicKey } from "@solana/web3.js";
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

  const solana = getRawSolana();

  const keypair = ref<Keypair | null>(null);
  const publicKey = computed(() => keypair.value?.publicKey || null);
  const myAccountInfo = getAccountInfo(publicKey);

  // let stem = null;

  const _data = localStorage.getItem("keypair");
  const hasSavedKeypair = ref<boolean>(!!_data);

  const loadKeypair = () => {
    const _data = localStorage.getItem("keypair");
    if (_data) {
      console.log("Key found. Loading from local storage.");
      const parsedData = JSON.parse(_data);

      keypair.value = Keypair.fromSecretKey(
        Uint8Array.from(Buffer.from(parsedData.secretKey, "base64"))
      );
      console.log("Key loaded from local storage.");
      // initialized.value = true;
    }
  };

  const generateKeypair = () => {
    keypair.value = Keypair.generate();
    const savedData = {
      secretKey: Buffer.from(keypair.value.secretKey).toString("base64"),
      publicKey: keypair.value.publicKey.toBase58(),
    };
    console.log(savedData);
    localStorage.setItem("keypair", JSON.stringify(savedData));
    console.log("Key saved to local storage.");
  };

  const requestAirdrop = () => {
    console.log("Requesting airdrop");
    if (publicKey.value) {
      solana.requestAirdrop(publicKey.value);
    }
  };

  const walletDescriptor = getWalletDescriptor(publicKey);

  const register = () => {
    if (keypair.value) {
      Stem.register(solana.connection, keypair.value);
    }
  };

  const invitee = ref<string>("");
  const invite = () => {
    const inviteePubkey = new PublicKey(invitee.value);
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
