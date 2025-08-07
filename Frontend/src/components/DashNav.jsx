import React, { useContext } from "react";
import { FiLogOut, FiBell, FiSettings } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { walletAddress, logout, authUser } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSettingsClick = () => {
    // Get authUser from localStorage first, then fallback to context
    const storedUser = JSON.parse(localStorage.getItem("authUser")) || authUser;

    if (!storedUser) {
      console.warn("No user data available - redirecting to default settings");
      navigate("/settings");
      return;
    }

    // Check if isAdmin is explicitly true in localStorage
    const isAdmin = storedUser.isAdmin === true;

    // Redirect to the correct settings route
    navigate(isAdmin ? "/admin/settings" : "/settings");
  };

  // Extract user data for display
  const userData = JSON.parse(localStorage.getItem("authUser")) || authUser;
  const username = userData?.username || "User";
  const profilePic =
    userData?.profilePic ||
    `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`;

  return (
    <header className="bg-gray-900 text-white rounded-xl shadow-md mb-3 px-6 py-4 flex items-center justify-between z-50">
      <div className="flex items-center gap-4">
        <img
          src={profilePic}
          alt="User Avatar"
          className="w-14 h-14 rounded-full"
        />
        <div>
          <h2 className="text-lg font-semibold">Welcome Back | {username}</h2>
          <p className="text-sm text-gray-400 break-all">
            Wallet ID: {walletAddress || "Not connected"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="hover:bg-white/10 p-2 rounded-full">
          <FiBell />
        </button>


        <button
          className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
          onClick={handleLogout}
        >
          <FiLogOut className="mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
}
