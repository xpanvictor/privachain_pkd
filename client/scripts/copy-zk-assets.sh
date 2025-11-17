#!/bin/bash
# Copy existing ZK artifacts from parachain to client
# No modifications, just copying what exists

PARACHAIN_CIRCOM="../parachain/pallets/zk_privacy/src/circom"
CLIENT_PUBLIC="./public/zk"

echo "🔧 Copying ZK artifacts from parachain to client..."

# Create target directories
mkdir -p "$CLIENT_PUBLIC/circuit_js"

# Copy JavaScript witness calculator (preferred for web)
if [ -d "$PARACHAIN_CIRCOM/circuit_js" ]; then
    echo "  Copying circuit_js/..."
    cp -r "$PARACHAIN_CIRCOM/circuit_js"/* "$CLIENT_PUBLIC/circuit_js/"
    echo "  ✓ JavaScript witness calculator copied"
else
    echo "  ❌ ERROR: circuit_js not found in parachain"
    echo "     Run: cd $PARACHAIN_CIRCOM && circom circuit.circom --wasm"
    exit 1
fi

# Copy proving key if it exists
if [ -f "$PARACHAIN_CIRCOM/circuit_final.zkey" ]; then
    cp "$PARACHAIN_CIRCOM/circuit_final.zkey" "$CLIENT_PUBLIC/"
    ZKEY_SIZE=$(du -h "$CLIENT_PUBLIC/circuit_final.zkey" | cut -f1)
    echo "  ✓ Proving key copied ($ZKEY_SIZE)"
else
    echo "  ⚠️  WARNING: circuit_final.zkey not found"
    echo "     Proof generation will not work until you run trusted setup"
    echo "     See: $PARACHAIN_CIRCOM/README.md"
fi

# Copy verification key if it exists
if [ -f "$PARACHAIN_CIRCOM/verification_key.json" ]; then
    cp "$PARACHAIN_CIRCOM/verification_key.json" "$CLIENT_PUBLIC/"
    echo "  ✓ Verification key copied"
else
    echo "  ⚠️  WARNING: verification_key.json not found"
fi

# Copy R1CS for reference
if [ -f "$PARACHAIN_CIRCOM/circuit.r1cs" ]; then
    cp "$PARACHAIN_CIRCOM/circuit.r1cs" "$CLIENT_PUBLIC/"
    echo "  ✓ R1CS copied (for reference)"
fi

# Copy circuit source for reference
if [ -f "$PARACHAIN_CIRCOM/circuit.circom" ]; then
    cp "$PARACHAIN_CIRCOM/circuit.circom" "$CLIENT_PUBLIC/"
    echo "  ✓ Circuit source copied (for reference)"
fi

echo ""
echo "✅ All available artifacts copied to $CLIENT_PUBLIC"
echo ""
echo "📁 Contents:"
ls -lh "$CLIENT_PUBLIC" 2>/dev/null || echo "  (empty)"
echo ""
if [ -d "$CLIENT_PUBLIC/circuit_js" ]; then
    echo "📁 circuit_js/:"
    ls -lh "$CLIENT_PUBLIC/circuit_js" 2>/dev/null || echo "  (empty)"
fi

echo ""
echo "🎯 Next steps:"
echo "   1. Make sure circuit_final.zkey exists (run trusted setup if needed)"
echo "   2. Install dependencies: npm install"
echo "   3. Initialize ZK in your app: await initializeZK()"
