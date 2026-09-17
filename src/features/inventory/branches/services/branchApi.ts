import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { BranchPayload, BranchRecord, LineItem } from "../types";
import { 
  buildRequestBody, 
  mapResponseToBranch 
} from "./branch-mappers";

interface BranchListItem {
  branchId?: number;
  branchName?: string;
  isActive?: boolean;
}

// ─── Exported API functions ───────────────────────────────────────────────────

export const fetchBranchNames = async (allStatus: boolean = false): Promise<BranchRecord[]> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchListItem[]>>(`/Branch/${allStatus}/list-name`);

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load branches");
  }

  return Array.isArray(data.data)
    ? data.data.map((item) => ({
        id: item.branchId ?? 0,
        branchName: item.branchName ?? "",
        isActive: item.isActive === true || String(item.isActive).toLowerCase() === "active",
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const fetchBranches = async (): Promise<BranchRecord[]> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchListItem[]>>("/Branch/list");

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load branch list");
  }

  return Array.isArray(data.data)
    ? data.data.map((item) => ({
        id: item.branchId ?? 0,
        sNo: (item as any).sNo,
        branchName: item.branchName ?? "",
        isActive: item.isActive === true || String(item.isActive).toLowerCase() === "active",
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const createBranch = async (payload: BranchPayload): Promise<BranchRecord> => {
  try {
    const body = buildRequestBody(payload);
    console.log("[createBranch] Sending payload to POST /Branch:", body);
    const { data } = await axiosInstance.post<any>("/Branch", body);

    if (data && data.isSuccess === false) {
      throw new Error(data.message || "Failed to create branch");
    }

    const id = data?.data?.branchId ?? data?.data?.id ?? (typeof data?.data === "number" ? data.data : undefined) ?? 0;

    return {
      id,
      branchName: payload.branchName,
      isActive: payload.isActive,
      lines: payload.lines.map((l) => ({ ...l })),
      detailsLoaded: true,
    };
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || "Failed to create branch";
    throw new Error(message);
  }
};

export const updateBranch = async (
  branchId: number,
  payload: BranchPayload
): Promise<BranchRecord> => {
  try {
    const body = buildRequestBody(payload, branchId);
    console.log(`[updateBranch] Sending payload to PUT /Branch/${branchId}:`, body);
    const { data } = await axiosInstance.put<any>(`/Branch/${branchId}`, body);

    if (data && data.isSuccess === false) {
      throw new Error(data.message || "Failed to update branch");
    }

    return {
      id: branchId,
      branchName: payload.branchName,
      isActive: payload.isActive,
      lines: payload.lines.map((l) => ({ ...l })),
      detailsLoaded: true,
    };
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || "Failed to update branch";
    throw new Error(message);
  }
};

export const deleteBranch = async (branchId: number): Promise<void> => {
  try {
    const { data } = await axiosInstance.delete<any>(`/Branch/${branchId}`);

    if (data && data.isSuccess === false) {
      throw new Error(data.message || "Failed to delete branch");
    }
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || "Failed to delete branch";
    throw new Error(message);
  }
};

export const resolveCurrentBranchId = (): number => {
  const isBackofficeMode =
    sessionStorage.getItem("tempSystemType") === "backoffice" ||
    localStorage.getItem("systemType") === "backoffice";

  if (isBackofficeMode) {
    const boId =
      Number(sessionStorage.getItem("backoffice_activeBranchId")) ||
      Number(sessionStorage.getItem("backoffice_branchId"));
    if (boId && boId > 0) return boId;
  }

  const id =
    Number(localStorage.getItem("systemBranchId")) ||
    Number(localStorage.getItem("activeBranchId")) ||
    Number(localStorage.getItem("branchId")) ||
    Number(sessionStorage.getItem("backoffice_activeBranchId")) ||
    Number(sessionStorage.getItem("backoffice_branchId")) ||
    0;

  return id;
};

export const fetchBranchById = async (branchId: number): Promise<BranchRecord> => {
  try {
    const [branchDataRes, printDesignRes] = await Promise.all([
      axiosInstance.get<any>(`/Branch/${branchId}/branchid-data`).catch(() => null),
      axiosInstance.get<any>(`/Branch/branches/${branchId}/print-design-data`).catch(() => null),
    ]);

    const b = branchDataRes?.data?.data ?? branchDataRes?.data ?? {};
    const printDesigns = printDesignRes?.data?.data ?? printDesignRes?.data;

    if (Array.isArray(printDesigns) && printDesigns.length > 0) {
      b.printDesigns = printDesigns;
    }

    return mapResponseToBranch(branchId, b);
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || "Failed to load branch details";
    throw new Error(message);
  }
};

export const fetchBranchPrintData = async (branchId?: number): Promise<LineItem[]> => {
  const targetBranchId = branchId || resolveCurrentBranchId();

  let rawList: any[] = [];

  // 1. Fetch from the specific branch print design endpoint: /Branch/branches/{branchId}/print-design-data
  if (targetBranchId && targetBranchId > 0) {
    try {
      const { data } = await axiosInstance.get<any>(`/Branch/branches/${targetBranchId}/print-design-data`);
      if (Array.isArray(data?.data)) {
        rawList = data.data;
      } else if (Array.isArray(data)) {
        rawList = data;
      }
    } catch (err) {
      console.warn(`[fetchBranchPrintData] Could not load /Branch/branches/${targetBranchId}/print-design-data:`, err);
    }
  }

  // 2. Fallback to /Branch/print-data if the branch-specific endpoint was not used or failed
  if (rawList.length === 0) {
    try {
      const { data } = await axiosInstance.get<any>("/Branch/print-data");
      rawList = Array.isArray(data?.data?.printDesigns)
        ? data.data.printDesigns
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.printDesigns)
        ? data.printDesigns
        : Array.isArray(data)
        ? data
        : [];
    } catch (err) {
      console.warn("[fetchBranchPrintData] Fallback /Branch/print-data failed:", err);
    }
  }

  return rawList.map((item) => {
    const code = String(item.code || item.id || "").trim();
    const section = (item.section || (code.startsWith("H") ? "header" : code.startsWith("F") ? "footer" : "dayEndHeader")) as "header" | "footer" | "dayEndHeader";
    return {
      id: code || `${section}-${Math.random()}`,
      code: code || undefined,
      value: String(item.value ?? item.lineValue ?? ""),
      fontFamily: item.fontFamily || "Courier",
      fontStyle: item.fontStyle || "Regular",
      fontSize: item.fontSize || "Medium",
      offsetX: typeof item.offsetX === "number" ? Math.max(0, Math.min(100, item.offsetX)) : 0,
      section,
    };
  });
};

export const branchApi = {
  fetchBranchNames,
  fetchBranchById,
  fetchBranchPrintData,
  resolveCurrentBranchId,
  createBranch,
  updateBranch,
  deleteBranch,
} as const;