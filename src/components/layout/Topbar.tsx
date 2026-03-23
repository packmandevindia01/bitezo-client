import { Menu, Plus, Download } from "lucide-react";
import { Button } from "../common";

interface TopbarProps {
  toggleSidebar: () => void;
}

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  return (
    <div className="w-full flex justify-between items-center bg-white px-4 md:px-6 h-18 md:h-20 border-b border-gray-200 shadow-sm">

      {/* LEFT */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* Mobile menu */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={20} />
        </button>

        {/* Title (optional) */}
        <h2 className="hidden sm:block font-semibold text-sm md:text-base text-gray-800">
          Dashboard
        </h2>

      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">

        {/* Add Button */}
        <Button size="sm" className="flex items-center gap-1 sm:gap-2">
          <Plus size={14} />
          <span className="hidden sm:inline">Add</span>
        </Button>

        {/* Export Button */}
        <Button variant="secondary" size="sm" className="flex items-center gap-1 sm:gap-2">
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </Button>

      </div>
    </div>
  );
};

export default Topbar;