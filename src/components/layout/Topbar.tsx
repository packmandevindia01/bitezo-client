import { Menu } from "lucide-react";
import TopbarBreadcrumbs from "./topbar/TopbarBreadcrumbs";
import TopbarShiftIndicator from "./topbar/TopbarShiftIndicator";
import TopbarProfileMenu from "./topbar/TopbarProfileMenu";
import { useCallback, useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { selectBranchId, selectActiveBranchId, selectIsMaster, setActiveBranchId } from "../../features/auth/store/authSlice";
import { branchApi } from "../../features/inventory/branches/services/branchApi";

interface TopbarProps {
  toggleSidebar: () => void;
}

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  const dispatch = useAppDispatch();
  const stateUserName = useAppSelector((state) => state.auth.userName);
  const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const username = stateUserName || (isBackofficeMode ? sessionStorage.getItem("backoffice_userName") : localStorage.getItem("userName")) || "Admin";
  
  const userBranchId = useAppSelector(selectBranchId);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const isMaster = useAppSelector(selectIsMaster);
  
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);

  // IF BRANCH ID IS 1 THEN ALLOW THE USER TO CHANGE THE BRANCH, IF BRANCH IS NOT 1, DISABLE THE BRANCH SELECTION
  const canSwitchBranch = userBranchId === 1 || isMaster;

  const loadBranches = useCallback(() => {
    branchApi.fetchBranchNames(true)
      .then((data) => {
        const branchList = data.map((b) => ({ id: b.id, name: b.branchName }));
        setBranches(branchList);

        // Auto-set default active branch from user's login payload or first available branch if none set
        if (branchList.length > 0) {
          const storedActive = isBackofficeMode
            ? Number(sessionStorage.getItem("backoffice_activeBranchId"))
            : Number(localStorage.getItem("activeBranchId"));

          if (!activeBranchId && !storedActive) {
            const defaultId = userBranchId || branchList[0].id;
            dispatch(setActiveBranchId(defaultId));
          }
        }
      })
      .catch(console.error);
  }, [userBranchId, activeBranchId, isBackofficeMode, dispatch]);

  useEffect(() => {
    loadBranches();

    // Auto-refresh branches when window gains focus (e.g. switching back from Swagger/other tab)
    window.addEventListener("focus", loadBranches);

    // Auto-refresh when branches are added/edited/deleted in the app
    window.addEventListener("branches:updated", loadBranches);

    return () => {
      window.removeEventListener("focus", loadBranches);
      window.removeEventListener("branches:updated", loadBranches);
    };
  }, [loadBranches]);

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
          value={activeBranchId !== null ? activeBranchId : ""}
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