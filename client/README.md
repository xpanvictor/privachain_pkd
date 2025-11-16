# PrivaChain Mobile Wallet

A privacy-focused cryptocurrency wallet for React Native with Polkadot parachain integration and zero-knowledge proof support.

## Features

### 🔐 Privacy First
- **Zero-Knowledge Proofs**: Private transactions without revealing amounts or parties
- **Commitment Tracking**: Local tracking of private notes
- **Note Encryption**: End-to-end encrypted transaction notes
- **Privacy Toggle**: Hide/show balances on demand

### 🔒 Security
- **Biometric Authentication**: Fingerprint and Face ID support
- **PIN Protection**: Secure 6-digit PIN
- **Auto-Lock**: Automatically lock after inactivity
- **Secure Storage**: Keys stored in device secure enclave

### ⛓️ Blockchain Integration
- **Polkadot Parachain**: Direct substrate chain integration
- **Real-time Updates**: WebSocket connection for live data
- **Event Subscriptions**: Listen to deposits, transfers, withdrawals
- **Merkle Tree Verification**: Verify commitment inclusion

### 💰 Transaction Types
- **Deposit (Shield)**: Convert public balance to private
- **Private Transfer**: Send funds privately with ZK proofs
- **Withdraw (Unshield)**: Convert private balance to public
- **Public Transfer**: Standard blockchain transactions

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Running Polkadot parachain node (for testing)

### Installation

```bash
cd client
npm install
```

### Start Development Server

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web (limited functionality)

## Project Structure

```
client/
├── api/                    # Blockchain API layer
│   ├── chain.ts           # Direct parachain interaction
│   ├── indexer.ts         # Off-chain data queries
│   ├── hooks.ts           # React hooks for UI
│   └── README.md          # API documentation
├── components/
│   ├── auth/              # Authentication components
│   │   ├── AuthScreen.tsx
│   │   └── PinInput.tsx
│   ├── wallet/            # Wallet components
│   │   ├── BalanceDisplay.tsx
│   │   └── TransactionHistory.tsx
│   └── screens/           # Main screens
│       ├── WalletScreen.tsx
│       └── SettingsScreen.tsx
├── context/               # Global state
│   └── WalletContext.tsx
├── security/              # Security layer
│   └── auth.ts
├── storage/               # Data persistence
│   └── database.ts
├── utils/                 # Crypto utilities
│   ├── key.ts            # Key generation
│   ├── prover.ts         # ZK proof generation
│   ├── encryption.ts     # Note encryption
│   └── blockchain.ts     # Blockchain utils
└── app/                  # Expo Router app structure
```

## Configuration

### Blockchain Endpoint

Update the endpoint in your code:

```typescript
import { useBlockchain } from '@/api/hooks';

const blockchain = useBlockchain({
  endpoint: 'ws://your-node:9944'  // Your parachain endpoint
});
```

### Security Settings

Configure in Settings Screen:
- Enable/disable biometric authentication
- Change PIN
- Set auto-lock timeout (1, 5, 15, 30 minutes)

## Usage Examples

### Connect to Blockchain

```typescript
import { useBlockchain } from '@/api/hooks';

function MyComponent() {
  const { connected, blockNumber, api } = useBlockchain({
    endpoint: 'ws://localhost:9944'
  });

  return (
    <View>
      <Text>Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      <Text>Block: {blockNumber}</Text>
    </View>
  );
}
```

### Make a Deposit (Shield Funds)

```typescript
import { useDeposit } from '@/api/hooks';

function DepositScreen() {
  const { deposit, loading, error } = useDeposit();

  const handleDeposit = async () => {
    const result = await deposit(
      1000000,           // amount in smallest unit
      recipientAddress   // where to send
    );

    if (result.success) {
      console.log('Deposit successful!');
      console.log('Commitment:', result.commitment);
    }
  };

  return (
    <Button 
      title="Deposit" 
      onPress={handleDeposit}
      disabled={loading}
    />
  );
}
```

### Private Transfer

```typescript
import { usePrivateTransfer } from '@/api/hooks';

function TransferScreen() {
  const { privateTransfer, loading } = usePrivateTransfer();

  const handleTransfer = async () => {
    const result = await privateTransfer(
      500000,           // amount
      recipientAddress  // recipient
    );

    if (result.success) {
      console.log('Transfer successful!');
      console.log('New commitment:', result.newCommitment);
    }
  };

  return <Button title="Send Privately" onPress={handleTransfer} />;
}
```

