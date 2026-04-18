import type { ChangePasswordPayload, User, UserPayload } from "../types";



interface ApiResponse<T> {
  data?: T;
  message?: string;
  status?: number;
  isSuccess?: boolean;
}

interface UserApiRecord {
  id?: number;
  userId?: number;
  name?: string;
  userName?: string;
  branchId?: number;
  branch?: string;
  isActive?: boolean;
  active?: boolean;
  status?: string;
  isMaster?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

const mapApiUser = (user: UserApiRecord): User => ({
  id: user.id ?? user.userId ?? 0,
  name: user.name ?? user.userName ?? "",
  branchId: user.branchId ?? 0,
  branchName: user.branch ?? "",
  isActive: user.isActive ?? user.active ?? false,
  isMaster: Boolean(user.isMaster),
  statusLabel: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeUsers = (payload: unknown): User[] => {
  if (!Array.isArray(payload)) return [];

  return payload.map((item) => {
    const record = item as UserApiRecord;
    const isActive =
      typeof record.isActive === "boolean"
        ? record.isActive
        : typeof record.active === "boolean"
          ? record.active
          : String(record.isActive ?? record.status ?? "").toLowerCase() === "active";

    return {
      ...mapApiUser(record),
      isActive,
      statusLabel:
        typeof record.isActive === "string"
          ? record.isActive
          : record.status ?? (isActive ? "Active" : "Inactive"),
    };
  });
};

export const fetchUsers = async () => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user/userlist`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load users"));
  }

  const json = (await response.json()) as ApiResponse<unknown>;
  return normalizeUsers(json.data);
};

export const fetchUserById = async (userId: number) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user/${userId}/userid-data`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to load user details"));
  }

  const json = (await response.json()) as ApiResponse<unknown>;
  return mapApiUser((json.data ?? {}) as UserApiRecord);
};

export const createUser = async (payload: UserPayload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      password: payload.password,
      branchId: payload.branchId,
      isActive: payload.isActive,
      isMaster: payload.isMaster,
      createdAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create user"));
  }

  return (await response.json()) as ApiResponse<{ id?: number }>;
};

export const updateUser = async (userId: number, payload: UserPayload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user/${userId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      name: payload.name,
      branchId: payload.branchId,
      isActive: payload.isActive,
      isMaster: payload.isMaster,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to update user"));
  }

  return (await response.json()) as ApiResponse<{ id?: number }>;
};

export const deleteUser = async (userId: number) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user/${userId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to delete user"));
  }

  return (await response.json()) as ApiResponse<{ id?: number }>;
};

export const changeUserPassword = async (userId: number, payload: ChangePasswordPayload) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/user/${userId}/change-password`, {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to change password"));
  }

  return (await response.json()) as ApiResponse<unknown>;
};
