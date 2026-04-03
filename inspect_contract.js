const { ethers } = require('ethers');
require('dotenv').config();

async function inspectContract() {
  try {
    // Setup provider for Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Setup wallet using private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    const myAddress = wallet.address;
    
    // Target contract address
    const contractAddress = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
    
    console.log('🔍 Contract Inspection Tool');
    console.log('==========================');
    console.log(`Network: Arbitrum Sepolia`);
    console.log(`Your address: ${myAddress}`);
    console.log(`Target contract: ${contractAddress}`);
    console.log('');
    
    // 1. Check if address has code (is it a contract?)
    console.log('1. Checking if address has contract code...');
    try {
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        console.log('❌ No contract code found at this address');
        console.log('   This is likely an EOA (Externally Owned Account)');
        return;
      } else {
        console.log('✅ Contract code found');
        console.log(`   Code length: ${code.length} characters`);
      }
    } catch (error) {
      console.log('❌ Error checking code:', error.message);
    }
    
    console.log('');
    
    // 2. Test common read-only functions
    const testFunctions = [
      {
        name: 'name()',
        signature: '0x06fdde03',
        description: 'Standard ERC20/721 name function'
      },
      {
        name: 'owner()',
        signature: '0x8da5cb5b',
        description: 'Ownable owner function'
      },
      {
        name: 'getAgent(address)',
        signature: '0xe46d717f',
        params: myAddress,
        description: 'Agent registry getAgent function'
      },
      {
        name: 'ownerToAgentId(address)',
        signature: '0x042324b6',
        params: myAddress,
        description: 'Agent registry ownerToAgentId function'
      },
      {
        name: 'balanceOf(address)',
        signature: '0x70a08231',
        params: myAddress,
        description: 'Standard ERC20/721 balanceOf function'
      },
      {
        name: 'agentCount()',
        signature: '0xb7dc1284',
        description: 'Agent registry agentCount function'
      },
      {
        name: 'getAgentId(address)',
        signature: '0x8b4e3ad8',
        params: myAddress,
        description: 'Alternative getAgentId function'
      }
    ];
    
    console.log('2. Testing common read-only functions...');
    console.log('=====================================');
    
    for (const func of testFunctions) {
      console.log(`\n📞 Testing ${func.name} (${func.description})`);
      
      try {
        let callData = func.signature;
        
        // Add parameters if needed
        if (func.params) {
          const paddedAddress = func.params.padStart(64, '0').replace('0x', '');
          callData += paddedAddress;
        }
        
        const result = await provider.call({
          to: contractAddress,
          data: callData
        });
        
        if (result === '0x') {
          console.log(`⚠️  Success but returned empty data (0x)`);
        } else {
          console.log(`✅ Success! Returned data: ${result}`);
          
          // Try to decode common return types
          try {
            if (func.name.includes('name()')) {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], result);
              console.log(`   Decoded: "${decoded[0]}"`);
            } else if (func.name.includes('owner()') || func.name.includes('getAgentId')) {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
              console.log(`   Decoded: ${decoded[0].toString()}`);
            } else if (func.name.includes('balanceOf')) {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
              console.log(`   Decoded: ${decoded[0].toString()}`);
            } else if (func.name.includes('agentCount')) {
              const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
              console.log(`   Decoded: ${decoded[0].toString()}`);
            }
          } catch (decodeError) {
            console.log(`   Could not decode: ${decodeError.message}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        
        // Extract more specific error info
        if (error.data) {
          console.log(`   Error data: ${error.data}`);
        }
        if (error.reason) {
          console.log(`   Reason: ${error.reason}`);
        }
      }
    }
    
    console.log('\n');
    console.log('3. Additional contract information...');
    console.log('==================================');
    
    // Check contract creation
    try {
      const txCount = await provider.getTransactionCount(contractAddress);
      console.log(`Transaction count: ${txCount}`);
    } catch (error) {
      console.log('Could not get transaction count:', error.message);
    }
    
    // Check if it's a proxy
    try {
      const implementationSlot = await provider.getStorage(contractAddress, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
      if (implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const implementation = ethers.getAddress('0x' + implementationSlot.slice(26));
        console.log(`🔧 Proxy implementation found: ${implementation}`);
      }
    } catch (error) {
      console.log('Could not check for proxy:', error.message);
    }
    
    console.log('\n🔍 Inspection complete!');
    
  } catch (error) {
    console.error('❌ Inspection failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Execute the inspection
inspectContract().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
