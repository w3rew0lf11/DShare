import { ethers } from "ethers";
import DShare from "../../../smart-contract/artifacts/contracts/DShare.sol/DShare.json";

const contractAddress = "0x4C60D5A5c6e6ff456C3Df77F46dd011039930672";

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
    const file = await contract.getFile(fileHash);

    if (!file || !file.cid) {
      throw new Error("File not found in smart contract");
    }

    return {
      cid: file.cid,
      filename: file.filename,
      size: file.size,
      uploader: file.uploader,
      isPublic: file.isPublic
    };
  } catch (error) {
    console.error("❌ Smart contract error:", error);

    let errorMessage = "Smart contract verification failed";
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.reason) {
      errorMessage = error.reason;
    } else if (error.data && error.data.message) {
      errorMessage = error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}