pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/mux1.circom";

// Merkle tree path verifier
template MerkleProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;
    
    component hashers[levels];
    component mux[levels];
    signal hashes[levels + 1];
    
    hashes[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        // Use multiplexer to select left/right based on pathIndices[i]
        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== hashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== hashes[i];
        mux[i].s <== pathIndices[i];
        
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];
        
        hashes[i + 1] <== hashers[i].out;
    }
    
    root <== hashes[levels];
}

// Main circuit
template Transaction(nInputs, nOutputs, levels) {
    
    // ========== PUBLIC INPUTS ==========
    signal input root;
    signal input nullifierHashes[nInputs];
    signal input outCommitments[nOutputs];
    
    // ========== PRIVATE INPUTS ==========
    
    // Input notes
    signal input inAmount[nInputs];
    signal input inSecret[nInputs];
    signal input inRecipient[nInputs];  // Proves ownership
    signal input inPathElements[nInputs][levels];
    signal input inPathIndices[nInputs][levels];
    
    // Output notes
    signal input outAmount[nOutputs];
    signal input outSecret[nOutputs];
    signal input outRecipient[nOutputs];
    
    // ========== COMPONENTS ==========
    
    component inCommitmentHasher[nInputs];
    component inNullifierHasher[nInputs];
    component inTree[nInputs];
    component outCommitmentHasher[nOutputs];
    
    // ========== PROCESS INPUTS ==========
    
    var sumIns = 0;
    
    for (var i = 0; i < nInputs; i++) {
        
        // Compute commitment = hash(amount, secret, recipient)
        inCommitmentHasher[i] = Poseidon(3);
        inCommitmentHasher[i].inputs[0] <== inAmount[i];
        inCommitmentHasher[i].inputs[1] <== inSecret[i];
        inCommitmentHasher[i].inputs[2] <== inRecipient[i];
        
        // Compute nullifier = hash(commitment, secret)
        inNullifierHasher[i] = Poseidon(2);
        inNullifierHasher[i].inputs[0] <== inCommitmentHasher[i].out;
        inNullifierHasher[i].inputs[1] <== inSecret[i];
        
        // Check nullifier matches public input
        inNullifierHasher[i].out === nullifierHashes[i];
        
        // Verify Merkle proof
        inTree[i] = MerkleProof(levels);
        inTree[i].leaf <== inCommitmentHasher[i].out;
        for (var j = 0; j < levels; j++) {
            inTree[i].pathElements[j] <== inPathElements[i][j];
            inTree[i].pathIndices[j] <== inPathIndices[i][j];
        }
        inTree[i].root === root;
        
        // Sum inputs
        sumIns += inAmount[i];
    }
    
    // ========== PROCESS OUTPUTS ==========
    
    var sumOuts = 0;
    
    for (var i = 0; i < nOutputs; i++) {
        
        // Compute commitment = hash(amount, secret, recipient)
        outCommitmentHasher[i] = Poseidon(3);
        outCommitmentHasher[i].inputs[0] <== outAmount[i];
        outCommitmentHasher[i].inputs[1] <== outSecret[i];
        outCommitmentHasher[i].inputs[2] <== outRecipient[i];
        
        // Check commitment matches public input
        outCommitmentHasher[i].out === outCommitments[i];
        
        // Sum outputs
        sumOuts += outAmount[i];
    }
    
    // ========== BALANCE CHECK ==========
    sumIns === sumOuts;
}

component main {public [root, nullifierHashes, outCommitments]} = Transaction(4, 4, 20);
