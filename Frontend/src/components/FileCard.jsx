import { Link } from "react-router-dom";
import { FiDownload } from "react-icons/fi";

export default function FileCard({ file }) {
  const icon =
    file.privacy === "public"
      ? "🌐"
      : file.privacy === "shared"
      ? "👥"
      : "🔒";

  return (
    <Link to={`/file/${file._id}`} className="transform hover:scale-105 transition duration-300">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl shadow-lg border border-gray-700 hover:border-cyan-500 hover:shadow-cyan-500/30 transition duration-300">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-cyan-300 truncate">
            {file.filename}
          </h3>
          <FiDownload className="text-cyan-400" />
        </div>

        <p className="text-xs text-gray-400 break-all mb-1">
          {file.walletAddress}
        </p>

        <span className="inline-block text-sm text-cyan-500 bg-gray-700 px-3 py-1 rounded-full mt-2 shadow-sm">
          {file.privacy.charAt(0).toUpperCase() + file.privacy.slice(1)} {icon}
        </span>
      </div>
    </Link>
  );
}
