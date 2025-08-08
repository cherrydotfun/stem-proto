use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::{hash};

declare_id!("7NLjSsfL7Hd3zauabU9EQEpT48wHnkrkZ1LJmJKdbqf");

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
    #[msg("Already in group")]
    AlreadyInGroup,
    #[msg("You are not owner")]
    YouAreNotOwner,
    #[msg("Not in group")]
    NotInGroup,
    #[msg("Owner cannot leave")]
    OwnerCannotLeave,
    #[msg("Group is not active")]
    GroupIsNotActive,
    #[msg("Group is not public")]
    GroupIsNotPublic,
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

    let h = hash(c.as_ref());
    h.to_bytes().try_into().unwrap()
}

#[program]
pub mod cherry_chat {
    use super::*;
    pub fn register(ctx: Context<Register>, public_key: [u8; 32]) -> Result<()> {   
        let descriptor = &mut ctx.accounts.wallet_descriptor;
        let payer = &mut ctx.accounts.payer;

        descriptor.pubkey = public_key;
        descriptor.peers = vec![];
        descriptor.groups = vec![];

        msg!("Register: {:?} with public key {:?}", payer.key(), public_key);

        Ok(())
    }

    pub fn invite(ctx: Context<Invite>, _hash: [u8; 32], encrypted: bool, content: Vec<u8>) -> Result<()> {
        let inviter = &mut ctx.accounts.payer;
        let invitee = &mut ctx.accounts.invitee;
        let inviter_descriptor = &mut ctx.accounts.payer_descriptor;
        let invitee_descriptor = &mut ctx.accounts.invitee_descriptor;

        require!(inviter_descriptor.peers.iter().all(|p| p.wallet != invitee.key()), ErrorCode::AlreadyInvited);
        require!(invitee_descriptor.peers.iter().all(|p| p.wallet != inviter.key()), ErrorCode::AlreadyInvited);

        let hash = get_hash(inviter.key(), invitee.key());
        // msg!("Hash: {:?}", hash);
        // msg!("Hash_: {:?}", _hash);
        require!(hash == _hash, ErrorCode::InvalidHash);


        inviter_descriptor.peers.push(Peer {
            wallet: invitee.key(),
            state: PeerState::Invited,
        });
        invitee_descriptor.peers.push(Peer {
            wallet: inviter.key(),
            state: PeerState::Requested,
        });
        
        let private_chat = &mut ctx.accounts.private_chat;
        private_chat.wallets = [inviter.key(), invitee.key()];
        private_chat.length = 0;
        private_chat.messages = vec![];

        if content.len() > 0 {
            private_chat.messages.push(Message {
                sender: inviter.key(),
                encrypted: encrypted,
                content: content.clone(),
                timestamp: Clock::get().unwrap().unix_timestamp,
            });

            let message_length = 32 + 4 + private_chat.messages.last().unwrap().content.len() as u32 + 8 + 1;
            private_chat.length += message_length;
        }

        msg!("Invite: {:?} to {:?}", invitee.key(), inviter.key());

        Ok(())
    }
    
