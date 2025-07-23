use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash};

declare_id!("BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB");

#[error_code]
pub enum ErrorCode {
    #[msg("Already invited")]
    AlreadyInvited,
    #[msg("Not invited")]
    NotInvited,
    #[msg("Not requested")]
    NotRequested,
    #[msg("Not in chat")]
    NotInChat,
    #[msg("Invalid hash")]
    InvalidHash,
}

fn get_hash(a: Pubkey, b: Pubkey) -> [u8; 32] {
    let mut c: [u8; 64] = [0; 64];

    for i in 0..32 {
        if a.to_bytes()[i] == b.to_bytes()[i] {
            continue;
        }
        if a.to_bytes()[i] < b.to_bytes()[i] {
            c[0..32].copy_from_slice(&a.to_bytes());
            c[32..64].copy_from_slice(&b.to_bytes());
        } else {
            c[0..32].copy_from_slice(&b.to_bytes());
            c[32..64].copy_from_slice(&a.to_bytes());
        }
        break;
    }

    let hash = hash(c.as_ref());
    hash.to_bytes().try_into().unwrap()
}

#[program]
pub mod cherry_chat {
    use super::*;
    pub fn register(_ctx: Context<Register>) -> Result<()> {        
        Ok(())
    }

    pub fn invite(ctx: Context<Invite>) -> Result<()> {
        let inviter = &mut ctx.accounts.payer;
        let invitee = &mut ctx.accounts.invitee;
        let inviter_descriptor = &mut ctx.accounts.payer_descriptor;
        let invitee_descriptor = &mut ctx.accounts.invitee_descriptor;

        require!(inviter_descriptor.peers.iter().all(|p| p.wallet != invitee.key()), ErrorCode::AlreadyInvited);
        require!(invitee_descriptor.peers.iter().all(|p| p.wallet != inviter.key()), ErrorCode::AlreadyInvited);

        inviter_descriptor.peers.push(Peer {
            wallet: invitee.key(),
            state: PeerState::Invited,
        });
        invitee_descriptor.peers.push(Peer {
            wallet: inviter.key(),
            state: PeerState::Requested,
        });

        msg!("Invite: {:?} to {:?}", invitee.key(), inviter.key());

        Ok(())
    }

    pub fn accept(ctx: Context<Accept>, _hash: [u8; 32]) -> Result<()> {
        let me = &mut ctx.accounts.payer;
        let peer = &mut ctx.accounts.peer;
        let me_descriptor = &mut ctx.accounts.payer_descriptor;
        let peer_descriptor = &mut ctx.accounts.peer_descriptor;
        let private_chat = &mut ctx.accounts.private_chat;

        require!(me_descriptor.peers.iter().find(|p| p.wallet == peer.key() && p.state == PeerState::Requested).is_some(), ErrorCode::NotRequested);
        require!(peer_descriptor.peers.iter().find(|p| p.wallet == me.key() && p.state == PeerState::Invited).is_some(), ErrorCode::NotInvited);

        let hash = get_hash(me.key(), peer.key());
        require!(hash == _hash, ErrorCode::InvalidHash);

        for p in me_descriptor.peers.iter_mut() {
            if p.wallet == peer.key() {
                p.state = PeerState::Accepted;
                break;
            }
        }
        for p in peer_descriptor.peers.iter_mut() {
            if p.wallet == me.key() {
                p.state = PeerState::Accepted;
                break;
            }
        }

        private_chat.wallets = [me.key(), peer.key()];
        msg!("Accept: {:?} from {:?}", peer.key(), me.key());

        Ok(())
    }

    pub fn reject(ctx: Context<Reject>) -> Result<()> {
        let me = &mut ctx.accounts.payer;
        let peer = &mut ctx.accounts.peer;
        let me_descriptor = &mut ctx.accounts.payer_descriptor;
        let peer_descriptor = &mut ctx.accounts.peer_descriptor;

        require!(me_descriptor.peers.iter().find(|p| p.wallet == peer.key() && p.state == PeerState::Requested).is_some(), ErrorCode::NotRequested);
        require!(peer_descriptor.peers.iter().find(|p| p.wallet == me.key() && p.state == PeerState::Invited).is_some(), ErrorCode::NotInvited);

        for p in me_descriptor.peers.iter_mut() {
            if p.wallet == peer.key() {
                p.state = PeerState::Rejected;
                break;
            }
        }
        for p in peer_descriptor.peers.iter_mut() {
            if p.wallet == me.key() {
                p.state = PeerState::Rejected;
                break;
            }
        }

        msg!("Reject: {:?} from {:?}", peer.key(), me.key());

        Ok(())
    }

    pub fn sendmessage(ctx: Context<SendMessage>, _hash: [u8; 32], content: Vec<u8>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let private_chat = &mut ctx.accounts.private_chat;

        require!(private_chat.wallets.iter().find(|w| *w == &payer.key()).is_some(), ErrorCode::NotInChat);

        let current_timestamp = Clock::get().unwrap().unix_timestamp;

        private_chat.messages.push(Message {
            sender: payer.key(),
            content,
            timestamp: current_timestamp,
        });

        let message_length = 32 + 4 + private_chat.messages.last().unwrap().content.len() as u32 + 8;
        private_chat.length += message_length;

        // Find the receiver (the other wallet in the private chat)
        let receiver = if private_chat.wallets[0] == payer.key() {
            private_chat.wallets[1]
        } else {
            private_chat.wallets[0]
        };

        msg!("Msg: sender={:?}, receiver={:?}", payer.key(), receiver);

        Ok(())
    }

