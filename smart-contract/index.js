const { ethers } = require("ethers");
require("dotenv").config();

const compiled = require("./artifacts/contracts/DShare.sol/DShare.json");
const abi = compiled.abi;
const contractAddress = process.env.CONTRACT_ADDRESS;

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

const AccessType = {
  Private: 0,
  Public: 1,
  Shared: 2,
};

async function uploadFile({
  fileName,
  author,
  fileType,
  fileSize,
  cid,
  access,
  sharedWithList,
  uploader, // ✅ uploader passed explicitly
}) {
  try {
    const tx = await contract.uploadFile(
      fileName,
      author,
      fileType,
      fileSize,
      cid,
      access,
      sharedWithList,
      uploader
    );

    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();

    // Parse FileUploaded event
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed.name === "FileUploaded") {
          const fileHash = parsed.args.fileHash;
          console.log("✅ File hash:", fileHash);
          return fileHash;
        }
      } catch (err) {
        continue;
      }
    }

    console.error("❌ FileUploaded event not found.");
    return null;
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return null;
  }
}

// ✅ Call function with uploader manually provided
uploadFile({
  fileName: "MyPDF.pdf",
  author: "Jenish Shahi",
  fileType: "pdf",
  fileSize: 234567,
  cid: "QmZEXAMPLE1234567890",
  access: AccessType.Shared,
  sharedWithList: [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  ],
  uploader: "0x60072f6DaD6F7F7513c48b49387830a82C902D38", // 👈 Replace with actual uploader address
});
