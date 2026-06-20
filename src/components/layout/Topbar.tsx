import { Menu } from "lucide-react";
import TopbarBreadcrumbs from "./topbar/TopbarBreadcrumbs";
import TopbarShiftIndicator from "./topbar/TopbarShiftIndicator";
import TopbarProfileMenu from "./topbar/TopbarProfileMenu";
import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { selectBranchId, selectActiveBranchId, selectIsMaster, setActiveBranchId } from "../../features/auth/store/authSlice";
import { branchApi } from "../../features/inventory/branches/services/branchApi";

interface TopbarProps {
  toggleSidebar: () => void;
}

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  const username = localStorage.getItem("userName") ?? "Admin";
  const dispatch = useAppDispatch();
  const userBranchId = useAppSelector(selectBranchId);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const isMaster = useAppSelector(selectIsMaster);
  
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  // Only Admin (branchId === 1 or isMaster) can switch branches
  const canSwitchBranch = isMaster || userBranchId === 1;

  useEffect(() => {
    branchApi.fetchBranchNames(true)
      .then(data => {
        setBranches(data.map(b => ({ id: b.id, name: b.branchName })));
      })
      .catch(console.error);
  }, []);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setActiveBranchId(Number(e.target.value)));
    // Wait a brief moment for Redux & localStorage to sync, then reload
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  return (
    <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:px-6" style={{ height: "50px" }}>

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

      {/* RIGHT — branch selector + profile dropdown */}
      <div className="flex items-center gap-3">
        {/* Branch Selector */}
        <select
          className={`h-8 md:h-9 text-sm rounded-md border border-gray-300 bg-white px-2 py-1 outline-none ${!canSwitchBranch ? 'cursor-not-allowed bg-gray-50 text-gray-500' : 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
          value={activeBranchId || ""}
          onChange={handleBranchChange}
          disabled={!canSwitchBranch}
          title={!canSwitchBranch ? "You can only view your own branch" : "Switch active branch"}
        >
          <option value="" disabled>Select Branch</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <TopbarProfileMenu username={username} />
      </div>
    </div>
  );
};

export default Topbar;