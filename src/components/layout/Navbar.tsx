import { Menu, Plus, Bell, Settings } from "lucide-react";
import { Button } from "../common";

interface NavbarProps {
  toggleSidebar?: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  return (
    <header className="w-full flex items-center justify-between border-b bg-white px-3 sm:px-4 md:px-6 py-3 shadow-sm">

      {/* LEFT */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Mobile Menu */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={20} />
        </button>

        {/* Title */}
        <h1 className="font-semibold text-sm sm:text-base md:text-lg text-gray-800">
          Dashboard
        </h1>

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-5">

        {/* Notification */}
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button className="p-2 rounded-full hover:bg-gray-100 transition">
          <Settings size={18} />
        </button>

        {/* Divider (desktop only) */}
        <div className="hidden md:block w-px h-6 bg-gray-300"></div>

        {/* Add Button */}
        <Button
          size="sm"
          className="flex items-center gap-1 sm:gap-2"
        >
          <Plus size={14} />

          {/* Hide text on very small screens */}
          <span className="hidden sm:inline">
            Add
          </span>
        </Button>

      </div>
    </header>
  );
};

export default Navbar;