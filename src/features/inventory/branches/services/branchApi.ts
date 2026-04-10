import type { BranchPayload, BranchRecord, LineItem } from "../types";

const API_BASE_URL = "http://84.255.173.131:8068";

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
}

interface BranchRequestBody {
  branchId?: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  header1: string;
  headerLeftAlign1: number;
  headerFont1: string;
  header2: string;
  headerLeftAlign2: number;
  headerFont2: string;
  header3: string;
  headerLeftAlign3: number;
  headerFont3: string;
  header4: string;
  headerLeftAlign4: number;
  headerFont4: string;
  header5: string;
  headerLeftAlign5: number;
  headerFont5: string;
  header6: string;
  headerLeftAlign6: number;
  headerFont6: string;
  header7: string;
  headerLeftAlign7: number;
  headerFont7: string;
  footer1: string;
  footerLeftAlign1: number;
  footerFont1: string;
  footer2: string;
  footerLeftAlign2: number;
  footerFont2: string;
  footer3: string;
  footerLeftAlign3: number;
  footerFont3: string;
  footer4: string;
  footerLeftAlign4: number;
  footerFont4: string;
  footer5: string;
  footerLeftAlign5: number;
  footerFont5: string;
  footer6: string;
  footerLeftAlign6: number;
  footerFont6: string;
  footer7: string;
  footerLeftAlign7: number;
  footerFont7: string;
}

const getAccessToken = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("Access token not found. Please log in again.");
  }

  return token;
};

const getAuthHeaders = () => ({
  accept: "*/*",
  Authorization: `Bearer ${getAccessToken()}`,
});

const getErrorMessage = async (response: Response, fallbackMessage: string) => {
  try {
    const json = (await response.json()) as ApiResponse<unknown>;
    if (json.message) return json.message;
  } catch {
    // Fall back to plain text when the API does not return JSON.
  }

  return (await response.text().catch(() => "")) || fallbackMessage;
};

const cloneLines = (lines: LineItem[]) => lines.map((line) => ({ ...line }));

const serializeFont = (line?: LineItem) =>
  JSON.stringify({
    fontFamily: line?.fontFamily ?? "Inter",
    fontStyle: line?.fontStyle ?? "Regular",
    fontSize: line?.fontSize ?? "12",
  });

const buildBranchRequestBody = (payload: BranchPayload, branchId?: number): BranchRequestBody => {
  const headerLines = payload.lines.filter((line) => line.section === "header");
  const footerLines = payload.lines.filter((line) => line.section === "footer");

  return {
    ...(branchId ? { branchId } : {}),
    name: payload.branchName,
    ...(branchId ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
    header1: headerLines[0]?.value ?? "",
    headerLeftAlign1: Math.round(headerLines[0]?.offsetX ?? 0),
    headerFont1: serializeFont(headerLines[0]),
    header2: headerLines[1]?.value ?? "",
    headerLeftAlign2: Math.round(headerLines[1]?.offsetX ?? 0),
    headerFont2: serializeFont(headerLines[1]),
    header3: headerLines[2]?.value ?? "",
    headerLeftAlign3: Math.round(headerLines[2]?.offsetX ?? 0),
    headerFont3: serializeFont(headerLines[2]),
    header4: headerLines[3]?.value ?? "",
    headerLeftAlign4: Math.round(headerLines[3]?.offsetX ?? 0),
    headerFont4: serializeFont(headerLines[3]),
    header5: headerLines[4]?.value ?? "",
    headerLeftAlign5: Math.round(headerLines[4]?.offsetX ?? 0),
    headerFont5: serializeFont(headerLines[4]),
    header6: headerLines[5]?.value ?? "",
    headerLeftAlign6: Math.round(headerLines[5]?.offsetX ?? 0),
    headerFont6: serializeFont(headerLines[5]),
    header7: headerLines[6]?.value ?? "",
    headerLeftAlign7: Math.round(headerLines[6]?.offsetX ?? 0),
    headerFont7: serializeFont(headerLines[6]),
    footer1: footerLines[0]?.value ?? "",
    footerLeftAlign1: Math.round(footerLines[0]?.offsetX ?? 0),
    footerFont1: serializeFont(footerLines[0]),
    footer2: footerLines[1]?.value ?? "",
    footerLeftAlign2: Math.round(footerLines[1]?.offsetX ?? 0),
    footerFont2: serializeFont(footerLines[1]),
    footer3: footerLines[2]?.value ?? "",
    footerLeftAlign3: Math.round(footerLines[2]?.offsetX ?? 0),
    footerFont3: serializeFont(footerLines[2]),
    footer4: footerLines[3]?.value ?? "",
    footerLeftAlign4: Math.round(footerLines[3]?.offsetX ?? 0),
    footerFont4: serializeFont(footerLines[3]),
    footer5: footerLines[4]?.value ?? "",
    footerLeftAlign5: Math.round(footerLines[4]?.offsetX ?? 0),
    footerFont5: serializeFont(footerLines[4]),
    footer6: footerLines[5]?.value ?? "",
    footerLeftAlign6: Math.round(footerLines[5]?.offsetX ?? 0),
    footerFont6: serializeFont(footerLines[5]),
    footer7: footerLines[6]?.value ?? "",
    footerLeftAlign7: Math.round(footerLines[6]?.offsetX ?? 0),
    footerFont7: serializeFont(footerLines[6]),
  };
};

export const fetchBranchNames = async (): Promise<BranchRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/api/Branch/list-name`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load branches"));
  }

  const json = (await response.json()) as ApiResponse<BranchListItem[]>;

  return Array.isArray(json.data)
    ? json.data.map((item) => ({
        id: item.branchId ?? 0,
        branchName: item.branchName ?? "",
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const createBranch = async (payload: BranchPayload) => {
  const response = await fetch(`${API_BASE_URL}/api/Branch`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBranchRequestBody(payload)),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create branch"));
  }

  const json = (await response.json()) as ApiResponse<BranchIdResponse>;
  const id = json.data?.id;

  if (!id) {
    throw new Error("Branch created, but no branch id was returned by the server.");
  }

  return {
    id,
    branchName: payload.branchName,
    lines: cloneLines(payload.lines),
    detailsLoaded: true,
  } satisfies BranchRecord;
};

export const updateBranch = async (branchId: number, payload: BranchPayload) => {
  const response = await fetch(`${API_BASE_URL}/api/Branch/${branchId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBranchRequestBody(payload, branchId)),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update branch"));
  }

  await response.json().catch(() => null);

  return {
    id: branchId,
    branchName: payload.branchName,
    lines: cloneLines(payload.lines),
    detailsLoaded: true,
  } satisfies BranchRecord;
};
