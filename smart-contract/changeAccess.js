import { ethers } from "ethers";
import DShare from "./artifacts/contracts/DShare.sol/DShare.json";

const contractAddress = "0x4C60D5A5c6e6ff456C3Df77F46dd011039930672"; 

// Get connected contract instance
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(contractAddress, DShare.abi, signer);
}

// ✅ Change file access type
export async function changeAccessType(fileHashHex, accessType, sharedUsers = []) {
  try {
    const contract = await getContract();

    // Validate and format the hash to bytes32
    if (!ethers.isHexString(fileHashHex) || ethers.hexDataLength(fileHashHex) !== 32) {
      throw new Error("Invalid file hash — must be 32-byte hex string (e.g. IPFS CID hash converted to bytes32).");
    }

    const tx = await contract.changeAccessType(fileHashHex, accessType, sharedUsers);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Access type updated on-chain");
    alert("Access type successfully changed!");
  } catch (error) {
    console.error("❌ Failed to change access type:", error);
    alert("Error changing access type. Check file hash and wallet permissions.");
  }
}
