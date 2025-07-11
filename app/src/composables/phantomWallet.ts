import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { ref } from "vue";
import { Signature } from "../utils/solana";

export const usePhantomWallet = (rpcUrl: string = "http://localhost:8899") => {
  const name = ref("Phantom");
  const wallet = new PhantomWalletAdapter();
  const connection = new Connection(rpcUrl);

  const publicKey = ref<PublicKey | null>(null);
  const connected = ref(false);
  const installed = ref(wallet.readyState == "Installed");

  const updateState = () => {
    publicKey.value = wallet.publicKey;
    connected.value = wallet.connected;
  };

  const connect = async () => {
    if (wallet.readyState == "Installed") {
      console.log("Connecting to", wallet.name);
      await wallet.connect();
    }
    console.log("Connected to", wallet.name, wallet.publicKey);
    updateState();
  };

  const signTransaction = async (tx: Transaction) => {
    if (!publicKey.value) {
      throw new Error("Keypair not found");
    }
    console.log("Signing transaction", publicKey.value.toBase58());

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    const signature = await wallet.sendTransaction(tx, connection, {
      minContextSlot,
    });
    // await connection.confirmTransaction({
    //   blockhash,
    //   lastValidBlockHeight,
    //   signature,
    // });
    return new Signature(signature, connection);
  };

  return { name, installed, publicKey, connect, connected, signTransaction };
};
