const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Fetches contract source code from Arbitrum Sepolia Arbiscan API
 * @param {string} contractAddress - The contract address to fetch source code for
 * @returns {Promise<Object>} - Structured object with contract information
 */
async function fetchContractSource(contractAddress) {
  try {
    const apiKey = process.env.ARBISCAN_API_KEY;
    
    if (!apiKey) {
      throw new Error('ARBISCAN_API_KEY not found in environment variables');
    }

    const url = `https://api-sepolia.arbiscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== '1') {
      return {
        success: false,
        message: 'Contract not found or unverified',
        contractName: null,
        compilerVersion: null,
        sourceCode: null,
        abi: null
      };
    }

    const contractData = response.data.result[0];
    
    return {
      success: true,
      contractName: contractData.ContractName || null,
      compilerVersion: contractData.CompilerVersion || null,
      sourceCode: contractData.SourceCode || null,
      abi: contractData.ABI ? JSON.parse(contractData.ABI) : null,
      message: 'Contract source code fetched successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Error fetching contract source: ${error.message}`,
      contractName: null,
      compilerVersion: null,
      sourceCode: null,
      abi: null
    };
  }
}

/**
 * Simulates a transaction using Tenderly's advanced simulation API for deep execution tracing
 * @param {Object} txPayload - Transaction payload containing { to, data, value, from }
 * @returns {Promise<Object>} - Structured object with detailed simulation results and execution traces
 */
async function simulateTransaction(txPayload) {
  try {
    // Validate required environment variables
    const tenderlyUser = process.env.TENDERLY_USER;
    const tenderlyProject = process.env.TENDERLY_PROJECT;
    const tenderlyAccessKey = process.env.TENDERLY_ACCESS_KEY;
    
    if (!tenderlyUser || !tenderlyProject || !tenderlyAccessKey) {
      throw new Error('Missing required Tenderly environment variables: TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY');
    }

    // Validate required transaction fields
    const { to, data, value, from } = txPayload;
    
    if (!to || !from) {
      throw new Error('Transaction payload must include "to" and "from" addresses');
    }

    // Prepare Tenderly simulation payload
    const simulationPayload = {
      network_id: "421614", // Arbitrum Sepolia
      from: from,
      to: to,
      input: data || "0x",
      value: value || "0x0",
      save: false, // Don't save simulation to reduce API calls
      save_if_fails: false // Don't save failed simulations
    };

    // Make request to Tenderly simulation API
    const url = `https://api.tenderly.co/api/v1/account/${tenderlyUser}/project/${tenderlyProject}/simulate`;
    
    const response = await axios.post(url, simulationPayload, {
      headers: {
        'X-Access-Key': tenderlyAccessKey,
        'Content-Type': 'application/json'
      }
    });

    const simulation = response.data;
    
    // Check if simulation was successful
    if (!simulation.transaction.status) {
      // Extract detailed error information from failed simulation
      const errorInfo = simulation.transaction.error || {};
      const executionTrace = simulation.trace || [];
      
      // Analyze trace for precise failure point
      let failurePoint = null;
      let revertReason = errorInfo.message || 'Unknown revert reason';
      
      // Extract specific failure details from execution trace
      if (executionTrace.length > 0) {
        const lastTrace = executionTrace[executionTrace.length - 1];
        if (lastTrace.error) {
          revertReason = lastTrace.error;
        }
        
        // Find the exact contract and method that failed
        for (const trace of executionTrace) {
          if (trace.error && trace.contract_address) {
            failurePoint = {
              contractAddress: trace.contract_address,
              functionName: trace.function_name || 'unknown',
              error: trace.error,
              pc: trace.pc || null
            };
            break;
          }
        }
      }

      return {
        status: 'DANGER',
        revertReason: revertReason,
        failurePoint: failurePoint,
        executionTrace: executionTrace.slice(-10), // Last 10 trace entries for analysis
        gasUsed: simulation.transaction.gas_used || null,
        message: 'Tenderly simulation failed! High probability of malicious logic or honeypot detected.'
      };
    }

    // Successful simulation
    return {
      status: 'SAFE',
      gasUsed: simulation.transaction.gas_used?.toString() || '0',
      gasPrice: simulation.transaction.gas_price?.toString() || null,
      executionTrace: simulation.trace || [],
      transactionHash: simulation.transaction.transaction_hash || null,
      message: 'Tenderly simulation successful. No reverts detected. Transaction appears safe for execution.'
    };
    
  } catch (error) {
    // Handle API errors, network issues, or malformed requests
    let errorMessage = error.message;
    
    if (error.response) {
      // Tenderly API specific errors
      const apiError = error.response.data;
      if (apiError.error) {
        errorMessage = `Tenderly API Error: ${apiError.error}`;
      } else if (apiError.message) {
        errorMessage = `Tenderly API Error: ${apiError.message}`;
      }
    }
    
    return {
      status: 'ERROR',
      error: errorMessage,
      message: 'Simulation failed due to API or network error. Please check configuration and try again.'
    };
  }
}

module.exports = {
  fetchContractSource,
  simulateTransaction
};
