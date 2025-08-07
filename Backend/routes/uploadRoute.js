import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import stream from "stream";
import File from "../models/fileModel.js";
import VirusScanLog from "../models/virusScanLogModel.js";
import { UploadService } from "../../smart-contract/index.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;
const VIRUSTOTAL_URL = process.env.VIRUSTOTAL_URL;
const ANALYSIS_TIMEOUT = 300000;
const POLL_INTERVAL = 10000;

// Time formatter with minutes and seconds
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
}

// Define IPFS nodes (primary + fallbacks)
const IPFS_NODES = [
  { url: "http://192.168.18.21:5005/api/files", name: "Primary Node" },
  { url: "http://192.168.18.53:5005/api/files", name: "Secondary Node 1" },
  { url: "http://192.168.18.54:5005/api/files", name: "Secondary Node 2" },
];

function bufferToStream(buffer) {
  const readable = new stream.PassThrough();
  readable.end(buffer);
  return readable;
}

// Helper: Check if node is online
async function isNodeOnline(nodeUrl) {
  try {
    await axios.head(nodeUrl, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Helper: Upload to IPFS with fallback nodes
async function uploadToIPFS(buffer, filename) {
  let ipfsUploadRes = null;
  let lastError = null;

  // Try primary node first
  const primaryNode = IPFS_NODES[0];
  try {
    console.log(
      `🔄 Attempting upload to ${primaryNode.name}: ${primaryNode.url}`
    );
    const ipfsForm = new FormData();
    ipfsForm.append("file", buffer, filename);

    ipfsUploadRes = await axios.post(primaryNode.url, ipfsForm, {
      headers: { ...ipfsForm.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // timeout: 10000
    });
    console.log(`✅ File uploaded to ${primaryNode.name}`);
  } catch (primaryError) {
    console.warn(`⚠️ ${primaryNode.name} failed: ${primaryError.message}`);
    lastError = primaryError;

    // Try fallback nodes
    for (let i = 1; i < IPFS_NODES.length; i++) {
      const currentNode = IPFS_NODES[i];

      const isOnline = await isNodeOnline(currentNode.url);
      if (!isOnline) {
        console.warn(`⏸️ ${currentNode.name} is offline, skipping`);
        continue;
      }

      try {
        console.log(
          `🔄 Attempting upload to ${currentNode.name}: ${currentNode.url}`
        );
        const ipfsForm = new FormData();
        ipfsForm.append("file", buffer, filename);

        ipfsUploadRes = await axios.post(currentNode.url, ipfsForm, {
          headers: { ...ipfsForm.getHeaders() },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 10000,
        });
        console.log(`✅ File uploaded to ${currentNode.name}`);
        break;
      } catch (err) {
        console.warn(`⚠️ ${currentNode.name} upload failed: ${err.message}`);
        lastError = err;
      }
    }
  }

  if (!ipfsUploadRes) {
    throw new Error(
      `❌ All IPFS nodes failed. Last error: ${lastError?.message}`
    );
  }

  return {
    cid: ipfsUploadRes.data.cid || filename,
    fileUrl:
      ipfsUploadRes.data.fileUrl ||
      `ipfs://${ipfsUploadRes.data.cid || filename}`,
  };
}

router.post("/upload", upload.single("file"), async (req, res) => {
  const totalStart = Date.now();
  let stepStart = totalStart;

  try {
    const { originalname, mimetype, size, buffer } = req.file;
    const { filename, description, privacy, walletAddress, username } =
      req.body;

    let sharedWithWallets = [];
    if (privacy === "shared" && req.body.sharedWith) {
      const sharedWithUserIds = JSON.parse(req.body.sharedWith);
      const users = await mongoose
        .model("User")
        .find({
          _id: { $in: sharedWithUserIds },
        })
        .select("walletAddress");

      sharedWithWallets = users.map((u) => u.walletAddress);
      console.log("Shared with wallets:", sharedWithWallets);
    }
    console.log("🔐 Username received:", username);

    // Step 1: VirusTotal Scan
    stepStart = Date.now();
    const form = new FormData();
    form.append("file", bufferToStream(buffer), {
      filename: originalname,
      knownLength: size,
    });
    console.log(
      "usernam,filename,description,privacy,walletAddress",
      username,
      filename,
      description,
      privacy,
      walletAddress
    );
    console.log("🚀 Uploading file to VirusTotal...");
    const uploadResponse = await axios.post(VIRUSTOTAL_URL, form, {
      headers: {
        "x-apikey": virusTotalApiKey,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log(
      `✅ VirusTotal upload completed in ${formatDuration(
        Date.now() - stepStart
      )}`
    );

    const fileId = uploadResponse.data.data.id;
    if (!fileId) {
      console.error("No fileId returned from VirusTotal");
      return res
        .status(500)
        .json({ error: "Failed to upload file to VirusTotal" });
    }

    const analysisUrl = `https://www.virustotal.com/api/v3/analyses/${fileId}`;

    let analysisComplete = false;
    let reportResponse;
    stepStart = Date.now();
    while (!analysisComplete && Date.now() - stepStart < ANALYSIS_TIMEOUT) {
      console.log("🔄 Polling VirusTotal for analysis status...");

      await new Promise((res) => setTimeout(res, POLL_INTERVAL));
      try {
        const checkResponse = await axios.get(analysisUrl, {
          headers: { "x-apikey": virusTotalApiKey },
        });

        if (checkResponse.data.data.attributes.status === "completed") {
          analysisComplete = true;
          reportResponse = checkResponse;
          console.log(
            `✅ VirusTotal analysis completed in ${formatDuration(
              Date.now() - stepStart
            )}`
          );
        }
      } catch (err) {
        console.error("Error polling VirusTotal:", err.message);
        break;
      }
    }

    if (!analysisComplete) {
      console.log("❌ VirusTotal scan timeout");
      return res.status(408).json({ error: "VirusTotal scan timeout" });
    }

    const stats = reportResponse.data.data.attributes.stats;
    const detected = stats.malicious + stats.suspicious;
    const fileStatus =
      detected > 3 ? "MALICIOUS" : detected === 0 ? "CLEAN" : "SUSPICIOUS";
    console.log(
      `🛡️ Virus scan result: ${fileStatus} (malicious: ${stats.malicious}, suspicious: ${stats.suspicious})`
    );

    // Step 1.1: Save Virus Scan Log
    stepStart = Date.now();
    await VirusScanLog.create({
      username,
      walletAddress,
      filename: originalname,
      description,
      virusScan: {
        summary: {
          malicious: stats.malicious,
          suspicious: stats.suspicious,
          undetected: stats.undetected,
          harmless: stats.harmless,
        },
        fileStatus,
      },
      // uploaded: detected <= 3
    });
    console.log(
      `📒 Virus scan log saved in ${formatDuration(Date.now() - stepStart)}`
    );

    await VirusScanLog.updateOne(
      { username, filename: originalname, walletAddress }, // unique filter per file + user + wallet
      {
        $set: {
          username,
          walletAddress,
          filename: originalname, // Save filename explicitly
          virusScan: {
            summary: {
              malicious: stats.malicious,
              suspicious: stats.suspicious,
              undetected: stats.undetected,
              harmless: stats.harmless,
            },
            fileStatus: fileStatus,
          },
          description,
        },
      },
      { upsert: true }
    );

    console.log("✅ VirusScanLog updated (latest result saved)");

    if (detected > 3) {
      console.log("⛔ File rejected due to malicious content");
      return res.status(403).json({
        status: "rejected",
        file_status: fileStatus,
        summary: `Malicious: ${stats.malicious}, Suspicious: ${stats.suspicious}`,
        message: "File contains malicious content",
      });
    }

    // Step 2: Upload to IPFS with fallback nodes
    stepStart = Date.now();
    const { cid: ipfsHash, fileUrl: ipfsUrl } = await uploadToIPFS(
      buffer,
      originalname
    );
    // await virusLog.save();
    console.log(
      `📦 File uploaded to IPFS in ${formatDuration(
        Date.now() - stepStart
      )}, CID: ${ipfsHash}`
    );

    // Step 3: Upload Metadata to Smart Contract
    stepStart = Date.now();
    const uploadService = new UploadService();
    await uploadService.init(
      process.env.CONTRACT_ADDRESS,
      process.env.PRIVATE_KEY,
      process.env.SEPOLIA_RPC_URL
    );
    console.log("📡 Smart contract upload service initialized");

    const accessMap = {
      private: 0,
      public: 1,
      shared: 2,
    };

    const access = accessMap[privacy.toLowerCase()];
    if (access === undefined) {
      throw new Error(
        "Invalid privacy option. Must be 'private', 'public', or 'shared'"
      );
    }

    const fileMetadata = await uploadService.uploadFile({
      fileName: filename,
      author: username,
      fileType: mimetype,
      fileSize: size,
      cid: ipfsHash,
      access,
      sharedWithList: sharedWithWallets,
      uploader: walletAddress,
    });
    console.log(
      `📝 File metadata uploaded to smart contract in ${formatDuration(
        Date.now() - stepStart
      )}`
    );

    // Step 4: Save metadata to MongoDB
    stepStart = Date.now();
    const fileData = {
      filename,
      username,
      description,
      privacy,
      walletAddress,
      ipfsHash,
      fileHash: fileMetadata,
      size,
      type: mimetype,
      virusScan: {
        fileStatus,
        summary: stats,
      },
    };

    if (privacy === "shared" && sharedWithWallets.length > 0) {
      fileData.sharedWith = sharedWithWallets;
    }

    const newFile = await File.create(fileData);
    console.log(
      `💾 File metadata saved to MongoDB in ${formatDuration(
        Date.now() - stepStart
      )}`
    );

    console.log(
      `✅ Total upload time: ${formatDuration(Date.now() - totalStart)}`
    );
    return res.status(201).json({
      status: "success",
      file_status: fileStatus,
      ipfsHash,
      ipfsUrl,
      fileHash: fileMetadata,
      summary: `Malicious: ${stats.malicious}, Suspicious: ${stats.suspicious}`,
      file: newFile,
    });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    return res.status(500).json({
      message: "Upload failed",
      error: err.message,
      details: err.response?.data || null,
    });
  } finally {
    console.log("📁 Upload endpoint request finished");
  }
});

export default router;
