import { Menu, Plus, Download, LogOut } from "lucide-react";
import { Button, Modal } from "../common";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../context/useToast";

interface TopbarProps {
  toggleSidebar: () => void;
}

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("userId");

    showToast("Logged out successfully 👋", "success");

    navigate("/", { replace: true });
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4 md:px-6">

        {/* LEFT */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu size={20} />
          </button>

          <h2 className="hidden text-sm font-semibold text-gray-800 sm:block md:text-base">
            Dashboard
          </h2>
        </div>

        {/* RIGHT */}
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">

          <Button size="sm" className="min-w-[44px] gap-1 sm:gap-2">
            <Plus size={14} />
            <span className="hidden sm:inline">Add</span>
          </Button>

          <Button variant="secondary" size="sm" className="min-w-[44px] gap-1 sm:gap-2">
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* 🔥 Logout */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowLogoutModal(true)}
            className="min-w-[44px] gap-1 sm:gap-2"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </Button>

        </div>
      </div>

      {/* 🔥 LOGOUT CONFIRM MODAL */}
      {showLogoutModal && (
        <Modal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          title="Confirm Logout"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleLogout}>
                Logout
              </Button>
            </>
          }
        >
          Are you sure you want to logout?
        </Modal>
      )}
    </>
  );
};

export default Topbar;
