# Install Node.js and npm (if not installed)

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install circom

git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
cd ..

# Install snarkjs

npm install -g snarkjs

# Install circomlib (required for Poseidon)

npm install circomlib

# Create project directory

# Compile

circom circuit.circom --r1cs --wasm --sym --c

# Output files:

# - circuit.r1cs

# - circuit_js/

# - circuit.wasm

# - circuit.sym

# Powers of Tau (phase 1)

snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v

# Circuit-specific setup (phase 2)

snarkjs groth16 setup circuit.r1cs pot14_final.ptau circuit_0000.zkey
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="First" -v

# Export verification key

snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# Verify

snarkjs zkey verify circuit.r1cs pot14_final.ptau circuit_final.zkey
