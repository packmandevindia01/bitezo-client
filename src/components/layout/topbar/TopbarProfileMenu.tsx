import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopbarLogoutModal from "./TopbarLogoutModal";

interface TopbarProfileMenuProps {
  username: string;
}

const TopbarProfileMenu = ({ username }: TopbarProfileMenuProps) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-3 transition hover:bg-gray-100"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#49293e]">
          <span className="text-[10px] font-bold text-white">{initials}</span>
        </div>
        <span className="hidden text-sm font-medium text-gray-700 sm:block">{username}</span>
        <ChevronDown size={13} className="hidden text-gray-400 sm:block" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#49293e]">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-gray-800">{username}</span>
              <span className="text-xs text-gray-400">Administrator</span>
            </div>
          </div>

          <button
            onClick={() => {
              setShowDropdown(false);
              navigate("/dashboard/settings");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            <User size={15} className="text-gray-400" />
            Profile
          </button>

          <button
            onClick={() => {
              setShowDropdown(false);
              setShowLogoutModal(true);
            }}
            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}

      <TopbarLogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        username={username}
      />
    </div>
  );
};

export default TopbarProfileMenu;
