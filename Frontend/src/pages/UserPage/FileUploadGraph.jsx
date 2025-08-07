import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

const PrivacyBarChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchPrivacyData = async () => {
      try {
        const walletAddress = localStorage.getItem("walletAddress");
        const res = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/files?walletAddress=${walletAddress}`
        );
        const files = await res.json();

        // Count files by privacy
        const count = { shared: 0, public: 0, private: 0 };
        files.forEach((file) => {
          const type = file.privacy || "private";
          count[type] = (count[type] || 0) + 1;
        });

        const chartData = Object.entries(count).map(([privacy, total]) => ({
          privacy,
          total,
        }));

        setData(chartData);
      } catch (err) {
        console.error("Failed to fetch or process file data:", err);
      }
    };

    fetchPrivacyData();
  }, []);

  return (
    <div className="bg-[#1e1e1e]/80 p-4 rounded-xl border border-[#333] shadow-lg">
      <h2 className="text-lg font-semibold text-emerald-400 mb-3">
        Files by Privacy Type
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="privacy" stroke="#aaa" />
          <YAxis stroke="#aaa" allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" name="File Count" barSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.privacy === "public"
                    ? "#10b981" // green
                    : entry.privacy === "private"
                    ? "#3b82f6" // blue
                    : "#f59e0b" // amber (shared)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PrivacyBarChart;