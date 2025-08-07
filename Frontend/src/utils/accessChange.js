import { ethers } from "ethers";
import DShare from "../../../smart-contract/artifacts/contracts/DShare.sol/DShare.json";

const contractAddress = "0x4C60D5A5c6e6ff456C3Df77F46dd011039930672";

console.log("Contract ABI loaded:", DShare ? "Yes" : "No");
console.log("Contract address:", contractAddress);

export const AccessType = {
  Private: 0,
  Public: 1,
  Shared: 2
};

console.log("AccessType enum:", AccessType);

export async function getContract() {
  console.log("Initializing contract connection...");
  
  if (!window.ethereum) {
    console.error("MetaMask not detected in window.ethereum");
    throw new Error("MetaMask not found");
  }

  try {
    console.log("Requesting accounts...");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    console.log("Accounts retrieved:", accounts);

    if (accounts.length === 0) {
      console.error("No accounts available in MetaMask");
      throw new Error("No accounts found");
    }

    console.log("Creating provider and signer...");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log("Signer address:", await signer.getAddress());

    console.log("Creating contract instance...");
    const contract = new ethers.Contract(contractAddress, DShare.abi, signer);
    console.log("Contract instance created successfully");
    
    return contract;
  } catch (error) {
    console.error("Error in getContract:", error);
    throw error;
  }
}

export async function changeAccessType(fileHashHex, accessType, sharedUsers = []) {
  console.group("\n🚀 Starting changeAccessType");
  console.log("Initial parameters:", { fileHashHex, accessType, sharedUsers });

  try {
    console.log("Getting contract instance...");
    const contract = await getContract();

    // Validate file hash
    console.log("Validating file hash:", fileHashHex);
    if (!ethers.isHexString(fileHashHex)) {
      console.error("Invalid hex string for file hash");
      throw new Error("Invalid file hash — must be a hex string");
    }
    if (ethers.dataLength(fileHashHex) !== 32) {
      console.error("Invalid length for file hash:", ethers.dataLength(fileHashHex));
      throw new Error("Invalid file hash — must be 32 bytes");
    }

    // Convert access type
    console.log("Converting access type:", accessType);
    let numericAccessType;
    if (typeof accessType === 'string') {
      console.log("String access type detected, converting...");
      const accessMap = {
        'private': AccessType.Private,
        'public': AccessType.Public,
        'shared': AccessType.Shared
      };
      numericAccessType = accessMap[accessType.toLowerCase()];
      if (numericAccessType === undefined) {
        console.error("Invalid access type string:", accessType);
        throw new Error(`Invalid access type: ${accessType}`);
      }
    } else {
      console.log("Numeric access type detected");
      numericAccessType = accessType;
    }
    console.log("Converted access type:", numericAccessType);

    // Process shared users
    console.log("Processing shared users:", sharedUsers);
    const formattedSharedUsers = sharedUsers.map(address => {
      console.log("Processing address:", address);
      if (!ethers.isAddress(address)) {
        console.error("Invalid Ethereum address:", address);
        throw new Error(`Invalid Ethereum address: ${address}`);
      }
      const normalized = ethers.getAddress(address);
      console.log("Normalized address:", normalized);
      return normalized;
    });
    console.log("Formatted shared users:", formattedSharedUsers);

    console.log("Sending transaction to contract...");
    const tx = await contract.changeAccessType(
      fileHashHex,
      numericAccessType,
      formattedSharedUsers
    );
    console.log("Transaction sent, hash:", tx.hash);

    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status
    });

    console.groupEnd();
    return receipt;
  } catch (error) {
    console.error("❌ Error in changeAccessType:", error);
    console.groupEnd();
    throw error;
  }
}