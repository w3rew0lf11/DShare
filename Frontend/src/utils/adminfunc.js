import { ethers } from "ethers";
import DShare from "../../../smart-contract/artifacts/contracts/DShare.sol/DShare.json";
import toast from "react-hot-toast";

const contractAddress = "0x4C60D5A5c6e6ff456C3Df77F46dd011039930672";

// Get contract instance using MetaMask signer
export async function getContractWithSigner() {
  if (!window.ethereum) throw new Error("MetaMask not detected");
  
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return new ethers.Contract(contractAddress, DShare.abi, signer);
}

// ✅ Block a user
export async function blockUser(userAddress) {
  try {
    const contract = await getContractWithSigner();
    const tx = await contract.blockUser(userAddress);
    console.log(`📤 Tx sent to block user: ${tx.hash}`);
    await tx.wait();
    toast.success(`🚫 User ${userAddress} blocked.`);
  } catch (err) {
    console.error("❌ Error blocking user:", err.message);
    toast.error("Failed to block user. Only owner can perform this action.");
  }
}

// ✅ Unblock a user
export async function unblockUser(userAddress) {
  try {
    const contract = await getContractWithSigner();
    const tx = await contract.unblockUser(userAddress);
    console.log(`📤 Tx sent to unblock user: ${tx.hash}`);
    await tx.wait();
    toast.success(`✅ User ${userAddress} unblocked.`);
  } catch (err) {
    console.error("❌ Error unblocking user:", err.message);
    toast.error("Failed to unblock user. Only owner can perform this action.");
  }
}