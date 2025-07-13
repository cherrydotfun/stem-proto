# STEM Protocol - Decentralized Private Chat

**The first open wallet-to-wallet (W2W) communication protocol** - a non-commercial, decentralized private messaging application built on Solana blockchain using the Anchor framework. Created by the [Cherry.fun](https://cherry.fun) team, STEM Protocol enables secure, peer-to-peer encrypted messaging with on-chain invitation and acceptance mechanisms.

## 🌱 What is STEM?

**STEM** stands for **Solana Trusted Encrypted Messaging** - a protocol that provides secure, decentralized communication between Solana wallets. Think of it as the "stem" that connects different "cherries" (wallets) in the Solana ecosystem, enabling direct wallet-to-wallet messaging without intermediaries.

### Key Features
- **First Open W2W Protocol**: Pioneering wallet-to-wallet communication on Solana
- **Non-Commercial**: Free to use and deploy (only Solana transaction fees apply)
- **Privacy-First**: End-to-end encrypted messaging with on-chain verification
- **Decentralized**: No central servers or intermediaries required
- **Self-Hosted**: Can be deployed locally for complete control

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Vue 3 + TypeScript + Vite
- **Blockchain**: Solana (Anchor Framework)
- **Smart Contract**: Rust (Anchor)
- **Deployment**: Docker + Nginx
- **CI/CD**: GitHub Actions

### Project Structure
```
stem-proto/
├── app/                    # Frontend Vue.js application
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── composables/    # Vue composables (wallet, stem integration)
│   │   ├── pages/          # Vue router pages
│   │   ├── utils/          # Utilities and constants
│   │   └── router/         # Vue router configuration
│   ├── Dockerfile          # Frontend containerization
│   └── package.json        # Frontend dependencies
├── programs/
│   └── cherry-chat/        # Solana program (smart contract)
│       ├── src/lib.rs      # Main program logic
│       └── Cargo.toml      # Rust dependencies
├── tests/                  # Integration tests
├── migrations/             # Deployment scripts
├── Anchor.toml            # Anchor configuration
└── Cargo.toml             # Workspace configuration
```

## 🚀 Quick Start

> **Note**: STEM Protocol is completely free to use and deploy. The only costs are standard Solana network transaction fees for on-chain operations like registration, invitations, and message sending.

### Prerequisites
- Node.js 18+ and npm/yarn
- Rust and Cargo
- Solana CLI tools
- Anchor CLI
- Docker (for deployment)

### Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd stem-proto
   
   # Install frontend dependencies
   cd app && npm install
   
   # Install Rust dependencies
   cargo build
   ```

2. **Start Local Solana Validator**
   ```bash
   solana-test-validator
   ```

3. **Deploy Smart Contract**
   ```bash
   # Build and deploy the program
   anchor build
   anchor deploy
   
   # Run tests
   anchor test
   ```

4. **Start Frontend Development Server**
   ```bash
   cd app
   npm run dev
   ```

5. **Access Application**
   - Open [http://localhost:5173](http://localhost:5173)
   - Connect with Phantom wallet or use local wallet

## 🔧 Configuration

### Environment Variables
Create `.env` file in the `app/` directory:

```env
VITE_RPC_URL=http://localhost:8899
VITE_WS_URL=ws://localhost:8900
```

### Solana Configuration
```bash
# Set to localnet for development
solana config set --url localhost

# Create a new wallet for testing
solana-keygen new --outfile ~/.config/solana/id.json
```

## 📱 Application Features

### Why Wallet-to-Wallet Communication?
Traditional messaging apps rely on centralized servers and user accounts. STEM Protocol eliminates these dependencies by enabling direct communication between Solana wallets. This approach provides:

- **True Decentralization**: No central authority controls your communications
- **Identity Verification**: Wallet ownership proves identity without personal data
- **Censorship Resistance**: No single point of failure or control
- **Privacy**: No server logs or data collection
- **Interoperability**: Works with any Solana wallet

### Core Functionality
1. **Wallet Registration**: Users register their wallet on-chain
2. **Peer Invitation**: Send chat invitations to other users
3. **Chat Management**: Accept/reject invitations to establish connections
4. **Private Messaging**: Send encrypted messages in private chats
5. **Real-time Updates**: Live chat updates via WebSocket connections

### User Flow
1. **Connect Wallet**: User connects Phantom or local wallet
2. **Register**: First-time users register their wallet on-chain
3. **Invite Peers**: Send invitations by entering peer's public key
4. **Accept/Reject**: Respond to incoming invitations
5. **Chat**: Exchange messages with accepted peers

## 🏛️ Smart Contract Architecture

### Program ID
```
BjheWDpSQGu1VmY1MHQPzvyBZDWvAnfrnw55mHr33BRB
```

### Key Accounts

#### WalletDescriptor
- **Purpose**: Stores user's peer list and invitation status
- **Seeds**: `["wallet_descriptor", user_pubkey]`
- **Data**: List of peers with their status (Invited, Requested, Accepted, Rejected)

#### PrivateChat
- **Purpose**: Stores encrypted chat messages between two users
- **Seeds**: `["private_chat", chat_hash]`
- **Data**: Messages, timestamps, and participant wallets

### Instruction Set

#### `register()`
- Creates a new `WalletDescriptor` account for the user
- Required for all other operations

#### `invite(invitee: Pubkey)`
- Sends invitation from payer to invitee
- Updates both users' descriptor accounts
- Sets peer status to `Invited`/`Requested`

#### `accept(hash: [u8; 32])`
- Accepts a pending invitation
- Creates `PrivateChat` account
- Sets peer status to `Accepted`
- Validates chat hash for security

#### `reject(peer: Pubkey)`
- Rejects a pending invitation
- Sets peer status to `Rejected`

#### `sendmessage(hash: [u8; 32], content: String)`
- Sends message in private chat
- Validates sender is chat participant
- Stores message with timestamp

## 🔐 Security Features

### Chat Hash Generation
```rust
fn get_hash(a: Pubkey, b: Pubkey) -> [u8; 32] {
    // Deterministic hash based on sorted public keys
    // Ensures same chat account for both participants
}
```

### Access Control
- Only chat participants can send messages
- Invitation validation prevents unauthorized access
- Hash verification ensures chat integrity

## 🧪 Testing

### Run Tests
```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/cherry-chat.ts
```

### Test Structure
- Integration tests in `tests/cherry-chat.ts`
- Tests cover all program instructions
- Includes error case validation

## 🚀 Deployment

### Docker Build
```bash
cd app
docker build . -t cherry-chat:latest
```

### Local Docker Run
```bash
docker run --rm -p 8080:80 cherry-chat:latest
```

### Production Deployment
The project uses GitHub Actions for automated deployment:

1. **Build**: Creates Docker image with commit hash tag
2. **Push**: Uploads to GitLab container registry
3. **Deploy**: SSH to production VM and updates container

### Environment Configuration
Production deployment requires these secrets:
- `REGISTRY_USERNAME`/`REGISTRY_PASSWORD`: GitLab registry credentials
- `REGISTRY_PATH`: Container registry path
- `VM_HOST`: Production server hostname
- `VM_SSH_KEY`: SSH private key for deployment

## 🔧 Development Workflow

### Adding New Features
1. **Smart Contract**: Modify `programs/cherry-chat/src/lib.rs`
2. **Frontend**: Update Vue components and composables
3. **Testing**: Add integration tests
4. **Deploy**: Use Anchor for program updates

### Code Style
- **Rust**: Follow Rust formatting standards (`cargo fmt`)
- **TypeScript**: Use ESLint and Prettier
- **Vue**: Follow Vue 3 Composition API patterns

### Debugging
```bash
# Solana program logs
solana logs <program_id>

# Frontend development
cd app && npm run dev

# Smart contract debugging
anchor test --skip-lint
```

## 📚 API Reference

### Stem Class (Frontend)
```typescript
class Stem {
  // Initialize and load user data
  async init(): Promise<Stem>
  
  // Create transaction for wallet registration
  async createRegisterTx(): Promise<Transaction>
  
  // Create invitation transaction
  async createInviteTx(invitee: PublicKey): Promise<Transaction>
  
  // Create acceptance transaction
  async createAcceptTx(invitee: PublicKey): Promise<Transaction>
  
  // Create rejection transaction
  async createRejectTx(invitee: PublicKey): Promise<Transaction>
  
  // Create message sending transaction
  async createSendMessageTx(invitee: PublicKey, message: string): Promise<Transaction>
}
```

### Event System
```typescript
stem.on('onStatusUpdated', (isRegistered: boolean) => {})
stem.on('onChatsUpdated', (chats: Map<string, PeerAccount>) => {})
stem.on('onChatUpdated', ({ pubkey, chat }) => {})
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Write tests for new features
- Update documentation for API changes
- Follow existing code patterns
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Create GitHub issue for bugs or feature requests
- **Documentation**: Check this README and inline code comments
- **Community**: Join our Discord/Telegram for discussions

## 🔗 Links

- [Cherry.fun](https://cherry.fun) - The team behind STEM Protocol
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Vue.js Documentation](https://vuejs.org/)
- [Project Repository](https://github.com/your-org/stem-proto)

## 🙏 Acknowledgments

STEM Protocol is developed and maintained by the Cherry.fun team as a contribution to the Solana ecosystem. This project demonstrates the potential for truly decentralized communication protocols that prioritize privacy, security, and user sovereignty.