    pub fn accept(ctx: Context<Accept>) -> Result<()> {
        let me = &mut ctx.accounts.payer;
        let peer = &mut ctx.accounts.peer;
        let me_descriptor = &mut ctx.accounts.payer_descriptor;
        let peer_descriptor = &mut ctx.accounts.peer_descriptor;

        require!(me_descriptor.peers.iter().find(|p| p.wallet == peer.key() && p.state == PeerState::Requested).is_some(), ErrorCode::NotRequested);
        require!(peer_descriptor.peers.iter().find(|p| p.wallet == me.key() && p.state == PeerState::Invited).is_some(), ErrorCode::NotInvited);
        
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

    pub fn sendmessage(ctx: Context<SendMessage>, _hash: [u8; 32], encrypted: bool, content: Vec<u8>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let private_chat = &mut ctx.accounts.private_chat;

        require!(private_chat.wallets.iter().find(|w| *w == &payer.key()).is_some(), ErrorCode::NotInChat);

        let current_timestamp = Clock::get().unwrap().unix_timestamp;

        private_chat.messages.push(Message {
            sender: payer.key(),
            encrypted,
            content,
            timestamp: current_timestamp,
        });

        let message_length = 32 + 4 + private_chat.messages.last().unwrap().content.len() as u32 + 8 + 1;
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

    pub fn create_group(ctx: Context<CreateGroup>, group_type: GroupType, title: Vec<u8>, description: Vec<u8>, image_url: Vec<u8>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let payer_descriptor = &mut ctx.accounts.payer_descriptor;
        let group_descriptor = &mut ctx.accounts.group_descriptor;

        require!(payer_descriptor.groups.iter().all(|g| g.account != payer.key()), ErrorCode::AlreadyInGroup);

        group_descriptor.title = title;
        group_descriptor.description = description;
        group_descriptor.image_url = image_url;
        group_descriptor.owner = payer.key();
        group_descriptor.group_type = group_type;
        group_descriptor.state = GroupState::Active;
        group_descriptor.members.push(Group {
            account: payer.key(),
            state: GroupPeerState::Joined,
        });

        payer_descriptor.groups.push(Group {
            account: group_descriptor.key(),
            state: GroupPeerState::Joined,
        });

        msg!("Create group: {:?}", group_descriptor.key());

        Ok(())
    }

    pub fn invite_to_group(ctx: Context<InviteToGroup>, invitee: Pubkey) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let invitee_descriptor = &mut ctx.accounts.invitee_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(group_descriptor.owner == payer.key(), ErrorCode::YouAreNotOwner);
        require!(group_descriptor.members.iter().all(|g| g.account != invitee), ErrorCode::AlreadyInGroup);
        require!(invitee_descriptor.groups.iter().all(|g| g.account != group_descriptor.key()), ErrorCode::AlreadyInGroup);

        invitee_descriptor.groups.push(Group {
            account: group_descriptor.key(),
            state: GroupPeerState::Invited,
        });

        group_descriptor.members.push(Group {
            account: invitee,
            state: GroupPeerState::Invited,
        });

        msg!("Invite to group: {:?}", group_descriptor.key());

        Ok(())
    }

    
    pub fn accept_invite_to_group(ctx: Context<AcceptInviteToGroup>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let payer_descriptor = &mut ctx.accounts.payer_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(payer_descriptor.groups.iter().find(|g| g.account == group_descriptor.key() && g.state == GroupPeerState::Invited).is_some(), ErrorCode::NotInvited);
        require!(group_descriptor.members.iter().find(|m| m.account == payer.key() && m.state == GroupPeerState::Invited).is_some(), ErrorCode::NotInvited);

        for g in payer_descriptor.groups.iter_mut() {
            if g.account == group_descriptor.key() {
                g.state = GroupPeerState::Joined;
                break;
            }
        }
        for m in group_descriptor.members.iter_mut() {
            if m.account == payer.key() {
                m.state = GroupPeerState::Joined;
                break;
            }
        }

        msg!("Accept invite to group: {:?}", group_descriptor.key());

        Ok(())
    }
        
    pub fn reject_invite_to_group(ctx: Context<RejectInviteToGroup>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let payer_descriptor = &mut ctx.accounts.payer_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(payer_descriptor.groups.iter().find(|g| g.account == payer.key() && g.state == GroupPeerState::Invited).is_some(), ErrorCode::NotInvited);
        require!(group_descriptor.members.iter().find(|m| m.account == group_descriptor.key() && m.state == GroupPeerState::Invited).is_some(), ErrorCode::NotInvited);

        for g in payer_descriptor.groups.iter_mut() {
            if g.account == group_descriptor.key() {
                g.state = GroupPeerState::Rejected;
                break;
            }
        }
        for m in group_descriptor.members.iter_mut() {
            if m.account == payer.key() {
                m.state = GroupPeerState::Rejected;
                break;
            }
        }

        msg!("Reject invite to group: {:?}", group_descriptor.key());

        Ok(())
    }
            
            
    pub fn send_message_to_group(ctx: Context<SendMessageToGroup>, content: Vec<u8>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(group_descriptor.members.iter().find(|m| m.account == payer.key() && m.state == GroupPeerState::Joined).is_some(), ErrorCode::NotInGroup);

        let current_timestamp = Clock::get().unwrap().unix_timestamp;

        group_descriptor.messages.push(Message {
            sender: payer.key(),
            encrypted: false,
            content,
            timestamp: current_timestamp,
        });

        let message_length = 32 + 4 + group_descriptor.messages.last().unwrap().content.len() as u32 + 8;
        group_descriptor.length += message_length;

        msg!("Send message to group: {:?}", group_descriptor.key());

        Ok(())
    }
                

    pub fn leave_group(ctx: Context<LeaveGroup>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let payer_descriptor = &mut ctx.accounts.payer_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(group_descriptor.owner != payer.key(), ErrorCode::OwnerCannotLeave);
        require!(payer_descriptor.groups.iter().find(|g| g.account == group_descriptor.key() && g.state == GroupPeerState::Joined).is_some(), ErrorCode::NotInGroup);
        require!(group_descriptor.members.iter().find(|m| m.account == payer.key() && m.state == GroupPeerState::Joined).is_some(), ErrorCode::NotInGroup);

        for g in payer_descriptor.groups.iter_mut() {
            if g.account == group_descriptor.key() {
                g.state = GroupPeerState::Left;
                break;
            }
        }
        for m in group_descriptor.members.iter_mut() {
            if m.account == payer.key() {
                m.state = GroupPeerState::Left;
                break;
            }
        }

        msg!("Leave group: {:?}", group_descriptor.key());

        Ok(())
    }
    
    pub fn kick_from_group(ctx: Context<KickFromGroup>, target: Pubkey) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let target_descriptor = &mut ctx.accounts.target_descriptor;

        require!(group_descriptor.owner == payer.key(), ErrorCode::YouAreNotOwner);
        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(target_descriptor.groups.iter().find(|g| g.account == group_descriptor.key() && g.state == GroupPeerState::Joined).is_some(), ErrorCode::NotInGroup);
        require!(group_descriptor.members.iter().find(|m| m.account == target && m.state == GroupPeerState::Joined).is_some(), ErrorCode::NotInGroup); 

        for m in group_descriptor.members.iter_mut() {
            if m.account == target {
                m.state = GroupPeerState::Kicked;
                break;
            }
        }

        for g in target_descriptor.groups.iter_mut() {
            if g.account == group_descriptor.key() {
                g.state = GroupPeerState::Kicked;
                break;
            }
        }

        msg!("Kick from group: {:?}", group_descriptor.key());

        Ok(())
    }

