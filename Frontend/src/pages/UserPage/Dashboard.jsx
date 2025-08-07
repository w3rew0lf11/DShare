import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import Navbar from "../../components/DashNav";
import Sidebar from "../../components/Sidebar";
import FloatingBackground from "../../components/FloatingBackground";
import FileUploadGraph from "../UserPage/FileUploadGraph";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { walletAddress, setAuthUser } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [tempGender, setTempGender] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        toast.success("Copied to clipboard!");
      } catch (copyErr) {
        toast.error("Failed to copy address");
      }
      document.body.removeChild(textarea);
    }
  };

  // 🔍 Check if wallet is already registered
  useEffect(() => {
    const checkUser = async () => {
      if (!walletAddress) return;

      try {
        setIsLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/users/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ walletAddress }),
          }
        );

        const data = await res.json();
        if (res.ok && data?.username) {
          updateUserState(data);
          localStorage.setItem(
            "authUser",
            JSON.stringify({
              _id: data.id,
              username: data.username,
              gender: data.gender,
              walletAddress: data.walletAddress,
              profilePic: data.profilePic,
              token: data.token,
            })
          );
          localStorage.setItem("profilePic", data.profilePic);
          setShowForm(false);
        } else {
          setShowForm(true);
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [walletAddress]);

  const updateUserState = (data) => {
    setUsername(data.username);
    setGender(data.gender);
    setTempUsername(data.username);
    setTempGender(data.gender);
    setAuthUser(data); 
  };

  const handleUserSubmit = async (e) => {
  e.preventDefault();

  if (!tempUsername.trim()) {
    toast.error("Please enter your username.");
    return;
  }

  try {
    setIsLoading(true);
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/users/data`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: tempUsername,
          walletAddress,
          gender: tempGender,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save profile");
    }

    // Update state and local storage
    updateUserState(data);
    
    // Store full user object in localStorage
    const authUserData = {
      _id: data._id,
      username: data.username,
      gender: data.gender,
      walletAddress: data.walletAddress,
      profilePic: data.profilePic,
      token: data.token, 
    };
    
    localStorage.setItem("authUser", JSON.stringify(authUserData));
    if (data.profilePic) {
      localStorage.setItem("profilePic", data.profilePic);
    }
    
    setShowForm(false);
    toast.success("Profile saved successfully!");
  } catch (err) {
    console.error("Profile save error:", err);
    toast.error(err.message || "Error saving profile");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans">
      {/* Fixed Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <Navbar />
      </header>

      {/* Sidebar */}
      <Sidebar active="Dashboard" />

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 ml-56 mt-25 flex items-center justify-center">
        {" "}
        <div className="max-w-6xl mx-auto space-y-8 relative">
          {/* Dashboard Card */}
          <div className="bg-[#1e1e1e]/50 p-8 rounded-3xl shadow-2xl backdrop-blur-lg border border-[#2a3a3a]/30 space-y-6 transition-all hover:border-[#3a3a3a]/50">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent pb-2">
              Welcome to Your Dashboard
            </h1>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Wallet Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400/80 uppercase tracking-wider">
                  Wallet Address
                </label>
                <div
                  className="relative bg-[#111]/40 p-4 rounded-xl border border-[#333]/30 backdrop-blur-sm hover:bg-[#111]/50 transition-all cursor-pointer group"
                  onClick={() => {
                    if (!walletAddress) {
                      toast.error("No wallet address to copy");
                      return;
                    }
                    copyToClipboard(walletAddress);
                  }}
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-4 h-4 text-cyan-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-white font-mono text-sm break-all pr-5">
                    {walletAddress || (
                      <span className="text-gray-400 italic">
                        Not connected
                      </span>
                    )}
                  </p>
                  <span className="absolute bottom-1 right-3 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to copy
                  </span>
                </div>
              </div>

              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400/80 uppercase tracking-wider">
                  Username
                </label>
                <div className="bg-[#111]/40 p-4 rounded-xl border border-[#333]/30 backdrop-blur-sm hover:bg-[#111]/50 transition-all">
                  <p className="text-white font-medium">
                    {username || (
                      <span className="text-gray-400 italic">Not set</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Gender Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400/80 uppercase tracking-wider">
                  Gender
                </label>
                <div className="bg-[#111]/40 p-4 rounded-xl border border-[#333]/30 backdrop-blur-sm hover:bg-[#111]/50 transition-all">
                  <p className="text-white font-medium capitalize">
                    {gender || (
                      <span className="text-gray-400 italic">
                        Not specified
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Section */}
          <div className="bg-[#1e1e1e]/50 p-6 rounded-3xl shadow-2xl backdrop-blur-lg border border-[#2a3a3a]/30 transition-all hover:border-[#3a3a3a]/50">
            <FileUploadGraph />
          </div>
        </div>
      </main>

      {/* Background Elements */}
      <FloatingBackground />

      {/* Profile Setup Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm">
          <form
            onSubmit={handleUserSubmit}
            className="bg-[#1a1a1a] text-white p-8 rounded-xl border border-gray-700/50 w-full max-w-md shadow-2xl space-y-6 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-bold text-cyan-400">
              Complete Your Profile
            </h2>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Username
              </label>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800/70 border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">Gender</label>
              <div className="flex gap-6">
                {["male", "female", "other"].map((g) => (
                  <label
                    key={g}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={tempGender === g}
                      onChange={() => setTempGender(g)}
                      required
                      className={`h-4 w-4 border-2 border-gray-600 rounded-full appearance-none checked:border-transparent checked:bg-${
                        g === "male"
                          ? "cyan-500"
                          : g === "female"
                          ? "pink-500"
                          : "purple-500"
                      } transition-colors`}
                    />
                    <span className="capitalize">{g}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                disabled
                className="w-full px-4 py-3 rounded-lg bg-gray-800/30 text-gray-400 border border-gray-700 cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
