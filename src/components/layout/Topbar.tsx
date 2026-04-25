import { Menu } from "lucide-react";
import TopbarBreadcrumbs from "./topbar/TopbarBreadcrumbs";
import TopbarShiftIndicator from "./topbar/TopbarShiftIndicator";
import TopbarProfileMenu from "./topbar/TopbarProfileMenu";

interface TopbarProps {
  toggleSidebar: () => void;
}

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  const username = localStorage.getItem("userName") ?? "Admin";

  return (
    <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:px-6" style={{ height: "64px" }}>

      {/* LEFT — hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 transition hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>

        <TopbarBreadcrumbs />

        <TopbarShiftIndicator />
      </div>

      {/* RIGHT — profile dropdown */}
      <TopbarProfileMenu username={username} />
    </div>
  );
};

export default Topbar;