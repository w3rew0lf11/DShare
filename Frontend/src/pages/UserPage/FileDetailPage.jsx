import { useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { downloadFileByHash } from "../../utils/getfile.js";
import Navbar from "../../components/DashNav";
import { motion, AnimatePresence } from "framer-motion";
import FloatingBackground from "../../components/FloatingBackground";

import {
  FiDownload,
  FiArrowLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
  FiUnlock,
  FiShare2,
  FiClock,
  FiUser,
  FiHash,
  FiFile,
  FiHardDrive,
  FiUsers,
} from "react-icons/fi";

export default function FileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState({
    loading: false,
    error: null,
    success: false,
  });

  const IPFS_NODES = [
    { url: "http://192.168.18.21:5005/api/files", name: "Primary Node" },
    { url: "http://192.168.18.53:5005/api/files", name: "Secondary Node 1" },
    { url: "http://192.168.18.54:5005/api/files", name: "Secondary Node 2" },
  ];

  useEffect(() => {
    const fetchFile = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/file/${id}`
        );
        const data = await res.json();
        setFile(data);
      } catch (err) {
        console.error("Failed to fetch file:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFile();
    window.scrollTo(0, 0);
  }, [id]);

  const isNodeOnline = async (nodeUrl, nodeName) => {
    try {
      await axios.head(nodeUrl, { timeout: 2000 });
      return true;
    } catch (error) {
      console.warn(`${nodeName} is offline or unreachable: ${error.message}`);
      return false;
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    setDownloadStatus({ loading: true, error: null, success: false });

    try {
      const contractFile = await verifyWithContract(file.fileHash);
      if (!contractFile || !contractFile.cid) {
        throw new Error("File not found in smart contract or access denied");
      }

      await downloadWithFallback(contractFile.cid, file.filename);
      setDownloadStatus({ loading: false, error: null, success: true });
    } catch (error) {
      console.error("Download process failed:", error);
      setDownloadStatus({
        loading: false,
        error: error.message || "Download failed",
        success: false,
      });
    }
  };

  const verifyWithContract = async (fileHash) => {
    try {
      return await downloadFileByHash(fileHash);
    } catch (error) {
      console.error("Smart contract verification failed:", error);
      throw new Error(
        "Smart contract verification failed: " +
          (error.reason || error.message || "Access denied")
      );
    }
  };

  const downloadWithFallback = async (ipfsHash, filename) => {
    let lastError = null;

    // Try primary node first
    const primaryNode = IPFS_NODES[0];
    try {
      await downloadFromNode(
        primaryNode.url,
        ipfsHash,
        filename,
        primaryNode.name
      );
      return;
    } catch (error) {
      lastError = error;
    }

    // Try fallback nodes
    for (let i = 1; i < IPFS_NODES.length; i++) {
      const currentNode = IPFS_NODES[i];
      const isOnline = await isNodeOnline(currentNode.url, currentNode.name);
      if (!isOnline) continue;

      try {
        await downloadFromNode(
          currentNode.url,
          ipfsHash,
          filename,
          currentNode.name
        );
        return;
      } catch (error) {
        lastError = error;
      }
    }

    // Try public IPFS gateway as final fallback
    try {
      await downloadFromNode(
        `https://ipfs.io/ipfs`,
        ipfsHash,
        filename,
        "Public Gateway"
      );
      return;
    } catch (error) {
      lastError = error;
    }

    throw new Error(
      `All download attempts failed. Last error: ${lastError?.message}`
    );
  };

  const downloadFromNode = async (baseUrl, ipfsHash, filename, nodeName) => {
    const url = `${baseUrl}/${ipfsHash}`;
    try {
      const response = await axios.get(url, {
        responseType: "blob",
        timeout: 15000,
      });

      let fileExtension = "bin";
      if (file.type) {
        const typeParts = file.type.split("/");
        if (typeParts.length > 1) {
          fileExtension = typeParts[1];
          if (
            fileExtension ===
            "vnd.openxmlformats-officedocument.wordprocessingml.document"
          ) {
            fileExtension = "docx";
          } else if (
            fileExtension ===
            "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ) {
            fileExtension = "xlsx";
          } else if (
            fileExtension ===
            "vnd.openxmlformats-officedocument.presentationml.presentation"
          ) {
            fileExtension = "pptx";
          }
        }
      }

      let downloadFilename;
      if (filename) {
        downloadFilename = filename.includes(".")
          ? filename
          : `${filename}.${fileExtension}`;
      } else {
        downloadFilename = `file-${ipfsHash.substring(0, 8)}.${fileExtension}`;
      }

      const blob = new Blob([response.data], {
        type: file.type || "application/octet-stream",
      });
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", downloadFilename);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (error) {
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
        <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
          <Navbar />
        </header>
        <div className="flex flex-1 pt-16">
          <Sidebar />
          <div className="flex-1 p-4 md:p-8 ml-0 md:ml-64 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                className="mx-auto mb-6"
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                }}
                style={{
                  width: 60,
                  height: 60,
                  border: "4px solid #22d3ee",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  boxShadow: "0 0 15px rgba(34, 211, 238, 0.5)",
                }}
              />
              <motion.h2
                className="text-2xl font-bold text-cyan-400 mb-2 flex items-center justify-center gap-2"
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <FiFile className="text-cyan-400" />
                Loading File
              </motion.h2>
              <motion.p
                className="text-gray-400 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <FiClock className="text-gray-400" />
                Fetching file details...
              </motion.p>
              <motion.div
                className="mt-6 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-cyan-400 rounded-full"
                      animate={{
                        y: [0, -10, 0],
                        opacity: [0.6, 1, 0.6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: i * 0.2,
                      }}
                      style={{
                        boxShadow: "0 0 8px rgba(34, 211, 238, 0.7)",
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
        <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
          <Navbar />
        </header>
        <div className="flex flex-1 pt-16">
          <Sidebar />
          <div className="flex-1 p-4 md:p-8 ml-0 md:ml-64 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                className="mx-auto mb-6 text-gray-400"
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  filter: "drop-shadow(0 0 8px rgba(56, 182, 255, 0.6))",
                }}
                transition={{ type: "spring" }}
              >
                <FiAlertCircle className="h-16 w-16" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                File Not Found
              </h2>
              <p className="text-gray-400 mb-6">
                The requested file could not be loaded
              </p>
              <motion.button
                onClick={() => navigate("/download")}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium relative overflow-hidden glow-button flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiArrowLeft />
                <span className="relative z-10">Back to Files</span>
                <motion.span
                  className="absolute inset-0 bg-blue-400 opacity-0 hover:opacity-20"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 0.2 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .glow-button {
          box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);
          transition: box-shadow 0.3s ease;
        }
        .glow-button:hover {
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.6);
        }
        .privacy-badge {
          transition: all 0.3s ease;
        }
        .privacy-badge.public {
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
        }
        .privacy-badge.shared {
          box-shadow: 0 0 8px rgba(56, 182, 255, 0.4);
        }
