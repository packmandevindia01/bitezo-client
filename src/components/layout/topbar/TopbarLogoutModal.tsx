import { LogOut } from "lucide-react";
import { Modal, Button } from "../../common";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../app/providers/useToast";

const AUTH_KEYS = [
  "accessToken",
  "refreshToken",
  "userId",
  "userName",
  "tenantId",
  "isMaster",
  "sessionExpiresAt",
];

interface TopbarLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const TopbarLogoutModal = ({ isOpen, onClose, username }: TopbarLogoutModalProps) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = () => {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    showToast("Logged out successfully", "success");
    navigate("/", { replace: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Logout"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <LogOut size={22} className="text-red-400" />
        </div>
        <p className="text-center text-sm text-gray-600">
          Are you sure you want to logout,{" "}
          <span className="font-semibold text-gray-800">{username}</span>?
        </p>
      </div>
    </Modal>
  );
};

export default TopbarLogoutModal;
