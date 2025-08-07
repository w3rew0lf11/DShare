import { useState, useEffect } from "react";
import StatsCard from "../../components/AdminDashboard/StatsCard";
import PopularityGraph from "../../components/AdminDashboard/Popularitygraph";
import RecentActivity from "../../components/AdminDashboard/RecentActivity";
import RecentFilesTable from "../../components/AdminDashboard/RecentFilesTable";
import { userActivity, recentFiles } from "../../Data/SampleData";

const Dashboard = () => {
  const [searchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalFiles, setTotalFiles] = useState(0);

  useEffect(() => {
    const fetchTotalFiles = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/total-files`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch total files");
        }
        const data = await response.json();
        setTotalFiles(data.totalFiles);
      } catch (error) {
        console.error("Error fetching total files:", error);
      }
    };

    fetchTotalFiles();
    const interval = setInterval(() => {
      fetchTotalFiles();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredFiles = recentFiles.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.sharedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          zIndex: -10,
        }}
      />

      <div className="relative p-6 text-white">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Files" value={totalFiles} />
        </div>

        {/* Graph and Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PopularityGraph darkMode={true} />

          {/* Scrollable Recent Activity */}
          <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div
              className="overflow-y-auto flex-grow"
              style={{ maxHeight: "400px" }}
            >
              <RecentActivity activities={userActivity} />
            </div>
          </div>
        </div>

        {/* Scrollable Recent Files Table */}
        <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Recent Files</h2>
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            <RecentFilesTable
              files={filteredFiles}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
