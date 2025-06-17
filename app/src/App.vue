<template>
  <div>
    <div v-if="!publicKey">
      <button @click="selectWallet('Local')">Connect to local wallet</button>
      <button @click="selectWallet('Phantom')">
        Connect to phantom wallet
      </button>
      <button @click="connect">Connect</button>
    </div>

    <div v-if="publicKey">
      <!-- <button @click="generateKeypair">Generate new keypair</button> -->
      <div>Public key: {{ wallet.publicKey }}</div>
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
  import { useLocalWallet } from "./composables/localWallet";
  import { usePhantomWallet } from "./composables/phantomWallet";

  import { useWallet } from "./composables/wallet";

  const { wallet, names, selectWallet } = useWallet([
    useLocalWallet(),
    usePhantomWallet(),
  ]);

  // console.log(wallet.value);

  import { PublicKey } from "@solana/web3.js";
  import {
    getAccountInfo,
    getRawSolana,
    getWalletDescriptor,
    getChatData,
  } from "./composables/stem";
  import { Stem, PeerState } from "./utils/stem";
  import { ref, computed, unref } from "vue";
  import PubKey from "./components/PubKey.vue";
  import Chat from "./components/chat.vue";

  const solana = getRawSolana();

  const publicKey = computed(() => wallet.value?.publicKey || null);
  const myAccountInfo = getAccountInfo(publicKey);

  const requestAirdrop = async () => {
    console.log("Requesting airdrop");
    if (publicKey.value) {
      await solana.requestAirdrop(publicKey.value);
    }
  };

  const connect = () => {
    wallet.value.connect();
  };

  const walletDescriptor = getWalletDescriptor(publicKey);

  const register = () => {
    if (wallet.value.publicKey) {
      Stem.register(unref(wallet));
    }
  };

  const invitee = ref<string>("");
  const invite = () => {
    const inviteePubkey = new PublicKey(invitee.value);
    if (wallet.value.publicKey && inviteePubkey) {
      Stem.invite(wallet.value, inviteePubkey);
    }
  };
  const rejectPeer = (peer: PublicKey) => {
    if (wallet.value.publicKey && peer) {
      Stem.reject(wallet.value, peer);
    }
  };
  const acceptPeer = (peer: PublicKey) => {
    if (wallet.value.publicKey && peer) {
      Stem.accept(wallet.value, peer);
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
    if (wallet.value.publicKey && chatPeer.value) {
      await Stem.sendMessage(wallet.value, chatPeer.value, message.value);
      message.value = "";
    }
  };
</script>
