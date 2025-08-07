import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { FILE_TYPE_ICONS } from "../../Data/Constants";

const Files = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("All Types");
  const [chartData, setChartData] = useState([]);
  const [activityChartData, setActivityChartData] = useState([]);
  const [activityList, setActivityList] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/allfiles`
        );
        const data = await res.json();
        setFileList(data);

        // Chart data preparation remains the same
        const dayWiseFileStats = {
          Mon: { documents: 0, images: 0, docs: 0 },
          Tue: { documents: 0, images: 0, docs: 0 },
          Wed: { documents: 0, images: 0, docs: 0 },
          Thu: { documents: 0, images: 0, docs: 0 },
          Fri: { documents: 0, images: 0, docs: 0 },
          Sat: { documents: 0, images: 0, docs: 0 },
          Sun: { documents: 0, images: 0, docs: 0 },
        };

        const uploadCounts = {};
        data.forEach((file) => {
          const day = new Date(file.createdAt).toLocaleDateString("en-US", {
            weekday: "short",
          });
          if (!dayWiseFileStats[day])
            dayWiseFileStats[day] = { documents: 0, images: 0, docs: 0 };

          const type = file.type?.toLowerCase() || "";
          if (type.includes("pdf")) dayWiseFileStats[day].documents += 1;
          else if (type.includes("image")) dayWiseFileStats[day].images += 1;
          else dayWiseFileStats[day].docs += 1;

          const username = file.username || "Unknown";
          uploadCounts[username] = (uploadCounts[username] || 0) + 1;
        });

        setChartData(
          Object.entries(dayWiseFileStats).map(([day, counts]) => ({
            day,
            ...counts,
          }))
        );
        setActivityChartData(
          Object.entries(uploadCounts).map(([user, count]) => ({ user, count }))
        );

        setActivityList(
          [...data]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map((file, index) => ({
              id: index,
              user: file.username || "Unknown",
              file: file.filename || "Unnamed file",
            }))
        );
      } catch (err) {
        console.error("Error fetching files:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const filteredFiles = fileList.filter((data) => {
    const matchesSearch =
      data.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      data.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const type = data.type?.toLowerCase() || "";
    const matchesType =
      selectedType === "All Types" ||
      (selectedType === "Documents" && type.includes("pdf")) ||
      (selectedType === "Images" && type.includes("image")) ||
      (selectedType === "Videos" && type.includes("video"));
    return matchesSearch && matchesType;
  });

  const getFileTypeIcon = (type) =>
    FILE_TYPE_ICONS[type] || FILE_TYPE_ICONS.default;

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
      
      <div className="space-y-6 p-4" >
        <div className="bg-gray-800 p-4 rounded-xl shadow border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">
            Storage Analytics
          </h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-2/4 space-y-6">
              <div className="border border-gray-700 rounded-lg p-3 hover:border-blue-500 bg-gray-900/50">
                <h3 className="font-medium mb-2 text-white text-center">
                  File Types
                </h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="day"
                        stroke="#cbd5e1"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis stroke="#cbd5e1" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderColor: "#374151",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="documents"
                        name="PDFs"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="images"
                        name="Images"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="docs"
                        name="Other"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border border-gray-700 rounded-lg p-3 hover:border-blue-500 bg-gray-900/50">
                <h3 className="font-medium mb-2 text-white text-center">
                  Quick Stats
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Files:</span>
                    <span className="text-white">{fileList.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PDFs:</span>
                    <span className="text-blue-400">
                      {
                        fileList.filter((f) =>
                          f.type?.toLowerCase().includes("pdf")
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Images:</span>
                    <span className="text-green-400">
                      {
                        fileList.filter((f) =>
                          f.type?.toLowerCase().includes("image")
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Users:</span>
                    <span className="text-purple-400">
                      {new Set(fileList.map((f) => f.username)).size}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 3/4 width */}
            <div className="w-full md:w-2/4">
              <div className="border border-gray-700 rounded-lg p-3 hover:border-blue-500 bg-gray-900/50 h-full">
                <h3 className="font-medium mb-2 text-white">
                  User Upload Activity
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activityChartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="user"
                        stroke="#cbd5e1"
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        stroke="#cbd5e1"
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          borderColor: "#374151",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Uploads"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Activity */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Recent Uploads
                  </h4>
                  <div className="max-h-[120px] overflow-y-auto">
                    <ul className="space-y-1 text-sm">
                      {activityList.map((activity) => (
                        <li
                          key={activity.id}
                          className="text-gray-400 hover:bg-gray-700/50 px-2 py-1 rounded"
                        >
                          <span className="text-white">{activity.user}</span>{" "}
                          uploaded{" "}
                          <span className="text-blue-400">{activity.file}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILE MANAGEMENT TABLE - SCROLLABLE */}
        <div className="bg-gray-800 p-4 rounded-xl shadow border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">
            File Management
          </h2>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <select
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 hover:border-blue-500 text-white"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option>All Types</option>
              <option>Documents</option>
              <option>Images</option>
              <option>Videos</option>
            </select>
          </div>

          {/* Scrollable table container */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredFiles.map((data) => (
                  <tr key={data._id || data.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="mr-3 text-lg">
                          {getFileTypeIcon(data.type)}
                        </span>
                        <div>
                          <div className="font-medium text-white hover:text-blue-400">
                            {data.filename}
                          </div>
                          <div className="text-sm text-gray-400">
                            {data.size} • {data.date} • {data.sharedBy}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-4">
                        <div>
                          <div className="text-sm font-medium text-gray-300">
                            Downloads
                          </div>
                          <div className="text-blue-400">
                            {data.downloads || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-300">
                            Views
                          </div>
                          <div className="text-green-400">
                            {data.views || 0}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-400 hover:text-blue-300 px-3 py-1 rounded hover:bg-blue-900/30">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Files;