.privacy-badge.private {
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.5); /* soft red glow */
}


      `}</style>

      <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
        <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
          <Navbar />
        </header>
        <Sidebar />

        <div className="flex flex-1 pt-16">
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 p-4 md:p-8 ml-0 md:ml-64 overflow-y-auto mt-20"
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-gray-900/70 rounded-xl p-6 md:p-10 shadow-xl border border-gray-700 max-w-4xl mx-auto relative overflow-hidden"
            >
              <motion.div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-gray-700 relative z-10"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <motion.h2
                  className="text-2xl md:text-3xl font-extrabold break-all text-white flex items-center gap-3"
                  whileHover={{ scale: 1.01 }}
                >
                  <FiFile className="text-cyan-400" />
                  {file.filename}
                </motion.h2>
                <motion.span
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 privacy-badge ${
                    file.privacy === "public"
                      ? "bg-cyan-900/30 text-cyan-400 public"
                      : file.privacy === "shared"
                      ? "bg-blue-900/30 text-blue-400 shared"
                      : "bg-purple-900/30 text-gray-300 private"
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {file.privacy === "public" ? (
                    <FiUnlock className="text-cyan-400" />
                  ) : file.privacy === "shared" ? (
                    <FiShare2 className="text-blue-400" />
                  ) : (
                    <FiLock className="text-gray-300" />
                  )}
                  {file.privacy === "public"
                    ? "Public"
                    : file.privacy === "shared"
                    ? "Shared"
                    : "Private"}
                </motion.span>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, staggerChildren: 0.1 }}
              >
                <motion.div
                  className="space-y-4"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <div className="flex items-start gap-3">
                    <FiUser className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">
                        Uploaded By
                      </h3>
                      <p className="text-white break-all">{file.username}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiUser className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">
                        Wallet Address
                      </h3>
                      <p className="text-white break-all">
                        {file.walletAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiClock className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">
                        Upload Date
                      </h3>
                      <p className="text-gray-200">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="space-y-4"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <div className="flex items-start gap-3">
                    <FiFile className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">File Type</h3>
                      <p className="text-gray-200">{file.type}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiHardDrive className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">File Size</h3>
                      <p className="text-gray-200">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FiHash className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">File Hash</h3>
                      <p className="text-gray-200 break-all text-sm">
                        {file.fileHash}
                      </p>
                    </div>
                  </div>
                </motion.div>
                {file.privacy === "shared" && file.sharedWith?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <FiUsers className="text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">
                        Shared With
                      </h3>
                      <ul className="text-gray-200 text-sm space-y-1">
                        {file.sharedWith.map((user, idx) => (
                          <li key={idx} className="break-all">
                            {user}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <motion.div
                  className="md:col-span-2"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <h3 className="text-gray-400 text-sm mb-1">Description</h3>
                  <motion.p
                    className="bg-gray-800/50 p-3 rounded-lg border border-gray-700"
                    whileHover={{ scale: 1.01 }}
                  >
                    {file.description || "No description provided"}
                  </motion.p>
                </motion.div>
              </motion.div>

              <motion.div
                className="mt-8 space-y-4 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    className={`flex-1 px-4 py-3 rounded-lg transition-all font-semibold ${
                      downloadStatus.loading
                        ? "bg-blue-800 cursor-wait"
                        : downloadStatus.error
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-blue-600 hover:bg-blue-500 glow-button"
                    } flex items-center justify-center gap-2 relative overflow-hidden`}
                    onClick={handleDownload}
                    disabled={downloadStatus.loading}
                    whileHover={{ scale: downloadStatus.loading ? 1 : 1.05 }}
                    whileTap={{ scale: downloadStatus.loading ? 1 : 0.95 }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {downloadStatus.loading ? (
                        <>
                          <motion.svg
                            className="h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </motion.svg>
                          Downloading...
                        </>
                      ) : downloadStatus.error ? (
                        <>
                          <FiAlertCircle />
                          Try Again
                        </>
                      ) : (
                        <>
                          <FiDownload />
                          Download File
                        </>
                      )}
                    </span>
                    {!downloadStatus.loading && !downloadStatus.error && (
                      <motion.span
                        className="absolute inset-0 bg-blue-400 opacity-0 hover:opacity-20"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 0.2 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </motion.button>

                  <motion.button
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all font-semibold flex items-center justify-center gap-2 relative overflow-hidden border border-gray-600"
                    onClick={() => navigate("/download")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <FiArrowLeft />
                      Back to Files
                    </span>
                    <motion.span
                      className="absolute inset-0 bg-gray-500 opacity-0 hover:opacity-20"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.2 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {downloadStatus.error && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-red-900/50 p-3 rounded-lg flex items-center gap-2 border border-red-700"
                    >
                      <FiAlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-red-300">
                        Download failed: {downloadStatus.error}
                      </span>
                    </motion.div>
                  )}

                  {downloadStatus.success && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-blue-900/50 p-3 rounded-lg flex items-center gap-2 border border-blue-700"
                    >
                      <FiCheckCircle className="h-5 w-5 text-blue-400" />
                      <span className="text-blue-300">
                        Download started successfully!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </motion.main>
        </div>
        {/* Background Elements */}
        <FloatingBackground />
      </div>
    </>
  );
}
