import { ethers } from "ethers";
import DShare from "./artifacts/contracts/DShare.sol/DShare.json";

const contractAddress = "0x8e2FA74163f123B2800C78b6C70962E7233236f6";

export async function getContract() {
  if (!window.ethereum) throw new Error("Metamask not found");

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(contractAddress, DShare.abi, signer);
}


export async function downloadFileByHash(fileHash) {
  try {
    const contract = await getContract();
    const file = await contract.getFile(fileHash); // Smart contract call

    const cid = file.cid;
    const localIpfsUrl = `http://localhost:8080/ipfs/${cid}`;

    // Open file in new tab (or start download)
    window.open(localIpfsUrl, "_blank");
  } catch (error) {
    // ✅ Log the full error
    console.error("❌ Smart contract error:", error);

    // ✅ If it's a contract revert, print reason if available
    if (error.error && error.error.message) {
      console.error("Contract revert reason:", error.error.message);
    } else if (error.reason) {
      console.error("Contract revert reason:", error.reason);
    } else if (error.data && error.data.message) {
      console.error("Contract error (data.message):", error.data.message);
    }

    // Optional: remove this or keep as fallback UI notice
    alert("Download failed. See console for actual error details.");
  }
}

