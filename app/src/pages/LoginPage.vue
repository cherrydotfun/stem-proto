<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Cherry Chat</h1>
        <p>Connect your wallet to start chatting</p>
      </div>
      <!-- Select wallet -->
      <div v-if="!publicKey" class="wallet-selection">
        <h3>Select a wallet</h3>
        <div class="wallet-buttons">
          <button
            v-for="name in names"
            @click="_selectWallet(name)"
            :key="name"
            class="wallet-button"
          >
            <span class="wallet-icon">{{
              name === "Phantom" ? "👻" : "🔑"
            }}</span>
            {{ name === "Phantom" ? "Connect Phantom Wallet" : "Create a Test Wallet" }}
          </button>
        </div>
      </div>

      <!-- User info -->
      <div v-if="publicKey" class="user-info">
        <div class="user-avatar">
          <AvatarComponent :userKey="publicKey.toBase58()" />
        </div>
        <div class="user-details">
          <div class="user-key" @click="copyKey(publicKey as PublicKey)" :title="'Click to copy'">
            {{ publicKey.toBase58().slice(0, 4) }}...{{
              publicKey.toBase58().slice(-4)
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

      <!-- airdrop -->
      <div
        v-if="publicKey && !myAccount.balance"
        class="registration"
      >
        <div class="registration-message">
          <p>Your wallet has no SOL</p>
          <p class="registration-subtitle">
            To start chatting, please get some SOL.
          </p>
        </div>
        <div class="registration-actions">
          <button @click="requestAirdrop" class="airdrop-button">
            Get SOL (devnet)
          </button>
        </div>
      </div>  
      <!-- Registration -->
      <div
        v-if="publicKey && myAccount.balance && !stem.isRegistered"
        class="registration"
      >
        <div class="registration-message">
          <p>Your wallet is not registered yet</p>
          <p class="registration-subtitle">
            To start chatting, please register and make sure your wallet has enough SOL.
          </p>
        </div>
        <div class="registration-actions">
          <button @click="register" class="register-button">Register</button>
        </div>
      </div>  

      <!-- Success registration -->
      <div v-if="publicKey && stem.isRegistered" class="success">
        <div class="success-message">
          <p>✅ Account registered successfully!</p>
          <p>Redirecting to chat...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AvatarComponent from "../components/UI/AvatarComponent.vue";
  import type { PublicKey } from "@solana/web3.js";

  import { copyKey } from "../utils/helpers";
  import { onMounted, onUnmounted } from "vue";

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

  import { Signature } from "../utils/solana";


  const props = defineProps<{
    names: string[];
    _selectWallet: (name: string) => void;
    connection: any;
    publicKey: PublicKey | null;
    myAccount: any;
    stem: any
    wallet: any
  }>();

  const requestAirdrop = async () => {
    console.log("Requesting airdrop");
    if (props.publicKey && props.myAccount && props.myAccount.raw) {
      try {
        const signatureObject = await props.connection.requestAirdrop(props.myAccount.raw, 1);
        console.log("Waiting for airdrop to be confirmed");
        await signatureObject.confirm("finalized");
        console.log("Airdrop finalized");
      } catch (error) {
        console.error("Airdrop failed:", error);
        if (error instanceof Error) {
          alert(`Error getting SOL: ${error.message}`);
        }
      }
    }
  };

    // register
    const register = async () => {
    if (props.wallet.publicKey && props.stem.raw) {
      const tx = await props.stem.raw.createRegisterTx();
      const signatureObject = await props.wallet.signTransaction(tx);
      await signatureObject.confirm("finalized");
      console.log("Register TX sent", signatureObject);
    }
  };

</script>

<style scoped>
  .login-container {
    min-height: calc(var(--vh, 1vh) * 100);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--black-color);
    padding: 20px;
  }

  .login-card {
    background: rgb(31, 30, 30);
    border: 1px solid var(--purple-color);
    border-radius: 20px;
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .login-header h1 {
    color: var(--white-color);
    margin-bottom: 10px;
    font-size: 2.5rem;
    font-weight: bold;
  }

  .login-header p {
    color: var(--purple-color);
    margin-bottom: 30px;
  }

  .wallet-selection h3 {
    margin-bottom: 20px;
    color: var(--white-color);
  }

  .wallet-buttons {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .wallet-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 15px 20px;
    border: 2px solid var(--purple-color);
    border-radius: 12px;
    background: transparent;
    color: var(--white-color);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .wallet-button:hover {
    background: rgba(150, 70, 253, 0.1);
    transform: translateY(-2px);
  }

  .wallet-icon {
    font-size: 20px;
  }

  .user-info {
    margin: 30px 0;
    padding: 20px;
    background: rgba(150, 70, 253, 0.1);
    border: 1px solid var(--purple-color);
    border-radius: 12px;
  }

  .user-avatar {
    margin-bottom: 15px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .user-key {
    font-family: monospace;
    font-size: 18px;
    color: var(--white-color);
    cursor: pointer;
    padding: 8px;
    background: rgba(150, 70, 253, 0.2);
    border-radius: 8px;
    transition: background 0.3s ease;
  }

  .user-key:hover {
    background: rgba(150, 70, 253, 0.3);
  }

  .user-balance {
    font-size: 16px;
    color: var(--purple-color);
  }

  .registration {
    margin-top: 30px;
    padding: 20px;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid #ffc107;
    border-radius: 12px;
  }

  .registration-message p {
    margin: 5px 0;
    color: #ffc107;
  }

  .registration-subtitle {
    font-size: 14px;
    opacity: 0.8;
  }

  .registration-actions {
    margin-top: 20px;
    display: flex;
    gap: 15px;
    justify-content: center;
  }

  .register-button,
  .airdrop-button {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .register-button {
    background: var(--purple-color);
    color: var(--white-color);
  }

  .register-button:hover {
    background: rgba(150, 70, 253, 0.8);
    transform: translateY(-2px);
  }

  .airdrop-button {
    background: #28a745;
    color: var(--white-color);
  }

  .airdrop-button:hover {
    background: #218838;
    transform: translateY(-2px);
  }

  .success {
    margin-top: 30px;
    padding: 20px;
    background: rgba(40, 167, 69, 0.1);
    border: 1px solid #28a745;
    border-radius: 12px;
  }

  .success-message p {
    margin: 5px 0;
    color: #28a745;
    font-size: 16px;
  }

  /* Мобильные стили */
  @media (max-width: 768px) {
    .login-container {
      padding: 10px;
    }

    .login-card {
      padding: 30px 20px;
      border-radius: 15px;
    }

    .login-header h1 {
      font-size: 2rem;
    }

    .login-header p {
      font-size: 14px;
    }

    .wallet-selection h3 {
      font-size: 18px;
    }

    .wallet-button {
      padding: 18px 20px;
      font-size: 16px;
      gap: 15px;
    }

    .wallet-icon {
      font-size: 24px;
    }

    .user-info {
      margin: 20px 0;
      padding: 15px;
    }

    .user-key {
      font-size: 16px;
      padding: 12px;
    }

    .user-balance {
      font-size: 14px;
    }

    .registration {
      margin-top: 20px;
      padding: 15px;
    }

    .registration-actions {
      flex-direction: column;
      gap: 10px;
    }

    .register-button,
    .airdrop-button {
      padding: 15px 20px;
      font-size: 16px;
      width: 100%;
    }

    .success {
      margin-top: 20px;
      padding: 15px;
    }

    .success-message p {
      font-size: 14px;
    }
  }
</style>
