import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import Navbar from "../../components/DashNav";
import Sidebar from "../../components/Sidebar";
import FloatingBackground from "../../components/FloatingBackground";
import toast from "react-hot-toast";

export default function UserSettings() {
  const { walletAddress } = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("authUser"));
    if (user) {
      setUsername(user.username || "");
      setGender(user.gender || "");
    }
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setIsLoading(true);

    const storedUser = JSON.parse(localStorage.getItem("authUser"));
    const originalUsername = storedUser?.username || "";
    const originalGender = storedUser?.gender || "";

    if (username === originalUsername && gender === originalGender) {
      toast.success("No changes to update.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/update`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ walletAddress, username, gender }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem(
          "authUser",
          JSON.stringify({
            ...storedUser,
            username: data.username,
            gender: data.gender,
          })
        );
        setSuccess(true);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const copyToClipboard = () => {
    if (!walletAddress) return;

    navigator.clipboard
      .writeText(walletAddress)
      .then(() => {
        setCopied(true);
        toast.success("Wallet address copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast.error("Failed to copy address");
      });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white relative overflow-hidden">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <Navbar />
        <Sidebar active="Settings" />
      </header>
      <FloatingBackground />
      <div className="flex flex-1 pt-16 ml-56">
        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Account Settings
              </h1>
              <p className="mt-2 text-gray-400">
                Manage your profile information and preferences
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1 bg-[#1a1a1a]/90 rounded-2xl shadow-lg border border-[#2a2a2a] p-6 h-fit">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                    <img
                      src={
                        JSON.parse(localStorage.getItem("authUser"))
                          ?.profilePic ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${
                          JSON.parse(localStorage.getItem("authUser"))
                            ?.username ||
                          walletAddress ||
                          "user"
                        }`
                      }
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${
                          JSON.parse(localStorage.getItem("authUser"))
                            ?.username ||
                          walletAddress ||
                          "user"
                        }`;
                      }}
                    />
                  </div>

                  <h3 className="text-xl font-semibold">
                    {username || "Username"}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {gender
                      ? gender.charAt(0).toUpperCase() + gender.slice(1)
                      : "No gender set"}
                  </p>
                  <div className="mt-4 w-full">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium px-4 py-2 rounded-lg transition-all border border-red-600/50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings Form */}
              <div className="lg:col-span-2 bg-[#1a1a1a]/90 rounded-2xl shadow-lg border border-[#2a2a2a] p-6">
                <h3 className="text-xl font-semibold mb-6">
                  Profile Information
                </h3>

                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#111]/70 text-white placeholder-gray-500 px-4 py-3 rounded-lg border border-[#444] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Gender
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {["male", "female", "other"].map((g) => (
                          <label
                            key={g}
                            className="flex items-center gap-2 capitalize cursor-pointer px-3 py-2 rounded-lg hover:bg-[#222] transition-all"
                          >
                            <input
                              type="radio"
                              name="gender"
                              value={g}
                              checked={gender === g}
                              onChange={(e) => setGender(e.target.value)}
                              className="h-4 w-4 accent-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-300">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Wallet Address
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={walletAddress}
                          disabled
                          className="w-full bg-[#222]/50 text-gray-300 px-4 py-3 rounded-lg border border-[#444] cursor-not-allowed truncate"
                        />
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-cyan-400 transition-all"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-green-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full flex justify-center items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md ${
                        isLoading ? "opacity-80 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
