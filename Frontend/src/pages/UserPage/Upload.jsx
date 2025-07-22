import React, { useState, useRef, useEffect } from "react";
import { FiSearch, FiCheck } from "react-icons/fi";
import Sidebar from "../../components/Sidebar";
import FloatingBackground from "../../components/FloatingBackground";
import Navbar from "../../components/DashNav";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef(null);
  
  // New states for user selection
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  const fetchUploadedFiles = async () => {
    try {
      const walletAddress = localStorage.getItem("walletAddress");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/files?walletAddress=${walletAddress}`);
      const data = await res.json();
      setUploadedFiles(data);
    } catch (err) {
      console.error("Error fetching uploaded files", err);
    }
  };
  
  //fetch user
  const fetchUsers = async () => {
  setIsLoadingUsers(true);
  try {
    const currentUser = JSON.parse(localStorage.getItem("authUser"));

    // Ensure currentUser and _id are valid
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
      const filtered = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  async function handleUpload() {
    if (!selectedFile || !filename || !description) {
      alert("Please fill all fields and select a file.");
      return;
    }

    if (privacy === "shared" && selectedUsers.length === 0) {
      alert("Please select at least one user to share with.");
      return;
    }

    const username =
      JSON.parse(localStorage.getItem('authUser'))?.username || 'User';
    const walletAddress = localStorage.getItem("walletAddress");

    if (!username || !walletAddress) {
      alert("Missing user credentials. Please log in again.");
      return;
    }

    setIsScanning(true);

    setTimeout(async () => {
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

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          alert(`Uploaded to IPFS! Hash: ${data.ipfsHash}`);
          setSelectedFile(null);
          setFilename("");
          setDescription("");
          setSelectedUsers([]);
          fetchUploadedFiles();
        } else {
          alert(`Upload failed: ${data.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error(err);
        alert("Error uploading file");
      } finally {
        setIsScanning(false);
      }
    }, 5000);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans">
      <Navbar />
      <FloatingBackground />
      <div className="flex flex-1">
        <Sidebar active="Upload" />

        <main className="flex-1 p-10">
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 space-y-4 bg-[#1e1e1e]/80 p-6 rounded-3xl shadow-2xl backdrop-blur-md border border-[#2a2a2a]">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
                Upload to D-Share
              </h1>

              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-300">
                  Filename
                </label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full p-2 bg-[#111] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  placeholder="Enter filename"
                  disabled={isScanning}
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-300">
                  File Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-[#111] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  placeholder="Write a short description about the file"
                  rows="2"
                  style={{ resize: "none" }}
                  disabled={isScanning}
                ></textarea>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                {["public", "private", "shared"].map((option) => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="privacy"
                      value={option}
                      checked={privacy === option}
                      onChange={() => setPrivacy(option)}
                      className={`form-radio h-3 w-3 ${
                        option === "public"
                          ? "text-cyan-500"
                          : option === "private"
                          ? "text-pink-500"
                          : "text-indigo-400"
                      }`}
                      disabled={isScanning}
                    />
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>

              {privacy === "shared" && (
                <div className="space-y-2">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#111] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                      disabled={isLoadingUsers || isScanning}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-[#333] rounded-lg bg-[#111]">
                    {isLoadingUsers ? (
                      <div className="p-4 text-center text-gray-400 text-sm">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        {searchTerm ? "No matching users found" : "No users available"}
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between p-2 hover:bg-[#222] border-b border-[#333] last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={user.profilePic || `https://i.pravatar.cc/150?u=${user._id}`}
                              alt={user.username}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm">{user.username}</span>
                          </div>
                          <button
                            onClick={() => toggleUserSelection(user._id)}
                            disabled={isScanning}
                            className={`p-1 rounded-full ${selectedUsers.includes(user._id) ? 'bg-indigo-500 text-white' : 'bg-[#333]'}`}
                          >
                            <FiCheck size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="text-xs text-gray-400">
                      Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={handleBrowseClick}
                className={`w-full h-40 border-4 border-dashed rounded-xl flex flex-col justify-center items-center transition-all duration-300 cursor-pointer relative ${
                  dragActive
                    ? "border-cyan-500 bg-[#222]/60"
                    : "border-[#444] bg-[#1a1a1a]/40 hover:border-cyan-500"
                } ${isScanning ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {selectedFile ? (
                  <p className="text-center text-base font-medium animate-pulse truncate max-w-full">
                    {selectedFile.name}
                  </p>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 mb-2 text-cyan-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16v4m0 0h10m-10 0l5-5m0-9v9m0 0l5-5m-5 5L7 7"
                      />
                    </svg>
                    <p className="text-gray-400 text-center text-sm">
                      Drag & Drop your file here
                    </p>
                    <span className="mt-1 text-xs bg-cyan-500 text-black px-2 py-0.5 rounded-lg font-medium">
                      Browse File
                    </span>
                  </>
                )}
                <input
                  type="file"
                  ref={inputRef}
                  className="hidden"
                  onChange={handleChange}
                  disabled={isScanning}
                />
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-blue-400/80 to-transparent animate-scan-horizontal"></div>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleUpload}
                  disabled={isScanning}
                  className="mt-4 px-8 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              </div>
            </div>

            <div className="w-full lg:w-80 bg-[#1e1e1e]/80 p-6 rounded-2xl shadow-xl border border-[#2b2b2b] backdrop-blur-lg overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">Uploaded Files</h2>
              {uploadedFiles.length === 0 ? (
                <p className="text-gray-500 text-sm">No files uploaded yet.</p>
              ) : (
                <ul className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <li key={file._id} className="p-3 bg-[#111] rounded-xl border border-[#333] hover:border-cyan-500 transition-all">
                      <p className="font-semibold truncate text-white">{file.filename}</p>
                      <p className="text-sm text-gray-400 truncate">{file.description}</p>
                      <span className="text-xs text-cyan-500 capitalize">{file.privacy}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>

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