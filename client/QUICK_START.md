# Quick Start Guide - PrivaChain Mobile Wallet

## 🚀 Get Started in 5 Minutes

### Step 1: Start Development Server

```bash
cd client
npm start
```

You'll see:
```
Metro waiting on exp://192.168.1.x:19000
› Press i │ open iOS simulator
› Press a │ open Android emulator  
› Press w │ open web
```

### Step 2: Launch App

**iOS:**
- Press `i` (requires macOS + Xcode)

**Android:**
- Press `a` (requires Android Studio)

**Physical Device:**
- Scan QR code with Expo Go app

### Step 3: First Launch Experience

#### What You'll See

```
┌─────────────────────────────┐
│     Welcome to PrivaChain   │
│                             │
│        [Wallet Icon]        │
│                             │
│  Create or restore wallet   │
│     to get started          │
│                             │
│   [Create Wallet Button]    │
└─────────────────────────────┘
```

#### What Happens

1. **WalletProvider Initializes**
   - Checks if wallet exists
   - Checks lock status
   - Loads cached data

2. **AppLockWrapper Decides**
   - No wallet? → Show setup screen
   - Locked? → Show AuthScreen
   - Unlocked? → Show WalletScreen

### Step 4: Set Up Security

#### First Time Setup

```
┌─────────────────────────────┐
│    Secure Your Wallet       │
│                             │
│        [Lock Icon]          │
│                             │
│  Set up a PIN to protect   │
│        your wallet          │
│                             │
│     [PIN Entry Dots]        │
│                             │
│   [1] [2] [3]              │
│   [4] [5] [6]              │
│   [7] [8] [9]              │
│       [0]                   │
│                             │
│   [Touch ID Option]         │
└─────────────────────────────┘
```

**Actions:**
1. Enter 6-digit PIN
2. Confirm PIN
3. Enable biometrics (optional)
4. Done! Wallet unlocked

### Step 5: Main Wallet Screen

```
┌─────────────────────────────┐
│ [Status] Connected • 12345  │
├─────────────────────────────┤
│                             │
│    Total Balance            │
│       $1,234.56             │
│                             │
│  Public: $800.00            │
│  Private: $434.56 [Eye]     │
│                             │
├─────────────────────────────┤
│  [Send] [Receive]           │
│  [Shield] [Unshield]        │
├─────────────────────────────┤
│  Recent Transactions        │
│                             │
│  [Deposit]  +$100  Nov 12   │
│  [Transfer] -$50   Nov 11   │
│  [Withdraw] +$200  Nov 10   │
│                             │
└─────────────────────────────┘
```

### Step 6: Test Basic Operations

#### Check Connection Status

**Top bar shows:**
- 🟢 Connected → Blockchain is reachable
- 🔴 Disconnected → Check endpoint

#### View Balances

**Three balance types:**
- **Total**: Public + Private
- **Public**: Visible on chain
- **Private**: ZK-protected

**Privacy Toggle:**
- Tap eye icon to hide/show amounts

#### Browse Transactions

**Filter by type:**
- All
- Deposits (Public → Private)
- Transfers (Private → Private)
- Withdrawals (Private → Public)

## 📱 Common Workflows

### Workflow 1: Make a Deposit (Shield Funds)

```
1. Tap "Shield" button
   └─ Opens deposit screen

2. Enter amount
   └─ e.g., 100 tokens

3. Confirm
   └─ Signs transaction
   └─ Submits to blockchain

4. Wait for confirmation
   └─ See progress indicator
   └─ Transaction finalizes

5. Success!
   └─ Private balance increases
   └─ Public balance decreases
   └─ New commitment saved
```

**Behind the scenes:**
```
Component (DepositScreen)
  ↓
useDeposit hook
  ↓
chain.deposit()
  ├─ Generate commitment
  ├─ Encrypt note
  ├─ Submit tx
  └─ Wait for finality
  ↓
database.saveCommitment()
  ↓
WalletContext.refreshBalances()
  ↓
UI updates
```