    pub fn create_group(ctx: Context<CreateGroup>, title: Vec<u8>, description: Vec<u8>, image_url: Vec<u8>) -> Result<()> {
        Ok(())
    }

    pub fn invite_to_group(ctx: Context<InviteToGroup>) -> Result<()> {
        Ok(())
    }

    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        Ok(())
    }

    pub fn accept_invite_to_group(ctx: Context<AcceptInviteToGroup>) -> Result<()> {
        Ok(())
    }
    
    pub fn reject_invite_to_group(ctx: Context<RejectInviteToGroup>) -> Result<()> {
        Ok(())
    }

    
    pub fn send_message_to_group(ctx: Context<SendMessageToGroup>, content: Vec<u8>) -> Result<()> {
        Ok(())
    }

    pub fn leave_group(ctx: Context<LeaveGroup>) -> Result<()> {
        Ok(())
    }
    
    pub fn kick_from_group(ctx: Context<KickFromGroup>) -> Result<()> {
        Ok(())
    }

    pub fn rename_group(ctx: Context<RenameGroup>, title: Vec<u8>) -> Result<()> {
        Ok(())
    }
    
    pub fn close_group(ctx: Context<CloseGroup>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Register<'info> {
    #[account(init, payer = payer, space = 8 + 4 + (0) + 4 + (0), seeds = [b"wallet_descriptor", payer.key().as_ref()], bump)]
    pub wallet_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Invite<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub invitee: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref()], bump, realloc = 8 + 4 + (payer_descriptor.peers.len() + 1)*(32 + 1) + 4 + (payer_descriptor.groups.len()) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", invitee.key().as_ref()], bump, realloc = 8 + 4 + (invitee_descriptor.peers.len() + 1)*(32 + 1) + 4 + (invitee_descriptor.groups.len()) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub invitee_descriptor: Account<'info, WalletDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Reject<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub peer: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", peer.key().as_ref()], bump)]
    pub peer_descriptor: Account<'info, WalletDescriptor>,
}

#[derive(Accounts)]
#[instruction(_hash: [u8; 32])]
pub struct Accept<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub peer: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", peer.key().as_ref()], bump)]
    pub peer_descriptor: Account<'info, WalletDescriptor>,
    #[account(init, payer = payer, space = 8 + 32*2 + 4 +4, seeds = [b"privite_chat", _hash.as_ref()], bump)]
    pub private_chat: Account<'info, PrivateChat>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_hash: [u8; 32], content: Vec<u8>)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"privite_chat", _hash.as_ref()], bump, 
        realloc = 8 + 32* 2 + 8 + (private_chat.length as usize) + 32 + 4 + content.len() + 8, realloc::payer = payer, realloc::zero = true)]
    pub private_chat: Account<'info, PrivateChat>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: Vec<u8>, description: Vec<u8>, image_url: Vec<u8>)]
pub struct CreateGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref()], bump, realloc = 8 + 4 + (payer_descriptor.peers.len())*(32 + 1) + 4 + (payer_descriptor.groups.len() + 1) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(init, payer = payer, 
        space = 8 // discriminator
        + (4 + title.len()) // title length + title
        + (4 + description.len()) // description length + description
        + (4 + image_url.len()) // image_url length + image_url
        + 32 // owner 
        + 1 // group_type
        + 1 // state
        + 4 + (32 + 1) // one initial member (owner)
        + 4 // messages full length 
        + (4 + 0), // messages length + messages
        seeds = [b"group_descriptor", payer.key().as_ref(), payer_descriptor.groups.len().to_le_bytes().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub invitee: AccountInfo<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", invitee.key().as_ref()], bump, realloc = 8 + 4 + (invitee_descriptor.peers.len() + 1)*(32) + 4 + (invitee_descriptor.groups.len()) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub invitee_descriptor: Account<'info, WalletDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptInviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectInviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendMessageToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct KickFromGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RenameGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"group_descriptor", payer.key().as_ref()], bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum PeerState{
    Invited = 0,
    Requested = 1,
    Accepted = 2,
    Rejected = 3,
}

// Peer is a peer in a private chat.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Peer {
    pub wallet: Pubkey,
    pub state: PeerState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GroupPeerState{
    Invited = 0,
    Joined = 1,
    Rejected = 2,
    Left = 3,
    Kicked = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Group {
    pub account: Pubkey,
    pub state: GroupPeerState,
}

// WalletDescriptor is a descriptor for a wallet.
#[account]
pub struct WalletDescriptor {
    pub peers: Vec<Peer>,
    pub groups: Vec<Group>,
}

// PrivateMessage is a message in a private chat.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Message{
    pub sender: Pubkey,
    pub content: Vec<u8>,
    pub timestamp: i64,
}

// PrivateChat is a chat between two wallets.
#[account]
pub struct PrivateChat {
    pub wallets: [Pubkey; 2],
    pub length: u32,
    pub messages: Vec<Message>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GroupType{
    Private = 0,
    Public = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GroupState{
    Active = 0,
    Closed = 1
}

#[account]
pub struct GroupDescriptor {
    pub title: Vec<u8>,
    pub description: Vec<u8>,
    pub image_url: Vec<u8>,
    pub owner: Pubkey,
    pub group_type: GroupType,
    pub state: GroupState,  
    pub members: Vec<Group>,
    pub length: u32,
    pub messages: Vec<Message>
}