import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">

  {/* Sidebar */}
  <div
    className={`fixed md:static z-40 inset-y-0 left-0 transform 
    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    md:translate-x-0 transition-transform duration-300`}
  >
    <Sidebar 
  isOpen={sidebarOpen} 
  onClose={() => setSidebarOpen(false)} 
/>
  </div>

  {/* Overlay */}
  {sidebarOpen && (
    <div
      className="fixed inset-0 z-30 bg-black/30 md:hidden"
      onClick={() => setSidebarOpen(false)}
    />
  )}

  {/* RIGHT SIDE */}
  <div className="flex min-w-0 flex-1 flex-col">

    {/* ✅ FIX: REMOVE background from parent */}
    <Topbar toggleSidebar={toggleSidebar} />

    {/* ✅ Apply background ONLY here */}
    <main className="flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
      <Outlet />
    </main>

  </div>
</div>
  );
};

export default MainLayout;