### Workflow 2: Private Transfer

```
1. Tap "Send" button
   └─ Opens send screen

2. Enter recipient + amount
   └─ Validates inputs

3. Select source (Public or Private)
   └─ For private: uses commitments

4. Confirm
   └─ Generates ZK proof
   └─ Submits transaction

5. Success!
   └─ Balance updated
   └─ Transaction in history
```

**Behind the scenes:**
```
Component (TransferScreen)
  ↓
usePrivateTransfer hook
  ↓
chain.privateTransfer()
  ├─ Find unspent commitment
  ├─ Get Merkle proof
  ├─ Generate ZK proof
  ├─ Create new commitment
  ├─ Submit tx
  └─ Wait for finality
  ↓
database operations
  ├─ Mark old commitment spent
  ├─ Save new commitment
  └─ Save transaction
  ↓
WalletContext.refresh()
  ↓
UI updates
```

### Workflow 3: Change Settings

```
1. Navigate to Settings tab
   └─ Bottom navigation

2. Toggle Biometrics
   ├─ Enables fingerprint/face ID
   └─ Saves to database

3. Change PIN
   ├─ Enter current PIN
   ├─ Enter new PIN
   └─ Confirm new PIN

4. Set Auto-Lock
   └─ Choose: 1, 5, 15, or 30 minutes

5. Changes saved!
   └─ Takes effect immediately
```

## 🔧 Configuration

### Connect to Your Parachain

**Option 1: Edit WalletContext.tsx**

```typescript
const blockchain = useBlockchain({
  endpoint: 'ws://your-node:9944'  // Change this
});
```

**Option 2: Add Settings Option** (TODO)

Add network selector to Settings screen.

### Customize Theme

**Edit Colors.ts:**

```typescript
export default {
  light: {
    tint: '#2196F3',  // Primary color
    // ... other colors
  }
};
```

## 🐛 Troubleshooting

### Issue: "Cannot connect to blockchain"

**Solutions:**
1. Check node is running:
   ```bash
   curl http://localhost:9944
   ```

2. Verify WebSocket support:
   ```bash
   wscat -c ws://localhost:9944
   ```

3. Check firewall settings

4. Try different endpoint

### Issue: "Biometric not available"

**Solutions:**
1. Ensure device has biometric hardware
2. Check biometric is enrolled:
   - iOS: Settings → Face ID/Touch ID
   - Android: Settings → Security → Biometrics

3. Grant permissions to app

### Issue: "PIN not working"

**Solutions:**
1. Try removing and re-setting PIN in Settings

2. Clear app data (will lose wallet!):
   ```bash
   # iOS
   Reset simulator
   
   # Android
   Clear app data in settings
   ```

3. Check SecureStore permissions

### Issue: "App crashes on launch"

**Solutions:**
1. Check Metro bundler logs

2. Clear cache:
   ```bash
   npm start -- --clear
   ```

3. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

4. Check React Native logs:
   ```bash
   npx react-native log-android  # Android
   npx react-native log-ios      # iOS
   ```

## 📚 Learning Resources

### Essential Reading

1. **Start Here**: `/client/README.md`
   - Overview, installation, features

2. **API Guide**: `/client/api/README.md`
   - Function signatures, examples

3. **Quick Reference**: `/client/api/QUICK_REFERENCE.md`
   - Cheat sheet for common tasks

4. **Architecture**: `/client/ARCHITECTURE.md`
   - System design, data flow

### Code Examples

**Full Integration Example:**
```typescript
/client/api/EXAMPLE.tsx
```

**Test Utilities:**
```typescript
/client/api/test.ts
```

## 🎯 Next Steps

### For Developers

1. **Read the docs** (start with README.md)
2. **Explore the code** (start with WalletScreen.tsx)
3. **Test features** (authentication, transactions)
4. **Build new features** (use existing patterns)
5. **Write tests** (unit, integration, e2e)

