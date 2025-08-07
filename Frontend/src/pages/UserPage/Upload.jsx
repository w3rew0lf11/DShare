import { Link } from "react-router-dom";
import React, { useState, useRef, useEffect } from "react";
import {
  FiSearch,
  FiCheck,
  FiUpload,
  FiShield,
  FiDatabase,
  FiClock,
  FiX,
} from "react-icons/fi";
import { FaEthereum } from "react-icons/fa";
import Sidebar from "../../components/Sidebar";
import FloatingBackground from "../../components/FloatingBackground";
import Navbar from "../../components/DashNav";
import toast from "react-hot-toast";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const inputRef = useRef(null);
  const [showProgressBar, setShowProgressBar] = useState(false);

  // User selection states
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Upload progress states
  const [uploadProgress, setUploadProgress] = useState({
    status: "idle",
    steps: {
      virusScan: { status: "pending", time: null, message: "" },
      ipfsUpload: { status: "pending", time: null, message: "" },
      blockchain: { status: "pending", time: null, message: "" },
      database: { status: "pending", time: null, message: "" },
    },
    totalTime: null,
    scanResults: null,
  });

  // Event handlers
  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  }

  function handleChange(e) {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  }

  function handleBrowseClick() {
    inputRef.current.click();
  }

  // Data fetching
  const fetchUploadedFiles = async () => {
    try {
      const walletAddress = localStorage.getItem("walletAddress");
      const res = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/api/files?walletAddress=${walletAddress}`
      );
      const data = await res.json();
      setUploadedFiles(data);
    } catch (err) {
      console.error("Error fetching uploaded files", err);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem("authUser"));
      let url = `${import.meta.env.VITE_API_BASE_URL}/api/users`;
      if (currentUser?._id) {
        url += `?exclude=${currentUser._id}`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  useEffect(() => {
    if (privacy === "shared") {
      fetchUsers();
    } else {
      setSelectedUsers([]);
    }
  }, [privacy]);

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Helper functions
  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const updateProgressStep = (step, updates) => {
    setUploadProgress((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        [step]: {
          ...prev.steps[step],
          ...updates,
        },
      },
    }));
  };

  const closeProgressBar = () => {
    setShowProgressBar(false);
    if (uploadProgress.status !== "complete") {
      setUploadProgress({
        status: "idle",
        steps: {
          virusScan: { status: "pending", time: null, message: "" },
          ipfsUpload: { status: "pending", time: null, message: "" },
          blockchain: { status: "pending", time: null, message: "" },
          database: { status: "pending", time: null, message: "" },
        },
        totalTime: null,
        scanResults: null,
      });
    }
  };

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }
  };

  // Main upload function
  async function handleUpload() {
    if (!selectedFile || !filename || !description) {
      toast.error("Please fill all fields and select a file.");
      return;
    }

    if (privacy === "shared" && selectedUsers.length === 0) {
      toast.error("Please select at least one user to share with.");
      return;
    }

    const username =
      JSON.parse(localStorage.getItem("authUser"))?.username || "User";
    const walletAddress = localStorage.getItem("walletAddress");

    if (!username || !walletAddress) {
      toast.error("Missing user credentials. Please log in again.");
      return;
    }

    setShowProgressBar(true);
    setUploadProgress({
      status: "scanning",
      steps: {
        virusScan: {
          status: "in-progress",
          time: null,
          message: "Starting virus scan...",
        },
        ipfsUpload: { status: "pending", time: null, message: "" },
        blockchain: { status: "pending", time: null, message: "" },
        database: { status: "pending", time: null, message: "" },
      },
      totalTime: null,
      scanResults: null,
    });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("filename", filename);
      formData.append("description", description);
      formData.append("privacy", privacy);
      formData.append("username", username);
      formData.append("walletAddress", walletAddress);

      if (privacy === "shared") {
        formData.append("sharedWith", JSON.stringify(selectedUsers));
      }

      const startTime = Date.now();

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        // Simulate step-by-step progress
        updateProgressStep("virusScan", {
          status: "complete",
          time: formatDuration(data.timeTaken?.virusScan || 0),
          message: "File scanned successfully",
        });

        setTimeout(() => {
          updateProgressStep("ipfsUpload", {
            status: "in-progress",
            message: "Uploading to IPFS...",
          });

          setTimeout(() => {
            updateProgressStep("ipfsUpload", {
              status: "complete",
              time: formatDuration(data.timeTaken?.ipfsUpload || 0),
              message: `Uploaded to IPFS`,
            });

            updateProgressStep("blockchain", {
              status: "in-progress",
              message: "Storing record on blockchain...",
            });

            setTimeout(() => {
              updateProgressStep("blockchain", {
                status: "complete",
                time: formatDuration(data.timeTaken?.blockchain || 0),
                message: `Transaction hash: ${data.txHash}`,
              });

              setUploadProgress((prev) => ({
                status: "complete",
                steps: {
                  ...prev.steps,
                  database: {
                    status: "complete",
                    time: formatDuration(data.timeTaken?.database || 0),
                    message: "File metadata stored successfully",
                  },
                },
                totalTime: formatDuration(Date.now() - startTime),
                scanResults: {
                  status: data.file_status,
                  malicious: data.summary?.malicious || 0,
                  suspicious: data.summary?.suspicious || 0,
                },
              }));

              toast.success("File uploaded successfully!");
            }, 1500);
          }, 1500);
        }, 500);

        setSelectedFile(null);
        setFilename("");
        setDescription("");
        setSelectedUsers([]);
        fetchUploadedFiles();
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setUploadProgress((prev) => ({
        ...prev,
        status: "error",
        steps: {
          ...prev.steps,
          [Object.keys(prev.steps).find(
            (step) => prev.steps[step].status === "in-progress"
          )]: {
            status: "error",
            message: err.message,
          },
        },
      }));
      toast.error("Error uploading file");
    }
  }

  // Progress Step Component
  const ProgressStep = ({ icon, title, step }) => {
    const stepData = uploadProgress.steps[step];
    const isCurrent =
      uploadProgress.status !== "idle" &&
      (stepData.status === "in-progress" ||
        (uploadProgress.status === "complete" && step === "database") ||
        (uploadProgress.status === "error" && stepData.status === "error"));

    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
          isCurrent ? "bg-[#222] border border-cyan-500/30" : "bg-[#1a1a1a]"
        }`}
      >
        <div
          className={`p-2 rounded-full ${
            stepData.status === "complete"
              ? "bg-green-500/20 text-green-400"
              : stepData.status === "in-progress"
              ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
              : stepData.status === "error"
              ? "bg-red-500/20 text-red-400"
              : "bg-[#333] text-gray-400"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">{title}</h3>
            {stepData.time && (
              <span className="text-xs bg-[#333] px-2 py-1 rounded flex items-center gap-1">
                <FiClock size={12} /> {stepData.time}
              </span>
            )}
          </div>
          <p
            className={`text-xs mt-1 ${
              stepData.status === "error" ? "text-red-400" : "text-gray-400"
            }`}
          >
            {stepData.message ||
              (stepData.status === "pending" ? "Waiting to start..." : "")}
          </p>
          {step === "virusScan" && uploadProgress.scanResults && (
            <div className="mt-2 flex gap-2 text-xs">
              <span
                className={`px-2 py-1 rounded ${
                  uploadProgress.scanResults.status === "MALICIOUS"
                    ? "bg-red-500/20 text-red-400"
                    : uploadProgress.scanResults.status === "SUSPICIOUS"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-green-500/20 text-green-400"
                }`}
              >
                Status: {uploadProgress.scanResults.status}
              </span>
              <span className="px-2 py-1 rounded bg-[#333]">
                Malicious: {uploadProgress.scanResults.malicious}
              </span>
              <span className="px-2 py-1 rounded bg-[#333]">
                Suspicious: {uploadProgress.scanResults.suspicious}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Progress Modal Component
  const ProgressBarModal = () => (
    <div className="fixed inset-0 bg-[rgba(19,26,62,0.5)] backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-cyan-400">Upload Progress</h2>
          <button
            onClick={closeProgressBar}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Status: {uploadProgress.status}</span>
            {uploadProgress.totalTime && (
              <span className="flex items-center gap-1">
                <FiClock size={14} /> {uploadProgress.totalTime}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <ProgressStep
              icon={<FiShield size={16} />}
              title="Virus Scan"
              step="virusScan"
            />
            <ProgressStep
              icon={<FiUpload size={16} />}
              title="IPFS Upload"
              step="ipfsUpload"
            />
            <ProgressStep
              icon={<FaEthereum size={16} />}
              title="Blockchain Record"
              step="blockchain"
            />
            <ProgressStep
              icon={<FiDatabase size={16} />}
              title="Database Storage"
              step="database"
            />
          </div>

          {uploadProgress.scanResults && (
            <div className="mt-4 p-3 bg-[#111] rounded-lg">
              <h3 className="text-sm font-medium mb-2">Scan Results</h3>
              <div className="flex gap-2 text-xs">
                <span
                  className={`px-2 py-1 rounded ${
                    uploadProgress.scanResults.status === "MALICIOUS"
                      ? "bg-red-500/20 text-red-400"
                      : uploadProgress.scanResults.status === "SUSPICIOUS"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  Status: {uploadProgress.scanResults.status}
                </span>
                <span className="px-2 py-1 rounded bg-[#333]">
                  Malicious: {uploadProgress.scanResults.malicious}
                </span>
                <span className="px-2 py-1 rounded bg-[#333]">
                  Suspicious: {uploadProgress.scanResults.suspicious}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={closeProgressBar}
            className={`mt-4 w-full py-2 rounded-xl font-medium ${
              uploadProgress.status === "complete"
                ? "bg-green-500 hover:bg-green-600"
                : uploadProgress.status === "error"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-600 cursor-not-allowed"
            } transition-colors`}
            disabled={
              uploadProgress.status !== "complete" &&
              uploadProgress.status !== "error"
            }
          >
            {uploadProgress.status === "complete"
              ? "Done"
              : uploadProgress.status === "error"
              ? "Close"
              : "Processing..."}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans">
      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <Navbar />
      </header>

      {/* Fixed Sidebar */}
      <Sidebar active="Upload" />

      {/* Main Content */}
      <main className="flex-1 ml-64 mt-16 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto mt-16">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Upload Form Section */}
            <div className="flex-1 space-y-6 bg-[#1e1e1e]/90 p-8 rounded-3xl shadow-2xl backdrop-blur-lg border border-[#2a2a2a]/50">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-6">
                Upload to D-Share
              </h1>

              <div className="space-y-6">
                {/* Filename Field */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full px-4 py-3 bg-[#111]/70 border border-[#333]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="Enter filename"
                    disabled={uploadProgress.status !== "idle"}
                  />
                </div>

                {/* Description Field */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">
                    File Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-[#111]/70 border border-[#333]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all min-h-[100px]"
                    placeholder="Describe your file content"
                    disabled={uploadProgress.status !== "idle"}
                  />
                </div>

                {/* Privacy Options */}
                <div>
                  <label className="block mb-3 text-sm font-medium text-gray-300">
                    Privacy Setting
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {["public", "private", "shared"].map((option) => (
                      <label
                        key={option}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="privacy"
                          value={option}
                          checked={privacy === option}
                          onChange={() => setPrivacy(option)}
                          className={`h-4 w-4 ${
                            option === "public"
                              ? "text-cyan-500"
                              : option === "private"
                              ? "text-pink-500"
                              : "text-indigo-500"
                          }`}
                          disabled={uploadProgress.status !== "idle"}
                        />
                        <span className="text-sm capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Shared Users Section */}
                {privacy === "shared" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Share With Users
                    </label>
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#111]/70 border border-[#333]/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        disabled={
                          isLoadingUsers || uploadProgress.status !== "idle"
                        }
                      />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto border border-[#333]/30 rounded-xl bg-[#111]/50">
                      {isLoadingUsers ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          Loading users...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">
                          {searchTerm
                            ? "No matching users found"
                            : "No users available"}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center justify-between p-3 hover:bg-[#222] border-b border-[#333]/30 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  user.profilePic ||
                                  `https://i.pravatar.cc/150?u=${user._id}`
                                }
                                alt={user.username}
                                className="w-8 h-8 rounded-full"
                              />
                              <span className="text-sm">{user.username}</span>
                            </div>
                            <button
                              onClick={() => toggleUserSelection(user._id)}
                              disabled={uploadProgress.status !== "idle"}
                              className={`p-1.5 rounded-full ${
                                selectedUsers.includes(user._id)
                                  ? "bg-indigo-500 text-white"
                                  : "bg-[#333]"
                              }`}
                            >
                              <FiCheck size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {selectedUsers.length > 0 && (
                      <div className="text-sm text-gray-400">
                        Selected: {selectedUsers.length} user
                        {selectedUsers.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                )}

                {/* File Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleBrowseClick}
                  className={`w-full h-40 border-2 border-dashed rounded-xl flex flex-col justify-center items-center transition-all ${
                    dragActive
                      ? "border-cyan-500 bg-[#222]/60"
                      : "border-[#444] bg-[#1a1a1a]/40 hover:border-cyan-500"
                  } ${
                    uploadProgress.status !== "idle"
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer"
                  }`}
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-lg font-medium text-cyan-400">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <FiUpload className="h-12 w-12 mb-3 text-cyan-400" />
                      <p className="text-gray-400 text-center text-sm">
                        Drag & Drop your file here
                      </p>
                      <span className="mt-2 text-xs bg-cyan-500 text-black px-3 py-1 rounded-lg font-medium">
                        Or click to browse files
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    ref={inputRef}
                    className="hidden"
                    onChange={handleChange}
                    disabled={uploadProgress.status !== "idle"}
                  />
                  {uploadProgress.status === "scanning" && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-blue-400/80 to-transparent animate-scan-horizontal"></div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploadProgress.status !== "idle" || !selectedFile}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadProgress.status === "idle"
                    ? "Upload File"
                    : uploadProgress.status === "complete"
                    ? "Upload Complete"
                    : uploadProgress.status === "error"
                    ? "Try Again"
                    : "Uploading..."}
                </button>
              </div>
            </div>

            {/* Uploaded Files Section */}
            <div className="w-full lg:w-80 bg-[#1e1e1e]/90 p-6 rounded-2xl shadow-xl border border-[#2b2b2b]/50 backdrop-blur-lg">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">
                Your Files
              </h2>
              <div className="h-[calc(100vh-300px)] overflow-y-auto">
                {uploadedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                    <FiDatabase className="mb-2 text-xl" />
                    <p>No files uploaded yet</p>
                  </div>
                ) : (
                  <ul className="space-y-3 pr-2">
                    {uploadedFiles.map((file) => (
                      <li
                        key={file._id}
                        className="p-3 bg-[#111]/70 rounded-xl border border-[#333]/30 hover:border-cyan-500/50 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {file.filename}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {file.description}
                            </p>
                          </div>
                          <Link
                            to={`/edit-file/${file._id}`}
                            className="text-xs px-3 py-1 bg-blue-600/80 hover:bg-blue-500 text-white rounded transition-all whitespace-nowrap ml-2"
                          >
                            Edit
                          </Link>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span
                            className={`px-2 py-1 rounded capitalize ${
                              file.privacy === "public"
                                ? "bg-cyan-500/20 text-cyan-400"
                                : file.privacy === "private"
                                ? "bg-pink-500/20 text-pink-400"
                                : "bg-indigo-500/20 text-indigo-400"
                            }`}
                          >
                            {file.privacy}
                          </span>
                          <span className="text-gray-400">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <FloatingBackground />
      {showProgressBar && <ProgressBarModal />}

      <style>{`
        @keyframes scan-horizontal {
          0% { left: -100%; } 
          100% { left: 100%; }
        }
        .animate-scan-horizontal {
          animation: scan-horizontal 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
