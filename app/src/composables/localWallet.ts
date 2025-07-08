import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { ref } from "vue";

export const useLocalWallet = (rpcUrl: string = "http://localhost:8899") => {
  const name = ref("Local");
  const connection = new Connection(rpcUrl);

  const publicKey = ref<PublicKey | null>(null);
  const connected = ref(false);
  const installed = ref(true);

  const keypair = ref<Keypair | null>(null);

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

  const connect = async () => {
    console.log("Connecting to local wallet");
    const _data = localStorage.getItem("keypair");
    if (_data) {
      loadKeypair();
    } else {
      generateKeypair();
    }
    publicKey.value = keypair.value?.publicKey || null;
    connected.value = true;
  };

  const signTransaction = async (tx: Transaction) => {
    if (!keypair.value) {
      throw new Error("Keypair not found");
    }
    console.log("Signing transaction", keypair.value.publicKey.toBase58());

    const signature = await connection.sendTransaction(tx, [keypair.value]);
    console.log("Transaction sent", signature);
    return signature;
  };

  return { name, installed, publicKey, connect, connected, signTransaction };
};
