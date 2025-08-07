import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UploadIcon,
  DownloadIcon,
  MessageSquareIcon,
  SettingsIcon,
} from "lucide-react"; 

const menuItems = [ 
  { name: "Dashboard", href: "/userdashboard", icon: <HomeIcon className="w-5 h-5" /> },
  { name: "Upload", href: "/upload", icon: <UploadIcon className="w-5 h-5" /> },
  { name: "Download", href: "/download", icon: <DownloadIcon className="w-5 h-5" /> },
  { name: "Chat", href: "/chat", icon: <MessageSquareIcon className="w-5 h-5" /> },
  { name: "Settings", href: "/settings", icon: <SettingsIcon className="w-5 h-5" /> },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed top-20 w-56 bg-gray-900 border-r border-gray-700 p-6 flex flex-col space-y-6 min-h-screen z-10">
      <nav className="flex flex-col space-y-4 ">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition ${
              location.pathname === item.href 
                ? "bg-white text-black font-semibold" 
                : "text-white"
            }`}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}