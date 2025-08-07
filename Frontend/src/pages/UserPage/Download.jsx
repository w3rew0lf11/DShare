import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../../components/Sidebar";
import FileCard from "../../components/FileCard";
import FloatingBackground from "../../components/FloatingBackground";
import Navbar from "../../components/DashNav";
import { AuthContext } from "../../context/AuthContext";

export default function DownloadPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState([]);
  const { walletInfo } = useContext(AuthContext);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const walletAddress = localStorage.getItem("walletAddress"); 

        const [publicRes, sharedRes, privateRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/public-files`),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/shared-files`),
          fetch(
            `${
              import.meta.env.VITE_API_BASE_URL
            }/api/private-files?walletAddress=${walletAddress}`
          ),
        ]);

        const publicData = await publicRes.json();
        const sharedData = await sharedRes.json();
        const privateData = await privateRes.json();

        setFiles([
          ...(Array.isArray(publicData) ? publicData : []),
          ...(Array.isArray(sharedData) ? sharedData : []),
          ...(Array.isArray(privateData) ? privateData : []),
        ]);
      } catch (err) {
        console.error("Error fetching files:", err);
      }
    };

    fetchFiles();
  }, []);

  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-sans">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/80 border-b border-gray-800 backdrop-blur-sm z-50">
        <Navbar walletAddress={walletInfo?.address || "Not connected"} />
      </header>

      <Sidebar active="Download" />

      <div className="flex flex-1 ml-64 mt-24 px-10 pb-10 overflow-y-auto">
        <main className="w-full mt-10">
          <h2 className="text-4xl font-bold mb-6 text-cyan-400">
            Download Files
          </h2>

          <div className="flex justify-center mb-10">
            <input
              type="text"
              placeholder="🔍 Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-3/4 md:w-1/2 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 placeholder-cyan-300 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-md transition duration-300"
            />
          </div>

          {filteredFiles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => (
                <FileCard key={file._id || file.id} file={file} />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-10">
              No files found 😢
            </div>
          )}
        </main>
        <FloatingBackground />
      </div>
    </div>
  );
}