    pub fn rename_group(ctx: Context<RenameGroup>, title: Vec<u8>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;

        require!(group_descriptor.owner == payer.key(), ErrorCode::YouAreNotOwner);
        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);

        group_descriptor.title = title;

        Ok(())
    }

    pub fn close_group(ctx: Context<CloseGroup>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;

        require!(group_descriptor.owner == payer.key(), ErrorCode::YouAreNotOwner);
        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);

        group_descriptor.state = GroupState::Closed;

        Ok(())
    }
    
    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        let payer = &mut ctx.accounts.payer;
        let group_descriptor = &mut ctx.accounts.group_descriptor;
        let payer_descriptor = &mut ctx.accounts.payer_descriptor;

        require!(group_descriptor.state == GroupState::Active, ErrorCode::GroupIsNotActive);
        require!(group_descriptor.group_type == GroupType::Public, ErrorCode::GroupIsNotPublic);

        require!(payer_descriptor.groups.iter().all(|g| g.account != group_descriptor.key()), ErrorCode::AlreadyInGroup);
        require!(group_descriptor.members.iter().all(|m| m.account != payer.key()), ErrorCode::AlreadyInGroup);

        group_descriptor.members.push(Group {
            account: payer.key(),
            state: GroupPeerState::Joined,
        });

        payer_descriptor.groups.push(Group {
            account: group_descriptor.key(),
            state: GroupPeerState::Joined,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Register<'info> {
    #[account(init, payer = payer, space = 8 + 4 + 32 + (0) + 4 + (0), seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub wallet_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_hash: [u8; 32], encrypted: bool, content: Vec<u8>)]
pub struct Invite<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub invitee: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump, realloc = 8 + 4 + 32 + (payer_descriptor.peers.len() + 1)*(32 + 1) + 4 + (payer_descriptor.groups.len()) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", invitee.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump, realloc = 8 + 4 + 32 + (invitee_descriptor.peers.len() + 1)*(32 + 1) + 4 + (invitee_descriptor.groups.len()) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub invitee_descriptor: Account<'info, WalletDescriptor>,
    #[account(init, payer = payer, 
        space = 8 
        + 32*2 // wallets
        + 4 // messages full length
        + 4 // messages count
        + (32 + 4 + 1 + content.len() + 8) * (if content.len() > 0 { 1 } else { 0 }), 
        seeds = [b"privite_chat", _hash.as_ref(), PRIVATE_CHAT_VERSION.as_ref()], bump)]
    pub private_chat: Account<'info, PrivateChat>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Reject<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub peer: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", peer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub peer_descriptor: Account<'info, WalletDescriptor>,
}

