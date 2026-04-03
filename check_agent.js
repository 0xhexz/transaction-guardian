const { ethers } = require('ethers');
require('dotenv').config();

async function checkAgent() {
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
    
    // Extended ABI to check if agent exists and get agent details
    const registryABI = [
      "function registerAgent(string memory name, string memory description) external",
      "function getAgentId(address owner) external view returns (uint256)",
      "function getAgent(uint256 agentId) external view returns (address owner, string memory name, string memory description, bool active)",
      "function agentCount() external view returns (uint256)",
      "function ownerToAgentId(address owner) external view returns (uint256)"
    ];
    
    // Connect to contract
    const registryContract = new ethers.Contract(registryAddress, registryABI, provider);
    
    console.log('Checking Agent Registry on Arbitrum Sepolia...');
    console.log(`Your address: ${wallet.address}`);
    console.log(`Registry address: ${registryAddress}`);
    console.log('---');
    
    // Check total number of agents
    try {
      const totalAgents = await registryContract.agentCount();
      console.log(`Total agents in registry: ${totalAgents.toString()}`);
    } catch (error) {
      console.log('Could not fetch total agents:', error.message);
    }
    
    // Check if your address has an agent ID using ownerToAgentId
    try {
      const agentId = await registryContract.ownerToAgentId(wallet.address);
      console.log(`Your agent ID: ${agentId.toString()}`);
      
      if (agentId.toString() === '0') {
        console.log('❌ No agent found for your address');
      } else {
        console.log('✅ Agent found! Fetching details...');
        
        // Get agent details
        const agentDetails = await registryContract.getAgent(agentId);
        console.log('---');
        console.log('Agent Details:');
        console.log(`  Owner: ${agentDetails.owner}`);
        console.log(`  Name: ${agentDetails.name}`);
        console.log(`  Description: ${agentDetails.description}`);
        console.log(`  Active: ${agentDetails.active}`);
        console.log(`  Agent ID: ${agentId.toString()}`);
      }
    } catch (error) {
      console.log('Error checking ownerToAgentId:', error.message);
      
      // Try alternative method
      try {
        const agentId = await registryContract.getAgentId(wallet.address);
        console.log(`Alternative check - Your agent ID: ${agentId.toString()}`);
        
        if (agentId.toString() === '0') {
          console.log('❌ No agent found for your address (alternative check)');
        } else {
          console.log('✅ Agent found! (alternative check)');
        }
      } catch (altError) {
        console.log('Alternative method also failed:', altError.message);
      }
    }
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('---');
    console.log(`Your wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.001')) {
      console.log('⚠️  Low balance - You may need more Sepolia ETH for gas fees');
    } else {
      console.log('✅ Sufficient balance for registration');
    }
    
  } catch (error) {
    console.error('❌ Check failed:');
    console.error(error.message);
    
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network connection error. Check your internet connection.');
    } else if (error.code === 'CALL_EXCEPTION') {
      console.error('Contract call failed. The registry address might be incorrect.');
    }
    
    process.exit(1);
  }
}

// Execute the check
checkAgent().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
