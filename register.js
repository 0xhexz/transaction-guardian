const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  try {
    // Setup provider for Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Setup wallet using private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Agent Registry Contract Address on Arbitrum Sepolia
    const registryAddress = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
    
    // Minimal ABI for agent registration
    const registryABI = [
      "function registerAgent(string memory name, string memory description) external"
    ];
    
    // Connect to contract
    const registryContract = new ethers.Contract(registryAddress, registryABI, wallet);
    
    console.log('Registering Transaction Guardian Skill on Arbitrum Sepolia...');
    console.log(`From address: ${wallet.address}`);
    console.log(`Registry address: ${registryAddress}`);
    
    // Call registerAgent function
    const tx = await registryContract.registerAgent(
      "Transaction Guardian Skill",
      "Pre-trade simulation and contract auditing skill for AI agents"
    );
    
    console.log(`Transaction submitted! Hash: ${tx.hash}`);
    console.log('Waiting for confirmation...');
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('✅ Registration successful!');
    console.log(`Transaction Hash: ${tx.hash}`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.error('❌ Registration failed:');
    console.error(error.message);
    
    // Provide more specific error information
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      console.error('Transaction may fail. Check contract address and gas limits.');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('Insufficient funds for gas. Add more ETH to your wallet.');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('Network connection error. Check your internet connection.');
    }
    
    process.exit(1);
  }
}

// Execute the registration
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
