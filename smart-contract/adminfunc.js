import { ethers } from "ethers";
import DShare from "./artifacts/contracts/DShare.sol/DShare.json";

const contractAddress = "0x8e2FA74163f123B2800C78b6C70962E7233236f6"; 

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

// Block a user
export async function blockUser(userAddress) {
  try {
    const contract = await getContract();
    const tx = await contract.blockUser(userAddress);
    await tx.wait();
    console.log(`Blocked user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to block user:", error);
    alert("Blocking failed. Are you the contract owner?");
  }
}

// Unblock a user
export async function unblockUser(userAddress) {
  try {
    const contract = await getContract();
    const tx = await contract.unblockUser(userAddress);
    await tx.wait();
    console.log(`Unblocked user: ${userAddress}`);
  } catch (error) {
    console.error("Failed to unblock user:", error);
    alert("Unblocking failed. Are you the contract owner?");
  }
}


