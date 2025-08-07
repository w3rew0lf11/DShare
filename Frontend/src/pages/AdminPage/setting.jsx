import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DoubleBarGraph from "../../components/AdminDashboard/malScanRep";

const DEFAULTS = {
  systemName: "D-Share",
  storageLimit: "50 GB",
  fileRetention: "90 days",
};

const Settings = () => {
  const navigate = useNavigate();

  const [systemName, setSystemName] = useState(
    () => localStorage.getItem("systemName") || DEFAULTS.systemName
  );
  const [storageLimit, setStorageLimit] = useState(
    () => localStorage.getItem("storageLimit") || DEFAULTS.storageLimit
  );
  const [fileRetention, setFileRetention] = useState(
    () => localStorage.getItem("fileRetention") || DEFAULTS.fileRetention
  );

  useEffect(() => localStorage.setItem("systemName", systemName), [systemName]);
  useEffect(
    () => localStorage.setItem("storageLimit", storageLimit),
    [storageLimit]
  );
  useEffect(
    () => localStorage.setItem("fileRetention", fileRetention),
    [fileRetention]
  );

  const handleClearCaches = () => {
    localStorage.clear();
    toast.success("All caches cleared. Logging out...");
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <div>
      {/* Background Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.68)",
          zIndex: -100,
        }}
      />
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow border border-gray-700">
          <DoubleBarGraph />
        </div>
      </div>
      <div className="my-10" />
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">
            System Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3 border-b border-gray-700 pb-2 text-white">
                General
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center hover:bg-gray-700 p-2 rounded">
                  <label className="text-sm text-gray-400">System Name</label>
                  <input
                    type="text"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                    className="border border-gray-600 rounded px-3 py-1 text-sm bg-gray-700 text-white hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center hover:bg-gray-700 p-2 rounded">
                  <label className="text-sm text-gray-400">
                    Default Storage Limit
                  </label>
                  <select
                    value={storageLimit}
                    onChange={(e) => setStorageLimit(e.target.value)}
                    className="border border-gray-600 rounded px-3 py-1 text-sm bg-gray-700 text-white hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option>10 GB</option>
                    <option>25 GB</option>
                    <option>50 GB</option>
                    <option>100 GB</option>
                  </select>
                </div>

                <div className="flex justify-between items-center hover:bg-gray-700 p-2 rounded">
                  <label className="text-sm text-gray-400">
                    File Retention Policy
                  </label>
                  <select
                    value={fileRetention}
                    onChange={(e) => setFileRetention(e.target.value)}
                    className="border border-gray-600 rounded px-3 py-1 text-sm bg-gray-700 text-white hover:border-blue-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>Indefinite</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-700 pt-4 flex justify-end">
            <button
              onClick={handleClearCaches}
              className="text-red-400 border border-red-500 hover:bg-red-500 hover:bg-opacity-10 px-4 py-2 rounded text-sm"
            >
              Clear All Caches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
