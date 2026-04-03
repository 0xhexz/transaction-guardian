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
    
    // ArbiLink Challenge Bounty Registry Contract Address on Arbitrum Sepolia
    const registryAddress = '0xe5540750eae83e32c70532be3b7bfa07d126d4b2';
    
    // Extended ABI for agent registration and checking
    const registryABI = [
      "function registerBountyAgent(string memory name, string memory description) external",
      "function isAgentRegistered(address agent) external view returns (bool)",
      "function getAgentInfo(address agent) external view returns (string memory name, string memory description, uint256 registrationTime, bool active)",
      "function getRegisteredAgentsCount() external view returns (uint256)"
    ];
    
    // Connect to contract
    const registryContract = new ethers.Contract(registryAddress, registryABI, provider);
    
    console.log('🔍 Checking ArbiLink Challenge Bounty Registry on Arbitrum Sepolia...');
    console.log(`From address: ${wallet.address}`);
    console.log(`Registry address: ${registryAddress}`);
    console.log('');
    
    // Check if agent is already registered
    console.log('📋 Checking if agent is already registered...');
    try {
      const isRegistered = await registryContract.isAgentRegistered(wallet.address);
      console.log(`Agent registered: ${isRegistered}`);
      
      if (isRegistered) {
        console.log('✅ Agent already registered! Fetching details...');
        
        const agentInfo = await registryContract.getAgentInfo(wallet.address);
        console.log('');
        console.log('📄 Agent Details:');
        console.log(`  Name: ${agentInfo.name}`);
        console.log(`  Description: ${agentInfo.description}`);
        console.log(`  Registration Time: ${new Date(Number(agentInfo.registrationTime) * 1000).toLocaleString()}`);
        console.log(`  Active: ${agentInfo.active}`);
        console.log('');
        console.log('🎉 Your agent is already registered for the ArbiLink Challenge!');
        console.log('   No additional action needed.');
        return;
      }
    } catch (error) {
      console.log('⚠️  Could not check registration status:', error.message);
      console.log('   Proceeding with registration attempt...');
    }
    
    // Check total registered agents
    try {
      const totalAgents = await registryContract.getRegisteredAgentsCount();
      console.log(`Total registered agents: ${totalAgents.toString()}`);
    } catch (error) {
      console.log('Could not fetch total agents:', error.message);
    }
    
    console.log('');
    console.log('🚀 Registering Transaction Guardian Skill...');
    
    // Connect with wallet for transaction
    const registryWithWallet = registryContract.connect(wallet);
    
    // Call registerBountyAgent function
    const tx = await registryWithWallet.registerBountyAgent(
      "Transaction Guardian Skill",
      "Pre-trade simulation and contract auditing skill for AI agents using Tenderly execution tracing and Arbiscan API"
    );
    
    console.log(`✅ Transaction submitted! Hash: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('🎉 Registration successful!');
    console.log(`📋 Transaction Hash: ${tx.hash}`);
    console.log(`🔢 Block Number: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
    console.log('');
    console.log('🏆 Your Transaction Guardian Skill is now officially registered!');
    console.log('   Use the transaction hash above for your ArbiLink Challenge submission.');
    
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
    } else if (error.data) {
      console.error('Error data:', error.data);
    }
    
    process.exit(1);
  }
}

// Execute the registration
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
