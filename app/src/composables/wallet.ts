// import { useLocalWallet } from "./localWallet";
import { computed, ref } from "vue";
// import { PublicKey } from "@solana/web3.js";

export const useWallet = (initWallets: any[]) => {
  const _wallets = ref<any>(initWallets);
  const selectedWallet = ref<any>(null);

  const selectWallet = (name: string) => {
    selectedWallet.value = _wallets.value.find(
      (wallet: any) => wallet.name === name
    );
  };
  const disconnect = () => {
    selectedWallet.value = null;
  };

  const wallets = computed(() => {
    return _wallets.value;
  });
  const names = computed(() => {
    return _wallets.value.map((wallet: any) => wallet.name);
  });
  const wallet = computed(() => {
    return selectedWallet.value;
  });

  return { wallets, names, selectWallet, wallet, disconnect };
};