#[derive(Accounts)]
pub struct Accept<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: invitee is a public key
    pub peer: AccountInfo<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", peer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub peer_descriptor: Account<'info, WalletDescriptor>
}

#[derive(Accounts)]
#[instruction(_hash: [u8; 32], content: Vec<u8>)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"privite_chat", _hash.as_ref(), PRIVATE_CHAT_VERSION.as_ref()], bump, 
        realloc = 8 
        + 32 * 2 // wallets 
        + 4 // messages full length
        + 4 // messages count
        + (private_chat.length as usize) // messages length
        + 32 + 4 + 1 + content.len() + 8, realloc::payer = payer, realloc::zero = true)]
    pub private_chat: Account<'info, PrivateChat>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(group_type: GroupType, title: Vec<u8>, description: Vec<u8>, image_url: Vec<u8>)]
pub struct CreateGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump, realloc = 8 + 4 + (payer_descriptor.peers.len())*(32 + 1) + 4 + (payer_descriptor.groups.len() + 1) * ( 32 +1 ), realloc::payer = payer, realloc::zero = true)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(init, 
        payer = payer, 
        space = group_create_gd_realloc!(title, description, image_url),
        seeds = [b"group_descriptor", payer.key().as_ref(), payer_descriptor.groups.len().to_le_bytes().as_ref()],
        bump)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(invitee: Pubkey)]
pub struct InviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut,
        realloc = group_invite_gd_realloc!(group_descriptor), realloc::payer = payer, realloc::zero = true)]
    pub group_descriptor: Account<'info, GroupDescriptor>,

    #[account(mut, seeds = [b"wallet_descriptor", invitee.as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump, 
        realloc = 8 // discriminator
        + 32 // pubkey
        + 4 + (invitee_descriptor.peers.len())*(32 + 1) 
        + 4 + (invitee_descriptor.groups.len() + 1) * ( 32 + 1 )
    , realloc::payer = payer, realloc::zero = true)]
    pub invitee_descriptor: Account<'info, WalletDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptInviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RejectInviteToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(content: Vec<u8>)]
pub struct SendMessageToGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, realloc = group_send_message_gd_realloc!(group_descriptor, content), realloc::payer = payer, realloc::zero = true)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaveGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(target: Pubkey)]
pub struct KickFromGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", target.as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump)]
    pub target_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: Vec<u8>)]
