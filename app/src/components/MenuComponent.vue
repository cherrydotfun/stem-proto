<template>
  <div class="menu">
    <div class="user-info">
      <AvatarComponent :userKey="props.userKey" />
      <div class="user-key" @click="copyKey" :title="'Нажмите чтобы скопировать'">
        {{ props.userKey.slice(0, 4) }}...{{
        props.userKey.slice(-4)
      }}
      </div>
    </div>
    <div class="chats-list">
      <div v-if="walletDescriptor.isRegistered">
        <div v-for="peer in acceptedPeers" :key="peer.pubkey.toBase58()" class="chat-item" @click="openChat(peer.pubkey)">
          <AvatarComponent :userKey="peer.pubkey.toBase58()" />
          <div class="peer-info">
            <div class="peer-key">{{ peer.pubkey.toBase58().slice(0, 4) }}...{{ peer.pubkey.toBase58().slice(-4) }}</div>
            <div class="peer-status">Активный чат</div>
          </div>
        </div>
      </div>
      <div v-else class="no-chats">
        Нет активных чатов
      </div>
    </div>
    <div class="invites-list" v-if="walletDescriptor.isRegistered">
      <div class="section-title">Запросы на чат</div>
      <div v-for="peer in requestedPeers" :key="peer.pubkey.toBase58()" class="invite-item">
        <AvatarComponent :userKey="peer.pubkey.toBase58()" />
        <div class="peer-info">
          <div class="peer-key">{{ peer.pubkey.toBase58().slice(0, 4) }}...{{ peer.pubkey.toBase58().slice(-4) }}</div>
          <div class="invite-actions">
            <button @click="acceptPeer(peer.pubkey)" class="accept-button">Принять</button>
            <button @click="rejectPeer(peer.pubkey)" class="reject-button">Отклонить</button>
          </div>
        </div>
      </div>
      <div v-if="!requestedPeers.length" class="no-invites">
        Нет активных запросов
      </div>
    </div>
    <div class="invite-form">
      <input 
        type="text" 
        v-model="invitee" 
        placeholder="Введите публичный ключ"
        class="invite-input"
      />
      <button @click="invite" class="invite-button">Пригласить</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { PublicKey } from "@solana/web3.js";
import AvatarComponent from './UI/AvatarComponent.vue';
import { getWalletDescriptor } from '../composables/stem';
import { PeerState } from '../utils/stem';

interface MenuComponentProps {
  userKey: string;
}

interface Peer {
  pubkey: PublicKey;
  status: number;
}

interface WalletDescriptorData {
  peers: Peer[];
}

const props = defineProps<MenuComponentProps>();

const emit = defineEmits<{
  (e: 'openChat', peer: PublicKey): void;
  (e: 'invite', invitee: string): void;
  (e: 'acceptPeer', peer: PublicKey): void;
  (e: 'rejectPeer', peer: PublicKey): void;
}>();

const publicKey = computed(() => new PublicKey(props.userKey));
const walletDescriptor = getWalletDescriptor(publicKey);
const invitee = ref<string>('');

const acceptedPeers = computed(() => {
  const data = walletDescriptor.value.data as WalletDescriptorData | null;
  if (!data?.peers) return [];
  return data.peers.filter(peer => peer.status === PeerState.Accepted);
});

const requestedPeers = computed(() => {
  const data = walletDescriptor.value.data as WalletDescriptorData | null;
  if (!data?.peers) return [];
  return data.peers.filter(peer => peer.status === PeerState.Requested);
});

const openChat = (peer: PublicKey) => {
  emit('openChat', peer);
};

const invite = () => {
  if (invitee.value) {
    emit('invite', invitee.value);
    invitee.value = '';
  }
};

const acceptPeer = (peer: PublicKey) => {
  emit('acceptPeer', peer);
};

const rejectPeer = (peer: PublicKey) => {
  emit('rejectPeer', peer);
};

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(props.userKey);
    alert('Ключ скопирован в буфер обмена');
  } catch (err) {
    console.error('Ошибка при копировании:', err);
    alert('Не удалось скопировать ключ');
  }
};
</script>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.user-info {
  display: flex;
  flex-direction: row;
  margin: 20px;
  align-items: center;
  gap: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--purple-color);
}

.chats-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-item:hover {
  background-color: rgba(150, 70, 253, 0.1);
}

.peer-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.peer-key {
  font-weight: 500;
  color: var(--white-color);
}

.peer-status {
  font-size: 0.9em;
  color: var(--purple-color);
}

.no-chats {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--white-color);
  opacity: 0.7;
}

.invites-list {
  padding: 20px;
  border-top: 1px solid var(--purple-color);
}

.section-title {
  color: var(--white-color);
  font-size: 1.1em;
  margin-bottom: 15px;
}

.invite-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  border-radius: 8px;
}

.invite-actions {
  display: flex;
  gap: 10px;
}

.accept-button, .reject-button {
  padding: 5px 10px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9em;
  transition: opacity 0.2s;
}

.accept-button {
  background-color: var(--purple-color);
  color: var(--white-color);
}

.reject-button {
  background-color: transparent;
  color: var(--white-color);
  border: 1px solid var(--purple-color);
}

.accept-button:hover, .reject-button:hover {
  opacity: 0.9;
}

.no-invites {
  color: var(--white-color);
  opacity: 0.7;
  text-align: center;
  padding: 10px;
}

.invite-form {
  padding: 20px;
  border-top: 1px solid var(--purple-color);
  display: flex;
  gap: 10px;
}

.invite-input {
  flex: 1;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid var(--purple-color);
  background-color: var(--black-color);
  color: var(--white-color);
}

.invite-button {
  padding: 10px 20px;
  border-radius: 5px;
  background-color: var(--purple-color);
  color: var(--white-color);
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}

.invite-button:hover {
  opacity: 0.9;
}

.user-key {
  cursor: pointer;
  transition: opacity 0.2s;
}

.user-key:hover {
  opacity: 0.8;
}
</style>