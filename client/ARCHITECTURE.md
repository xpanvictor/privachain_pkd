# Component Architecture Guide

## Visual Hierarchy

```
App Root (_layout.tsx)
│
├─ WalletProvider (context/WalletContext.tsx)
│  │
│  ├─ Authentication State
│  ├─ Wallet State (balances, address)
│  ├─ Commitments & Transactions
│  └─ Blockchain Connection
│
└─ App Content
   │
   ├─ AppLockWrapper (components/AppLockWrapper.tsx)
   │  │
   │  ├─ [Loading State]
   │  │  └─ ActivityIndicator
   │  │
   │  ├─ [Locked State]
   │  │  └─ AuthScreen (components/auth/AuthScreen.tsx)
   │  │     └─ PinInput (components/auth/PinInput.tsx)
   │  │
   │  └─ [Unlocked State]
   │     └─ Main App Navigation
   │
   └─ Navigation Stack
      │
      ├─ (tabs) Layout
      │  │
      │  ├─ Home Tab (index.tsx)
      │  │  └─ WalletScreen (components/screens/WalletScreen.tsx)
      │  │     ├─ Connection Status
      │  │     ├─ BalanceDisplay (components/wallet/BalanceDisplay.tsx)
      │  │     ├─ Quick Actions (Send, Receive, Shield, Unshield)
      │  │     └─ TransactionHistory (components/wallet/TransactionHistory.tsx)
      │  │
      │  └─ Settings Tab (two.tsx)
      │     └─ SettingsScreen (components/screens/SettingsScreen.tsx)
      │        ├─ Biometric Toggle
      │        ├─ Change PIN
      │        ├─ Auto-Lock Settings
      │        └─ Advanced Options
      │
      └─ Modal Screens
         └─ (any modal overlays)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      WalletProvider                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Auth     │  │  Balances  │  │   Txns     │            │
│  │   State    │  │   State    │  │   State    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  AuthScreen  │ │ WalletScreen │ │   Settings   │
│              │ │              │ │    Screen    │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐
│ BalanceDisplay│ │   Quick  │ │  Transaction │
│               │ │  Actions │ │   History    │
└───────────────┘ └──────────┘ └──────────────┘
```

## Hook Usage Chain

```
Component (WalletScreen.tsx)
  │
  ├─ useWallet() → WalletContext
  │  ├─ isAuthenticated
  │  ├─ balances
  │  ├─ transactions
  │  ├─ connected
  │  └─ blockNumber
  │
  └─ (internally in WalletContext)
     │
     ├─ useBlockchain() → chain.ts
     │  ├─ connect()
     │  ├─ getBalance()
     │  └─ subscribeToEvents()
     │
     ├─ useDeposit() → chain.ts + prover.ts
     │  └─ deposit(amount, address)
     │
     ├─ usePrivateTransfer() → chain.ts + prover.ts + encryption.ts
     │  └─ privateTransfer(amount, address)
     │
     └─ useWithdraw() → chain.ts + prover.ts
        └─ withdraw(amount)
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application State                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Global State (WalletContext)                                │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Authentication (isLocked, isAuthenticated)       │     │
│  │ • Wallet (hasWallet, address)                      │     │
│  │ • Balances (public, private, total)                │     │
│  │ • Commitments (all, unspent)                       │     │
│  │ • Transactions (history)                           │     │
│  │ • Blockchain (connected, blockNumber)              │     │
│  └────────────────────────────────────────────────────┘     │
│                          ▲                                    │
│                          │                                    │
│                   State Updates                               │
│                          │                                    │
│  ┌───────────────────────┴────────────────────────────┐     │
│  │                                                     │     │
│  │  Data Sources:                                     │     │
│  │  • AsyncStorage (persistent)                       │     │
│  │  • Blockchain queries (real-time)                  │     │
│  │  • User actions (transactions)                     │     │
│  │  • Security layer (auth status)                    │     │
│  │                                                     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Transaction Flow

```
User Action (e.g., "Send Privately")
  │
  ├─ WalletScreen → handleSend()
  │
  ├─ usePrivateTransfer hook
  │  │
  │  ├─ 1. Get unspent commitments
  │  │   └─ database.getUnspentCommitments()
  │  │
  │  ├─ 2. Select commitment to spend
  │  │   └─ findCommitment(amount)
  │  │
  │  ├─ 3. Get Merkle path
  │  │   └─ indexer.getMerkleProof()
  │  │
  │  ├─ 4. Generate ZK proof
  │  │   └─ prover.generateProof({
  │  │       commitment, nullifier, amount, merkle_path
  │  │     })
  │  │
  │  ├─ 5. Create new commitment (change)
  │  │   └─ createCommitment(changeAmount)
  │  │
  │  ├─ 6. Submit transaction
  │  │   └─ api.tx.zkPrivacy.privateTransfer({
  │  │       proof, nullifier, new_commitment
  │  │     })
  │  │
  │  ├─ 7. Wait for finalization
  │  │   └─ tx.signAndSend().then(...)
  │  │
  │  ├─ 8. Update local storage
  │  │   ├─ database.markCommitmentSpent(old)
  │  │   ├─ database.saveCommitment(new)
  │  │   └─ database.saveTransaction(tx)
  │  │
  │  └─ 9. Update context state
  │      ├─ refreshCommitments()
  │      ├─ refreshTransactions()
  │      └─ refreshBalances()
  │
  └─ UI Update
     ├─ Show success message
     ├─ Update balance display
     └─ Add to transaction history
