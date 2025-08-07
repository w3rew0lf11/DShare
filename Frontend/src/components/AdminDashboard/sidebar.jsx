import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, File, Users, BarChart3, Settings } from "lucide-react";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Files", path: "/admin/files", icon: <File size={18} /> },
    { name: "Users", path: "/admin/users", icon: <Users size={18} /> },
    { name: "Performance", path: "/admin/performance", icon: <BarChart3 size={18} /> },
    { name: "Settings", path: "/admin/settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="fixed top-20 w-56 bg-gray-900 border-r border-gray-700 p-6 flex flex-col space-y-6 min-h-screen">
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? "bg-white text-black font-semibold"
                  : "text-white hover:bg-gray-700"
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
