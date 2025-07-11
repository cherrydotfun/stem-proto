<template>

  <div class="menu">
    <div class="chats-list">
      <div class="section-title">Chats</div>
      <!-- <div>
        <pre>{{ JSON.stringify(chats, null, 2) }}</pre>
      </div> -->
      <div
        v-if="acceptedPeers.length"
        v-for="peer in acceptedPeers"
        :key="peer.pubkey?.toBase58()"
        @click="openChat(peer.pubkey)"
        :class="{
          'active-chat': currentChat?.toBase58() === peer.pubkey?.toBase58(),
          'chat-item': true,
        }"
      >
        <AvatarComponent :userKey="peer.pubkey?.toBase58()" />
        <div class="peer-info">
          <div class="peer-key">
            {{ peer.pubkey?.toBase58().slice(0, 4) }}...{{
              peer.pubkey?.toBase58().slice(-4)
            }}
          </div>
        </div>
      </div>
      <div v-else class="no-chats">No accepted chats yet</div>
    </div>
    <div class="invites-list" v-if="requestedPeers.length">
      <div class="section-title">Chat Requests</div>
      <div
        v-for="peer in requestedPeers"
        :key="peer.pubkey?.toBase58()"
        class="invite-item"
      >
        <AvatarComponent :userKey="peer.pubkey?.toBase58() || ''" />
        <div class="peer-info">
          <div class="peer-key">
            {{ peer.pubkey?.toBase58().slice(0, 4) }}...{{
              peer.pubkey?.toBase58().slice(-4)
            }}
          </div>
          <div class="invite-actions">
            <span v-if="!reacted[peer.pubkey?.toBase58() || '']">
              <button @click="acceptPeer(peer.pubkey)" class="accept-button">
                Accept
              </button>
              <button @click="rejectPeer(peer.pubkey)" class="reject-button">
                Reject
              </button>
            </span>
            <span v-else>
              <div>
                <div class="loader"></div>
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="invites-list" v-if="invitedPeers.length">
      <div class="section-title">Invited</div>
      <div
        v-for="peer in invitedPeers"
        :key="peer.pubkey?.toBase58()"
        class="invite-item"
      >
        <AvatarComponent :userKey="peer.pubkey?.toBase58() || ''" />
        <div class="peer-info">
          <div class="peer-key">
            {{ peer.pubkey?.toBase58().slice(0, 4) }}...{{
              peer.pubkey?.toBase58().slice(-4)
            }}
          </div>
        </div>
      </div>
    </div>
    <div class="invite-form" v-show="!isCollapsed">
      <input
        type="text"
        v-model="invitee"
        placeholder="Enter public key"
        class="invite-input"
      />
      <button @click="invite" class="invite-button">Invite</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from "vue";
  import { PublicKey } from "@solana/web3.js";

  import { PeerStatus } from "../utils/types";

  import AvatarComponent from "./UI/AvatarComponent.vue";

  const reacted = reactive<{
    [key: string]: boolean;
  }>({});

  interface MenuComponentProps {
    userKey: string;
    chats:
      | {
          pubkey: PublicKey | null;
          status: PeerStatus | undefined;
        }[]
      | undefined;
    currentChat: PublicKey | null;
    isCollapsed?: boolean;
  }


  const props = defineProps<MenuComponentProps>();

  const emit = defineEmits<{
    (e: "openChat", peer: PublicKey): void;
    (e: "invite", invitee: string): void;
    (e: "acceptPeer", peer: PublicKey): void;
    (e: "rejectPeer", peer: PublicKey): void;
  }>();

  // const publicKey = computed(() => new PublicKey(props.userKey));
  const invitee = ref<string>("");

  const acceptedPeers = computed(() => {
    if (!props.chats) return [];
    return props.chats.filter((peer) => peer.status === PeerStatus.Accepted);
  });

  const requestedPeers = computed(() => {
    if (!props.chats) return [];
    return props.chats.filter((peer) => peer.status === PeerStatus.Requested);
  });

  const invitedPeers = computed(() => {
    if (!props.chats) return [];
    return props.chats.filter((peer) => peer.status === PeerStatus.Invited);
  });

  const openChat = (peer: PublicKey | null) => {
    if (!peer) return;
    emit("openChat", peer);
  };

  const invite = () => {
    if (invitee.value) {
      emit("invite", invitee.value);
      invitee.value = "";
    }
  };

  const acceptPeer = (peer: PublicKey | null) => {
    if (!peer) return;
    emit("acceptPeer", peer);
    reacted[peer.toBase58()] = true;
  };

  const rejectPeer = (peer: PublicKey | null) => {
    if (!peer) return;
    emit("rejectPeer", peer);
    reacted[peer.toBase58()] = true;
  };
</script>

<style scoped>
  .menu {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    height: 100%;
  }

  .user-avatar-collapsed {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0 10px 0;
  }

  .chat-item-collapsed {
    justify-content: center;
    padding: 10px 0;
  }

  .chat-item-collapsed .peer-info {
    display: none !important;
  }

  .scrollable-content {
    flex: 1;
    overflow-y: auto;
  }

  .chats-list {
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

  .active-chat {
    background-color: var(--green-color);
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
    /* height: 100%; */
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

  .invite-actions span {
    display: flex;
    gap: 10px;
  }

  .accept-button,
  .reject-button {
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

  .accept-button:hover,
  .reject-button:hover {
    opacity: 0.9;
  }

  .invite-form {
    margin-top: auto;
    padding: 20px;
    border-top: 1px solid var(--purple-color);
    background: var(--black-color);
    display: flex;
    flex-direction: column;
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

  .menu.collapsed .section-title {
    text-align: center;
    margin-bottom: 10px;
  }
  .menu.collapsed .chats-list {
    padding: 10px 0;
  }
  .menu.collapsed .chat-item {
    justify-content: center;
  }


  /* HTML: <div class="loader"></div> */
.loader {
  width: 40px;
  aspect-ratio: 4;
  background: radial-gradient(circle closest-side,#28a745 90%,#28a74500) 0/calc(100%/3) 100% space;
  clip-path: inset(0 100% 0 0);
  animation: l1 1s steps(4) infinite;
}
@keyframes l1 {to{clip-path: inset(0 -34% 0 0)}}

  /* mobile styles */
  @media (max-width: 768px) {
    .menu {
      padding: 10px;
    }

    .chats-list {
      padding: 15px;
    }

    .chat-item {
      padding: 15px;
      gap: 20px;
      margin-bottom: 10px;
    }

    .chat-item-collapsed {
      padding: 15px 0;
    }

    .peer-info {
      flex: 1;
    }

    .peer-key {
      font-size: 16px;
    }

    .invite-item {
      padding: 15px;
      gap: 20px;
      margin-bottom: 10px;
    }

    .invite-actions {
      gap: 15px;
    }

    .accept-button,
    .reject-button {
      padding: 12px 20px;
      font-size: 14px;
      min-width: 80px;
    }

    .invite-form {
      padding: 15px;
      gap: 15px;
    }

    .invite-input {
      padding: 15px;
      font-size: 16px;
    }

    .invite-button {
      padding: 15px 20px;
      font-size: 16px;
    }

    .section-title {
      font-size: 18px;
      margin-bottom: 20px;
    }

    .no-chats {
      font-size: 16px;
      /* padding: 20px; */
      margin-bottom: 20px;
    }

    .user-avatar-collapsed {
      padding: 30px 0 20px 0;
    }
  }
</style>
