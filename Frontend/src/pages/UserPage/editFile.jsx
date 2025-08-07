import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiSearch, FiCheck } from "react-icons/fi";
import { ethers } from "ethers";
import Sidebar from "../../components/Sidebar.jsx";
import FloatingBackground from "../../components/FloatingBackground.jsx";
import Navbar from "../../components/DashNav.jsx";
import { changeAccessType, AccessType } from "../../utils/accessChange.js";
import { toast } from 'react-hot-toast';

export default function EditFilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [privacy, setPrivacy] = useState("private");
  const [sharedWith, setSharedWith] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Check for MetaMask on component mount
  useEffect(() => {
    setIsMetaMaskInstalled(!!window.ethereum);
  }, []);

  // Fetch file data
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/file/${id}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch file");
        }

        const data = await response.json();
        setFile(data);
        setPrivacy(data.privacy);
        setSharedWith(data.sharedWith || []);
      } catch (err) {
        console.error("File fetch error:", err);
        setError(err.message);
      }
    };

    fetchFileData();
  }, [id]);

  // Fetch users when privacy set to shared
  useEffect(() => {
    const fetchUsers = async () => {
      if (privacy !== "shared") {
        setUsers([]);
        setFilteredUsers([]);
        return;
      }

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

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        console.error("User fetch error:", err);
        setError(err.message);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [privacy]);

  // Filter users based on search term
  useEffect(() => {
    if (privacy === "shared") {
      const filtered = users.filter((user) =>
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users, privacy]);

  const toggleUserSelection = (userId) => {
    setSharedWith((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleUpdate = async () => {
    if (!isMetaMaskInstalled) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }

    if (!file?.fileHash) {
      setError("No file hash available in file data");
      return;
    }

    setError(null);
    setTxHash(null);
    setIsUpdating(true);

    try {
      // Get wallet addresses of selected users
      const selectedUserData = users.filter((user) =>
        sharedWith.includes(user._id)
      );
      const sharedUsers = selectedUserData
        .map((user) => user.walletAddress)
        .filter((addr) => addr && ethers.isAddress(addr));

      // Convert file hash to hex string
      const fileHashHex = ethers.hexlify(file.fileHash);

      // Call the smart contract function
      const receipt = await changeAccessType(fileHashHex, privacy, sharedUsers);
      setTxHash(receipt.hash);

      // Update database - now storing wallet addresses instead of user IDs
      const updateResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/update-file/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              JSON.parse(localStorage.getItem("authUser"))?.token
            }`,
          },
          body: JSON.stringify({
            privacy,
            sharedWith: privacy === "shared" ? sharedUsers : [], 
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error("Database update failed");
      }

      toast.success("File access updated successfully!");
      navigate("/upload");
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update file access");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!file) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-white text-lg">Loading file data...</p>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <Navbar />
      </header>
      <Sidebar active="Upload" />

      <FloatingBackground />

      <main className="flex-1 p-6 md:p-10 ml-56 mt-25">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6 bg-[#1e1e1e]/80 p-6 rounded-3xl shadow-2xl backdrop-blur-md border border-[#2a2a2a]">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-6">
              Edit File Access
            </h1>

            {!isMetaMaskInstalled && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-sm mb-4">
                MetaMask is not installed. You need it to change access
                permissions.
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-sm mb-4">
                {error}
              </div>
            )}

            {txHash && (
              <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4 text-sm mb-4">
                <p>
                  Transaction sent: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  View on Etherscan
                </a>
              </div>
            )}

            <div className="grid gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">
                  Filename
                </label>
                <input
                  type="text"
                  value={file.filename}
                  disabled
                  className="w-full p-3 bg-[#111]/70 border border-[#333] rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">
                  File Description
                </label>
                <textarea
                  value={file.description || "No description"}
                  disabled
                  className="w-full p-3 bg-[#111]/70 border border-[#333] rounded-lg text-white text-sm min-h-[80px]"
                  style={{ resize: "none" }}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300">
                  Access Type
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
                        disabled={!isMetaMaskInstalled || isUpdating}
                        className={`form-radio h-4 w-4 ${
                          option === "public"
                            ? "text-cyan-500"
                            : option === "private"
                            ? "text-pink-500"
                            : "text-indigo-400"
                        }`}
                      />
                      <span className="capitalize text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {privacy === "shared" && (
                <div className="space-y-4">
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
                      disabled={isLoadingUsers || isUpdating}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#111]/70 border border-[#333] rounded-lg text-white text-sm"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-[#333] rounded-lg bg-[#111]/70">
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
                          className="flex items-center justify-between p-3 hover:bg-[#222] border-b border-[#333] last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                user.profilePic ||
                                `https://ui-avatars.com/api/?name=${user.username}&background=random`
                              }
                              alt={user.username}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {user.username}
                              </p>
                              {user.walletAddress && (
                                <p className="text-xs text-gray-400">
                                  {user.walletAddress.slice(0, 6)}...
                                  {user.walletAddress.slice(-4)}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleUserSelection(user._id)}
                            disabled={isUpdating}
                            className={`p-1.5 rounded-full ${
                              sharedWith.includes(user._id)
                                ? "bg-indigo-500 text-white"
                                : "bg-[#333] hover:bg-[#444]"
                            }`}
                          >
                            <FiCheck size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {sharedWith.length > 0 && (
                    <div className="text-sm text-gray-400">
                      Selected: {sharedWith.length} user
                      {sharedWith.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={isUpdating || !isMetaMaskInstalled}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                  isUpdating
                    ? "bg-gray-600 cursor-not-allowed"
                    : isMetaMaskInstalled
                    ? "bg-cyan-600 hover:bg-cyan-700"
                    : "bg-gray-500 cursor-not-allowed"
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
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
                    </svg>
                    Updating...
                  </span>
                ) : isMetaMaskInstalled ? (
                  "Save Changes"
                ) : (
                  "MetaMask Required"
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
