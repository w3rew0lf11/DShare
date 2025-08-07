import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ethers } from "ethers";
import DShareArtifact from "../../../smart-contract/artifacts/contracts/DShare.sol/DShare.json";

const CONTRACT_ADDRESS = "0x4C60D5A5c6e6ff456C3Df77F46dd011039930672";

const LoginWithMetaMask = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const { walletAddress, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const checkAdminAccess = async (wallet) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        DShareArtifact.abi,
        provider
      );
      const owner = await contract.owner();
      return wallet.toLowerCase() === owner.toLowerCase();
    } catch (err) {
      console.error("Error checking admin access:", err);
      return false;
    }
  };

  const connectWallet = async () => {
    setError("");
    setIsConnecting(true);

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        const wallet = accounts[0];
        const isAdminUser = await checkAdminAccess(wallet);
        setIsAdmin(isAdminUser);

        // Store admin status in localStorage
        localStorage.setItem("isAdmin", isAdminUser.toString());

        // First check if user exists
        const userCheck = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/users/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ walletAddress: wallet }),
          }
        );

        const userData = await userCheck.json();

        if (userCheck.ok) {
          login(wallet, {
            _id: userData.id,
            username: userData.username,
            gender: userData.gender,
            walletAddress: wallet,
            profilePic: userData.profilePic,
            token: userData.token,
            isAdmin: isAdminUser, 
          });
        } else {
          login(wallet, { isAdmin: isAdminUser }); 
        }

        navigate(isAdminUser ? "/admin/dashboard" : "/userdashboard");
      } catch (err) {
        console.error("User rejected request:", err);
        setError("Connection rejected. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    } else {
      setError("MetaMask not detected! Please install MetaMask.");
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const autoRedirect = async () => {
      if (walletAddress) {
        const isAdminUser = await checkAdminAccess(walletAddress);
        setIsAdmin(isAdminUser);
        localStorage.setItem("isAdmin", isAdminUser.toString());
        navigate(isAdminUser ? "/admin/dashboard" : "/userdashboard");
      }
    };
    autoRedirect();
  }, [walletAddress, navigate]);
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <div style={styles.logo}>
            <img
              src="/src/assets/Metamask.png"
              alt="Metamask-logo"
              style={styles.logoImage}
            />
          </div>
          <h2 style={styles.title}>MetaMask Login</h2>
          <p style={styles.subtitle}>Connect your wallet to continue</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button
          style={walletAddress ? styles.connectedButton : styles.connectButton}
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting
            ? "Connecting..."
            : walletAddress
            ? "✔ Wallet Connected"
            : "Connect MetaMask"}
        </button>

        {walletAddress && (
          <div style={styles.walletInfo}>
            <p style={styles.walletLabel}>Connected Wallet:</p>
            <p style={styles.walletAddress}>{walletAddress}</p>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have MetaMask?{" "}
            <a
              href="https://metamask.io/download.html"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.footerLink}
            >
              Download here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    backgroundImage:
      "url(https://i.gifer.com/origin/46/462c6f5f67c13830cd9fcdbfc7b55ded.gif)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
    textAlign: "center",
    width: "100%",
    maxWidth: "480px",
    border: "1px solid rgba(226, 232, 240, 0.7)",
    backdropFilter: "blur(5px)",
  },
  logoContainer: {
    marginBottom: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    marginBottom: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100px",
    height: "100px",
  },
  logoImage: {
    width: "100%",
    height: "auto",
    objectFit: "contain",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  errorText: {
    color: "#dc2626",
    fontSize: "14px",
    margin: "0",
  },
  connectButton: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    padding: "14px 24px",
    width: "100%",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "16px",
    transition: "all 0.2s ease",
    marginBottom: "20px",
    boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)",
  },
  connectedButton: {
    backgroundColor: "#10b981",
    color: "#ffffff",
    padding: "14px 24px",
    width: "100%",
    border: "none",
    borderRadius: "12px",
    cursor: "default",
    fontWeight: "600",
    fontSize: "16px",
    transition: "all 0.2s ease",
    marginBottom: "20px",
    boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)",
  },
  walletInfo: {
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "24px",
    border: "1px solid rgba(226, 232, 240, 0.7)",
  },
  walletLabel: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 4px 0",
    fontWeight: "500",
  },
  walletAddress: {
    fontSize: "14px",
    color: "#334155",
    margin: "0",
    fontWeight: "600",
    wordBreak: "break-all",
  },
  footer: {
    marginTop: "16px",
  },
  footerText: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0",
  },
  footerLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "500",
  },
};

export default LoginWithMetaMask;