```

## Authentication Flow

```
App Launch
  │
  ├─ WalletProvider.initializeWallet()
  │  ├─ Check if wallet exists
  │  ├─ Check lock status
  │  └─ Load cached data
  │
  ├─ AppLockWrapper renders
  │
  ├─ If locked: Show AuthScreen
  │  │
  │  ├─ Auto-trigger biometric
  │  │  └─ auth.authenticateWithBiometrics()
  │  │
  │  ├─ If biometric fails: Show PinInput
  │  │  └─ User enters PIN
  │  │     └─ auth.verifyPin(pin)
  │  │
  │  └─ On success:
  │     ├─ WalletContext.unlock()
  │     │  ├─ setIsLocked(false)
  │     │  ├─ setIsAuthenticated(true)
  │     │  └─ Refresh all data
  │     │
  │     └─ AppLockWrapper re-renders
  │        └─ Shows main app content
  │
  └─ If unlocked: Show WalletScreen
     └─ User can access all features
```

## Storage Layer

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Secure Storage (expo-secure-store)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • PIN (hashed + salted)                            │     │
│  │ • Last auth timestamp                              │     │
│  │ • Private keys (encrypted)                         │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  AsyncStorage (@react-native-async-storage)                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Commitments (encrypted notes)                    │     │
│  │ • Transaction history                              │     │
│  │ • Wallet settings                                  │     │
│  │ • Sync state                                       │     │
│  │ • Cached balances                                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  Memory (React State)                                        │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • Current session data                             │     │
│  │ • Real-time blockchain state                       │     │
│  │ • UI state (loading, errors)                       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Props Flow

```
WalletScreen
  │
  ├─ BalanceDisplay
  │  └─ Props: { showPrivate: boolean }
  │     └─ Consumes: useWallet() → balances
  │
  ├─ TransactionHistory
  │  └─ Props: { limit?: number, showFilter?: boolean }
  │     └─ Consumes: useWallet() → transactions
  │
  └─ Quick Actions
     └─ Each button: onPress handler
        └─ Calls appropriate hook (useDeposit, usePrivateTransfer, etc.)

AuthScreen
  │
  ├─ Props: { onAuthenticated: () => void, mode: 'unlock' | 'setup' }
  │
  └─ PinInput
     └─ Props: { 
          onComplete: (pin: string) => void,
          onBiometric?: () => void,
          error: string
        }

SettingsScreen
  │
  ├─ Biometric Toggle
  │  └─ Calls: auth.checkBiometricCapability()
  │  └─ Updates: database.saveSettings()
  │
  ├─ Change PIN
  │  └─ Shows: PinInput (setup mode)
  │  └─ Calls: auth.setupPin()
  │
  └─ Auto-Lock Options
     └─ Updates: database.saveSettings({ autoLockTimeout })
```

## Error Handling Flow

```
Error Occurs
  │
  ├─ Try-Catch Block
  │
  ├─ Log Error
  │  └─ console.error('Context:', error)
  │
  ├─ Set Error State
  │  └─ setError(error)
  │
  ├─ Show User-Friendly Message
  │  └─ Alert.alert('Error', message)
  │
  └─ Recovery Actions
     ├─ Retry mechanism
     ├─ Fallback behavior
     └─ Clear error state
```

## Performance Optimizations

```
Component Level:
  ├─ React.memo() for pure components
  ├─ useMemo() for expensive calculations
  ├─ useCallback() for stable function refs
  └─ Lazy loading of heavy components

Context Level:
  ├─ Split contexts by concern
  ├─ Selective subscription
  └─ Minimize re-renders

Storage Level:
  ├─ Batch AsyncStorage operations
  ├─ Cache frequently accessed data
  └─ Lazy load historical data

Network Level:
  ├─ WebSocket connection pooling
  ├─ Request debouncing
  └─ Optimistic UI updates
```

## Key Architectural Decisions

### 1. Context API vs Redux
**Choice**: Context API  
**Reason**: Simpler for this use case, less boilerplate, sufficient for app size

### 2. AsyncStorage vs SQLite
**Choice**: AsyncStorage  
**Reason**: Simpler API, adequate performance for wallet data volume

### 3. Functional vs Class Components
**Choice**: Functional with hooks  
**Reason**: Modern React patterns, better composition, cleaner code

### 4. Monolithic vs Microservices API
**Choice**: Layered monolith (chain.ts, indexer.ts)  
**Reason**: Clear separation of concerns while maintaining simplicity

### 5. Direct API calls vs React Query
**Choice**: Custom hooks wrapping direct calls  
**Reason**: Full control, blockchain-specific caching needs

## Testing Strategy

```
Unit Tests:
  ├─ Utils (key.ts, prover.ts, encryption.ts)
  ├─ Storage (database.ts)
  └─ Security (auth.ts)

Integration Tests:
  ├─ API hooks (useDeposit, usePrivateTransfer)
  ├─ Context (WalletContext)
  └─ Component interactions

E2E Tests:
  ├─ Authentication flow
  ├─ Transaction submission
  └─ Settings changes
```

---

**Last Updated**: Now  
**Document Version**: 1.0.0
