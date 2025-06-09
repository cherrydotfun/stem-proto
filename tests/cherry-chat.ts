import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CherryChat } from "../target/types/cherry_chat";

describe("cherry-chat", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.cherryChat as Program<CherryChat>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.register().rpc();
    console.log("Your transaction signature", tx);
  });
});
