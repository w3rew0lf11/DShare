import { Outlet } from "react-router-dom";
import DashNav from "../../components/DashNav.jsx";
import Sidebar from "../../components/AdminDashboard/sidebar.jsx";
import Header from "../../components/AdminDashboard/Header.jsx";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";

const AdminLayout = () => {
  const { walletAddress } = useContext(AuthContext);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!walletAddress) return;

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/users/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ walletAddress }),
          }
        );

        const data = await res.json();
        if (res.ok && data?.username) {
          localStorage.setItem(
            "authUser",
            JSON.stringify({
              _id: data._id,
              username: data.username,
              gender: data.gender,
              walletAddress: data.walletAddress,
              profilePic: data.profilePic,
            })
          );
          localStorage.setItem("profilePic", data.profilePic);
        }
      } catch (error) {
        console.error("Admin check error:", error);
      }
    };

    checkAdmin();
  }, [walletAddress]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white font-sans">
      <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900/90 border-b border-gray-800/50 backdrop-blur-md z-50">
        <DashNav />
      </header>
        <Sidebar />

      {/* Main content area with background */}
      <main
        className="flex-1 ml-56 mt-20 p-0 relative overflow-hidden"
        style={{
          backgroundImage:
            "url('https://i.gifer.com/origin/46/462c6f5f67c13830cd9fcdbfc7b55ded.gif')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
          
        }}
      >

        <div className="relative z-10 p-8" >
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
