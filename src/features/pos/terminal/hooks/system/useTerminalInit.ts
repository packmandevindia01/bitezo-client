import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../../../app/hooks";
import { setOrderType, setOrderTypeByName } from "../../store/posSlice";
import { posConfigApi, POS_CONFIGS_STORAGE_KEY, type RuntimePosConfig } from "../../../services/posConfigApi";
import { branchApi } from "../../../../inventory/branches/services/branchApi";
import type { PosOrderType } from "../../../types";

interface UseTerminalInitProps {
  status: any;
  isLoading: boolean;
  orderTypes: PosOrderType[];
  cartItemCount: number;
  editingOrderId: number | null;
  selectedTableId: number | null;
  setIsMoreModalOpen: (val: boolean) => void;
  setIsCashModalOpen: (val: boolean) => void;
}

export const readStoredPosConfig = (): RuntimePosConfig | null => {
  const savedConfig = localStorage.getItem(POS_CONFIGS_STORAGE_KEY);
  if (!savedConfig) return null;
  try {
    const parsed = JSON.parse(savedConfig) as { configs?: RuntimePosConfig };
    return parsed.configs ?? null;
  } catch {
    localStorage.removeItem(POS_CONFIGS_STORAGE_KEY);
    return null;
  }
};

export const applyDefaultEmployeeOverride = (config: RuntimePosConfig | null): RuntimePosConfig | null => {
  if (!config) return config;
  try {
    const raw = localStorage.getItem("posDefaultEmployeeOverride");
    if (raw) {
      const override = JSON.parse(raw);
      if (override?.defaultEmployee === "Enable" && Number(override?.employeeId) > 0) {
        return {
          ...config,
          defaultEmployee: "Enable",
          employeeId: Number(override.employeeId),
        };
      }
    }
  } catch {
    // ignore malformed override
  }
  return config;
};

export const getRuntimePosConfig = async (): Promise<RuntimePosConfig | null> => {
  const branchId =
    Number(localStorage.getItem("systemBranchId")) ||
    Number(localStorage.getItem("activeBranchId")) ||
    Number(localStorage.getItem("branchId")) ||
    0;
  if (branchId) {
    try {
      const response = await posConfigApi.getPosConfig(branchId);
      if (response.isSuccess && response.data) {
        localStorage.setItem(POS_CONFIGS_STORAGE_KEY, JSON.stringify(response.data));
        return applyDefaultEmployeeOverride(response.data.configs);
      }
    } catch (e) {
      console.warn("Failed to fetch fresh POS configuration:", e);
    }
  }
  return applyDefaultEmployeeOverride(readStoredPosConfig());
};

export const useTerminalInit = ({
  status,
  isLoading,
  orderTypes,
  cartItemCount,
  editingOrderId,
  selectedTableId,
  setIsMoreModalOpen,
  setIsCashModalOpen,
}: UseTerminalInitProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const initialAutoDineInChecked = useRef(false);

  // Handle route state triggers (e.g. from bottom bar navigation)
  useEffect(() => {
    const state = location.state as { openMoreModal?: boolean; openCashModal?: boolean };
    if (state?.openMoreModal) {
      setIsMoreModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.openCashModal) {
      setIsCashModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, setIsMoreModalOpen, setIsCashModalOpen, navigate, location.pathname]);

  // Load and cache branch print layout lines on POS terminal mount
  useEffect(() => {
    branchApi
      .fetchBranchPrintData()
      .then((lines) => {
        if (lines && lines.length > 0) {
          localStorage.setItem("branchPrintData", JSON.stringify(lines));
        }
      })
      .catch((err) => {
        console.warn("Failed to load branch print data:", err);
      });
  }, []);

  const applyDefaultOrderType = async (shouldApplyDefault: boolean = false) => {
    try {
      if (!shouldApplyDefault) return;

      const config = await getRuntimePosConfig();
      const defaultId = Number(config?.defaultOrderTypeId) || 1;

      const match = orderTypes.find((t) => t.orderTypeId === defaultId);
      if (match) {
        dispatch(setOrderType(match));
      } else {
        const fallbackName =
          defaultId === 2
            ? "TakeOut"
            : defaultId === 3
            ? "DriveThru"
            : defaultId === 4
            ? "Delivery"
            : defaultId === 6
            ? "Coming"
            : "DineIn";
        dispatch(setOrderTypeByName(fallbackName));
      }

      const isDineIn = defaultId === 1 || (match?.orderType && match.orderType.toLowerCase().includes("dine"));
      const isShiftOpen = status && !status.isDayClosed && !status.isShiftClosed;
      if (isDineIn && isShiftOpen && !editingOrderId && !selectedTableId) {
        navigate("/pos/dine-in", { state: { skipAutoDineIn: true } });
      }
    } catch (e) {
      console.error("Error applying default order type:", e);
    }
  };

  // Initial Auto Dine-In Check
  useEffect(() => {
    if (initialAutoDineInChecked.current) return;
    if (isLoading || !status) return;

    initialAutoDineInChecked.current = true;

    const skip = (location.state as any)?.skipAutoDineIn || false;
    const hasActiveCart = cartItemCount > 0;
    const hasActiveOrder = !!editingOrderId || !!selectedTableId;

    void applyDefaultOrderType(!skip && !hasActiveCart && !hasActiveOrder);
  }, [orderTypes, status, isLoading]);

  return {
    getRuntimePosConfig,
    applyDefaultOrderType,
  };
};
