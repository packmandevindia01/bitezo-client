import { getTerminalBranchId } from "@shared/config/device";
import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Loader } from "../../../../components/common";
import { SkipPermissionsContext } from "../../../../hooks/usePermissions";
import { useEnterToNextField } from "../../../../hooks/useEnterToNextField";
import { PosAllocationScopeContext } from "../../../inventory/shared/posAllocationScope";
import { menuApi } from "../../services/menuApi";
import { usePosMasterData } from "../../terminal/hooks/usePosQueries";
import { t } from "../../utils/posLocalization";

// The Back Office screens themselves, so both places always have the same form, rules and API calls.
const TABS = [
  { id: "extras", label: "Extras", Page: lazy(() => import("../../../inventory/extrasMaster/pages/ExtrasMasterPage")) },
  { id: "extrasType", label: "Extras Type", Page: lazy(() => import("../../../inventory/extrasType/pages/ExtrasTypePage")) },
  { id: "modifier", label: "Modifier", Page: lazy(() => import("../../../inventory/modifier/pages/ModifierPage")) },
  { id: "modifierType", label: "Modifier Type", Page: lazy(() => import("../../../inventory/modifierType/pages/ModifierTypePage")) },
];

const PosMenuMastersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const ActivePage = activeTab.Page;

  const { data: masterData } = usePosMasterData();
  const allocationScope = useMemo(
    () => ({ categories: masterData?.category ?? [], branchId: getTerminalBranchId() }),
    [masterData?.category]
  );

  useEnterToNextField(true);

  // Recall, settled and print screens read extras from a cache kept for the whole session.
  useEffect(() => () => { void menuApi.refreshAllExtras(); }, []);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("Back")}
            onClick={() => navigate("/pos", { state: { openMoreModal: true, skipAutoDineIn: true } })}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black text-[#49293e] tracking-widest uppercase">{t("EXTRAS & MODIFIERS")}</h1>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab.id === tab.id ? "bg-white text-[#49293e] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* User roles are a Back Office rule. The POS asks for an employee PIN on the More tile instead. */}
        <SkipPermissionsContext.Provider value={true}>
          <PosAllocationScopeContext.Provider value={allocationScope}>
            <Suspense fallback={<Loader text="Loading..." />}>
              <ActivePage key={activeTab.id} />
            </Suspense>
          </PosAllocationScopeContext.Provider>
        </SkipPermissionsContext.Provider>
      </div>
    </div>
  );
};

export default PosMenuMastersPage;
