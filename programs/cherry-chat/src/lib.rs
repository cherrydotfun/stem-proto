use anchor_lang::prelude::*;

declare_id!("BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB");

#[program]
pub mod cherry_chat {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
    
    pub fn register(_ctx: Context<Register>) -> Result<()> {        
        Ok(())
    }

    // pub fn invite(ctx: Context<Invite>) -> Result<()> {
    //     Ok(())
    // }

    // pub fn accept(ctx: Context<Accept>) -> Result<()> {
    //     Ok(())
    // }

    // pub fn reject(ctx: Context<Reject>) -> Result<()> {
    //     Ok(())
    // }

    // pub fn send_message(ctx: Context<SendMessage>) -> Result<()> {
    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct Register<'info> {
    #[account(init, payer = payer, space = 8 + 4 + (0), seeds = [b"wallet_descriptor", payer.key().as_ref()], bump)]
    pub wallet_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
enum PeerState{
    Invited = 0,
    Accepted = 1,
    Rejected = 2,
}

// Peer is a peer in a private chat.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Peer {
    wallet: Pubkey,
    state: PeerState,
}

// WalletDescriptor is a descriptor for a wallet.
#[account]
pub struct WalletDescriptor {
    pub peers: Vec<Peer>,
}

// PrivateMessage is a message in a private chat.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PrivateMessage{
    pub sender: Pubkey,
    pub content: String,
    pub timestamp: u64,
}

// PrivateChat is a chat between two wallets.
#[account]
pub struct PrivateChat {
    pub wallets: [Pubkey; 2],
    pub messages: Vec<PrivateMessage>,
}