pub struct RenameGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, 
        realloc = group_rename_gd_realloc!(group_descriptor, title), realloc::payer = payer, realloc::zero = true)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub group_descriptor: Account<'info, GroupDescriptor>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [b"wallet_descriptor", payer.key().as_ref(), WALLET_DESCRIPTOR_VERSION.as_ref()], bump, realloc = 8 // discriminator
        + 4 + (payer_descriptor.peers.len())*(32 + 1 ) 
        + 4 + (payer_descriptor.groups.len() + 1) * ( 32 + 1 )
    , realloc::payer = payer, realloc::zero = true)]
    pub payer_descriptor: Account<'info, WalletDescriptor>,
    #[account(mut,  realloc = group_invite_gd_realloc!(group_descriptor), realloc::payer = payer, realloc::zero = true)]
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

const WALLET_DESCRIPTOR_VERSION: [u8; 1] = [1];
// WalletDescriptor is a descriptor for a wallet.
#[account]
pub struct WalletDescriptor {
    pub pubkey: [u8; 32],
    pub peers: Vec<Peer>,
    pub groups: Vec<Group>,
}

const MESSAGE_VERSION: [u8; 1] = [1];
// PrivateMessage is a message in a private chat.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Message{
    pub sender: Pubkey,
    pub encrypted: bool,
    pub content: Vec<u8>,
    pub timestamp: i64,
}

const PRIVATE_CHAT_VERSION: [u8; 1] = [1];
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
    Dummy = 2
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

#[macro_export]
macro_rules! group_create_gd_realloc {
    ($title:expr, $description:expr, $image_url:expr) => {
        8 // discriminator
        + (4 + $title.len()) // title length + title
        + (4 + $description.len()) // description length + description
        + (4 + $image_url.len()) // image_url length + image_url
        + 32 // owner 
        + 1 // group_type
        + 1 // state
        + 4 + (1) * (32 + 1) // one initial member (owner)
        + 4 // messages full length 
        + (4 + 0) // messages length + messages
    }
}

#[macro_export]
macro_rules! group_invite_gd_realloc {
    ($group_descriptor:expr) => {
        8 // discriminator
        + (4 + $group_descriptor.title.len()) // title length + title
        + (4 + $group_descriptor.description.len()) // description length + description
        + (4 + $group_descriptor.image_url.len()) // image_url length + image_url
        + 32 // owner 
        + 1 // group_type
        + 1 // state
        + 4 + ($group_descriptor.members.len() + 1) * (32 + 1) // one initial member (owner)
        + 4 // messages full length 
        + (4 + $group_descriptor.length as usize) // messages length + messages
    }
}

#[macro_export]
macro_rules! group_rename_gd_realloc {
    ($group_descriptor:expr, $title:expr) => {
        8 // discriminator
        + (4 + $title.len()) // title length + title
        + (4 + $group_descriptor.description.len()) // description length + description
        + (4 + $group_descriptor.image_url.len()) // image_url length + image_url
        + 32 // owner 
        + 1 // group_type
        + 1 // state
        + 4 + ($group_descriptor.members.len()) * (32 + 1) // members length + members
        + 4 // messages full length 
        + (4 + $group_descriptor.length as usize) // messages length + messages
    }
}

#[macro_export]
macro_rules! group_send_message_gd_realloc {
    ($group_descriptor:expr, $content:expr) => {
        8 // discriminator
        + (4 + $group_descriptor.title.len()) // title length + title
        + (4 + $group_descriptor.description.len()) // description length + description
        + (4 + $group_descriptor.image_url.len()) // image_url length + image_url
        + 32 // owner 
        + 1 // group_type
        + 1 // state
        + 4 + $group_descriptor.members.len() * (32 + 1) // one initial member (owner)
        + 4 // messages full length 
        + (4 + $group_descriptor.length as usize + 32 + 4 + 1 + $content.len() + 8) // messages length + messages
    }
}