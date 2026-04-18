import { authenticatedFetch } from "../../../../lib/authenticatedFetch";
import type { BranchPayload, BranchRecord, LineItem } from "../types";



// ─── Internal API shapes (not exported — only used inside this file) ──────────

interface ApiResponse<T> {
  data?: T;
  message?: string;
}

interface BranchIdResponse {
  id?: number;
}

interface BranchListItem {
  branchId?: number;
  branchName?: string;
  isActive?: boolean;
}

interface BranchRequestBody {
  branchId?: number;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  header1: string; headerLeftAlign1: number; headerFont1: string;
  header2: string; headerLeftAlign2: number; headerFont2: string;
  header3: string; headerLeftAlign3: number; headerFont3: string;
  header4: string; headerLeftAlign4: number; headerFont4: string;
  header5: string; headerLeftAlign5: number; headerFont5: string;
  header6: string; headerLeftAlign6: number; headerFont6: string;
  header7: string; headerLeftAlign7: number; headerFont7: string;
  footer1: string; footerLeftAlign1: number; footerFont1: string;
  footer2: string; footerLeftAlign2: number; footerFont2: string;
  footer3: string; footerLeftAlign3: number; footerFont3: string;
  footer4: string; footerLeftAlign4: number; footerFont4: string;
  footer5: string; footerLeftAlign5: number; footerFont5: string;
  footer6: string; footerLeftAlign6: number; footerFont6: string;
  footer7: string; footerLeftAlign7: number; footerFont7: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const json = (await response.json()) as ApiResponse<unknown>;
    if (json.message) return json.message;
  } catch { /* fall through */ }
  return (await response.text().catch(() => "")) || fallback;
};

const cloneLines = (lines: LineItem[]): LineItem[] =>
  lines.map((line) => ({ ...line }));

const serializeFont = (line?: LineItem): string =>
  JSON.stringify({
    fontFamily: line?.fontFamily ?? "Inter",
    fontStyle: line?.fontStyle ?? "Regular",
    fontSize: line?.fontSize ?? "12",
  });

const buildRequestBody = (payload: BranchPayload, branchId?: number): BranchRequestBody => {
  const h = payload.lines.filter((l) => l.section === "header");
  const f = payload.lines.filter((l) => l.section === "footer");

  return {
    ...(branchId !== undefined ? { branchId } : {}),
    name: payload.branchName,
    isActive: payload.isActive,
    ...(branchId !== undefined
      ? { updatedAt: new Date().toISOString() }
      : { createdAt: new Date().toISOString() }),
    header1: h[0]?.value ?? "", headerLeftAlign1: Math.round(h[0]?.offsetX ?? 0), headerFont1: serializeFont(h[0]),
    header2: h[1]?.value ?? "", headerLeftAlign2: Math.round(h[1]?.offsetX ?? 0), headerFont2: serializeFont(h[1]),
    header3: h[2]?.value ?? "", headerLeftAlign3: Math.round(h[2]?.offsetX ?? 0), headerFont3: serializeFont(h[2]),
    header4: h[3]?.value ?? "", headerLeftAlign4: Math.round(h[3]?.offsetX ?? 0), headerFont4: serializeFont(h[3]),
    header5: h[4]?.value ?? "", headerLeftAlign5: Math.round(h[4]?.offsetX ?? 0), headerFont5: serializeFont(h[4]),
    header6: h[5]?.value ?? "", headerLeftAlign6: Math.round(h[5]?.offsetX ?? 0), headerFont6: serializeFont(h[5]),
    header7: h[6]?.value ?? "", headerLeftAlign7: Math.round(h[6]?.offsetX ?? 0), headerFont7: serializeFont(h[6]),
    footer1: f[0]?.value ?? "", footerLeftAlign1: Math.round(f[0]?.offsetX ?? 0), footerFont1: serializeFont(f[0]),
    footer2: f[1]?.value ?? "", footerLeftAlign2: Math.round(f[1]?.offsetX ?? 0), footerFont2: serializeFont(f[1]),
    footer3: f[2]?.value ?? "", footerLeftAlign3: Math.round(f[2]?.offsetX ?? 0), footerFont3: serializeFont(f[2]),
    footer4: f[3]?.value ?? "", footerLeftAlign4: Math.round(f[3]?.offsetX ?? 0), footerFont4: serializeFont(f[3]),
    footer5: f[4]?.value ?? "", footerLeftAlign5: Math.round(f[4]?.offsetX ?? 0), footerFont5: serializeFont(f[4]),
    footer6: f[5]?.value ?? "", footerLeftAlign6: Math.round(f[5]?.offsetX ?? 0), footerFont6: serializeFont(f[5]),
    footer7: f[6]?.value ?? "", footerLeftAlign7: Math.round(f[6]?.offsetX ?? 0), footerFont7: serializeFont(f[6]),
  };
};

// ─── Exported API functions ───────────────────────────────────────────────────

export const fetchBranchNames = async (): Promise<BranchRecord[]> => {
  const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/Branch/list-name`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load branches"));
  }

  const json = (await response.json()) as ApiResponse<BranchListItem[]>;

  return Array.isArray(json.data)
    ? json.data.map((item) => ({
        id: item.branchId ?? 0,
        branchName: item.branchName ?? "",
        isActive: item.isActive ?? true,
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const createBranch = async (payload: BranchPayload): Promise<BranchRecord> => {
  const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/Branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload)),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create branch"));
  }

  const json = (await response.json()) as ApiResponse<BranchIdResponse>;
  const id = json.data?.id;

  if (!id) {
    throw new Error("Branch created, but no ID was returned by the server.");
  }

  return {
    id,
    branchName: payload.branchName,
    isActive: payload.isActive,
    lines: cloneLines(payload.lines),
    detailsLoaded: true,
  };
};

export const updateBranch = async (
  branchId: number,
  payload: BranchPayload
): Promise<BranchRecord> => {
  const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/Branch/${branchId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(payload, branchId)),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update branch"));
  }

  await response.json().catch(() => null);

  return {
    id: branchId,
    branchName: payload.branchName,
    isActive: payload.isActive,
    lines: cloneLines(payload.lines),
    detailsLoaded: true,
  };
};

export const deleteBranch = async (branchId: number): Promise<void> => {
  const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/Branch/${branchId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete branch"));
  }
};

export const branchApi = {
  fetchBranchNames,
  createBranch,
  updateBranch,
  deleteBranch,
} as const;