### Access Wallet State

```typescript
import { useWallet } from '@/context/WalletContext';

function BalanceScreen() {
  const {
    balances,
    transactions,
    connected,
    refreshBalances
  } = useWallet();

  return (
    <View>
      <Text>Public: {balances?.public || 0}</Text>
      <Text>Private: {balances?.private || 0}</Text>
      <Button title="Refresh" onPress={refreshBalances} />
    </View>
  );
}
```

## Authentication Flow

### First Launch
1. App checks if wallet exists
2. Shows wallet creation/restore screen
3. User sets up PIN
4. Optionally enables biometrics

### Subsequent Launches
1. App checks lock status
2. Shows `AuthScreen` if locked
3. User authenticates with biometric or PIN
4. `WalletContext.unlock()` called on success
5. Main app becomes accessible

### Auto-Lock
- Wallet locks after configured inactivity period (default: 5 min)
- User must re-authenticate to access
- Configurable in Settings

## Security Best Practices

### ✅ DO
- Keep the app updated with security patches
- Use biometric authentication when available
- Set reasonable auto-lock timeout
- Back up seed phrase securely offline
- Verify addresses before sending

### ❌ DON'T
- Share your seed phrase or private keys
- Screenshot sensitive information
- Store passwords in plain text
- Disable PIN protection
- Use untrusted blockchain endpoints

## Testing

### Run Type Checks

```bash
npx tsc --noEmit
```

### Run Linter

```bash
npm run lint
```

### Test on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## Troubleshooting

### Connection Issues
- Ensure blockchain node is running
- Check endpoint URL and port
- Verify WebSocket support
- Check firewall settings

### Authentication Problems
- Clear app data and reinstall
- Verify biometric enrollment on device
- Reset PIN from settings

### Transaction Failures
- Check account balance
- Verify network connection
- Ensure sufficient gas fees
- Check transaction parameters

## API Documentation

Comprehensive API documentation available in `/client/api/README.md`:
- Function signatures
- Parameter descriptions
- Return types
- Usage examples
- Error handling

Quick reference guide: `/client/api/QUICK_REFERENCE.md`

## Dependencies

### Core
- `react-native` - Mobile framework
- `expo` - Development platform
- `@polkadot/api` - Blockchain interaction
- `@react-native-async-storage/async-storage` - Local storage

### Security
- `expo-local-authentication` - Biometric auth
- `expo-secure-store` - Secure credential storage
- `react-native-keychain` - Keychain access

### Crypto (Custom)
- Key generation (ed25519)
- ZK proof generation
- Note encryption (AES-GCM)
- Merkle tree operations

## Architecture

### Layers
1. **UI Layer**: React components and screens
2. **State Layer**: Context API for global state
3. **API Layer**: Blockchain interaction hooks
4. **Storage Layer**: AsyncStorage wrapper
5. **Security Layer**: Auth and encryption
6. **Utils Layer**: Crypto primitives

### Data Flow
```
User Action
  ↓
React Component
  ↓
useWallet Hook / Custom Hook
  ↓
API Layer (chain.ts)
  ↓
@polkadot/api
  ↓
Parachain Node
```

### State Management
- **WalletContext**: Global wallet state
- **Component State**: Local UI state
- **AsyncStorage**: Persistent data
- **Secure Store**: Sensitive credentials

## Performance Optimization

- Lazy loading of heavy components
- Memoization of expensive calculations
- Efficient re-render patterns
- AsyncStorage batching
- WebSocket connection pooling

## Roadmap

### v1.1
- [ ] QR code scanner
- [ ] Transaction details screen
- [ ] Multi-asset support
- [ ] Network switcher

### v1.2
- [ ] Address book
- [ ] Transaction scheduling
- [ ] Gas estimation
- [ ] Fee customization

### v1.3
- [ ] DeFi integration
- [ ] Staking interface
- [ ] NFT support
- [ ] Multi-wallet support

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

MIT License - see LICENSE file

## Support

- **Documentation**: See `/client/api/README.md`
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## Credits

Built with:
- React Native + Expo
- Polkadot.js API
- TypeScript
- Functional programming patterns

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: 2024