### For Users

1. **Create wallet** (follow setup flow)
2. **Enable security** (PIN + biometric)
3. **Test transactions** (small amounts first)
4. **Backup seed phrase** (when implemented)
5. **Provide feedback** (what works, what doesn't)

## 🔐 Security Checklist

Before Using Real Funds:

- [ ] Tested on testnet first
- [ ] Backed up seed phrase securely
- [ ] Enabled PIN protection
- [ ] Enabled biometric authentication
- [ ] Set reasonable auto-lock timeout
- [ ] Verified transactions work correctly
- [ ] Understand recovery process
- [ ] App is from trusted source

## 💡 Tips & Tricks

### Pro Tips

1. **Use Privacy Toggle**
   - Hide balances in public
   - Tap eye icon anytime

2. **Filter Transactions**
   - Tap filter buttons in history
   - Quick overview of transaction types

3. **Check Connection**
   - Watch status bar
   - Green = good, red = problem

4. **Auto-Lock Protection**
   - Set shorter timeout for security
   - Longer for convenience

5. **Biometric Fallback**
   - PIN always works as backup
   - Don't forget your PIN!

### Performance Tips

1. **Clear Old Data**
   - Archive old transactions
   - Reduces load time

2. **Stable Connection**
   - Use WiFi for best performance
   - Mobile data works but slower

3. **Keep App Updated**
   - Get latest features
   - Security patches

## 🎨 UI Walkthrough

### Main Screen Components

```
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │ ← Status Bar
│ │ Connected • Block 12345 │ │   (Connection + Block)
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │ ← Balance Display
│ │   Total Balance         │ │   (Public/Private/Total)
│ │     $1,234.56 [Eye]     │ │   (Privacy toggle)
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [Send] [Receive]            │ ← Quick Actions
│ [Shield] [Unshield]         │   (4 main operations)
├─────────────────────────────┤
│ Recent Transactions         │ ← Transaction History
│ ┌─────────────────────────┐ │   (Scrollable list)
│ │ Deposit  +$100  Nov 12  │ │   (With filters)
│ ├─────────────────────────┤ │
│ │ Transfer -$50   Nov 11  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Settings Screen Components

```
┌─────────────────────────────┐
│ Security                    │
├─────────────────────────────┤
│ [Fingerprint] Biometric     │ ← Toggle
│                      [ON]   │
├─────────────────────────────┤
│ [Keypad] Change PIN     >   │ ← Button
├─────────────────────────────┤
│ [Timer] Auto-Lock           │ ← Selector
│  [1m] [5m] [15m] [30m]     │
├─────────────────────────────┤
│ Advanced                    │
├─────────────────────────────┤
│ [Warning] Remove PIN    >   │ ← Danger zone
└─────────────────────────────┘
```

## ✅ Checklist for First Run

### Before Starting

- [ ] Node.js installed (v18+)
- [ ] Expo CLI installed
- [ ] Simulator/emulator ready
- [ ] Parachain node running (if testing)
- [ ] Dependencies installed (`npm install`)

### First Launch

- [ ] App starts without errors
- [ ] Metro bundler running
- [ ] Simulator/emulator loads app
- [ ] Welcome screen appears

### Setup Flow

- [ ] Create wallet option visible
- [ ] PIN setup works
- [ ] Biometric option appears
- [ ] Main screen loads after setup

### Basic Operations

- [ ] Connection status shows
- [ ] Balances display (0 initially)
- [ ] Quick actions respond
- [ ] Settings screen opens
- [ ] Lock/unlock works

### Ready to Use!

- [ ] All above checks pass
- [ ] No errors in console
- [ ] UI looks correct
- [ ] Navigation works smoothly

---

**Status**: Ready for testing  
**Estimated Setup Time**: 5-10 minutes  
**Difficulty**: Beginner-friendly  

🚀 **Let's build something amazing!**
