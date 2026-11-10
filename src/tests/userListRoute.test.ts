/** User lists use the only route the API has: /user/branches/{branchId}/userlist. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserList } from "../features/reports/shiftEndReport/services/shiftEndReportApi";
import { fetchUsers } from "../features/general/user/services";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));

const store = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  http.get.mockResolvedValue({ data: { isSuccess: true, data: [{ userId: 1, userName: "Admin", branch: "All", isActive: "Active" }] } });
});

describe("Shift End user filter", () => {
  it("asks for the chosen branch and maps the reply", async () => {
    await expect(getUserList(3)).resolves.toEqual([{ userId: 1, userName: "Admin", branch: "All", isActive: "Active" }]);
    expect(http.get).toHaveBeenCalledWith("/user/branches/3/userlist");
  });

  it("All uses branch 1", async () => {
    await getUserList(1);
    expect(http.get).toHaveBeenCalledWith("/user/branches/1/userlist");
  });
});

describe("User master list", () => {
  it("asks for its branch", async () => {
    await fetchUsers(4);
    expect(http.get).toHaveBeenCalledWith("/user/branches/4/userlist");
  });

  it("with no branch known, uses All and never the route that does not exist", async () => {
    await fetchUsers(null);
    expect(http.get).toHaveBeenCalledWith("/user/branches/1/userlist");
  });
});
