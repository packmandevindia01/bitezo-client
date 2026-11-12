/**
 * Employee names on the POS (waiter / cashier on prints and screens).
 *
 * The names are cached on the device in localStorage `posEmpNameMap` ({ "12": "Ahmed", … }), filled from
 * `GET /employee/list-name` for the terminal's branch. This module is the ONLY place that reads or writes
 * that cache; it replaces ~15 hand-written copies (2026-11-11, OPTIMIZATION_STATUS.md Phase 6).
 *
 * "Placeholder" names (Waiter / Cashier) are generic labels, not a person; the print lookups skip them so
 * a real name found later wins.
 */
import { getTerminalBranchId } from "@shared/config/device";
import { getEmployeeNames, getEmployeeById } from "../../general/employee/services/employeeService";

export const EMPLOYEE_NAME_MAP_KEY = "posEmpNameMap";

export type EmployeeNameMap = Record<string, string>;

const PLACEHOLDER_NAMES = ["waiter", "cashier"];

/** "Waiter" / "Cashier" (any case, any spaces) — a label, not a person's name. */
export const isPlaceholderName = (name: unknown): boolean =>
  PLACEHOLDER_NAMES.includes(String(name ?? "").trim().toLowerCase());

/** A name worth printing: not empty, not a placeholder, not the strings "null" / "undefined". */
export const isRealEmployeeName = (name: unknown): boolean =>
  typeof name === "string" &&
  !["waiter", "cashier", "null", "undefined", ""].includes(name.trim().toLowerCase());

/** Employee id as the cache key, or "" when there is no usable id (missing, 0, NaN). */
const idKey = (empId: unknown): string => {
  if (empId === undefined || empId === null) return "";
  const id = String(empId).trim();
  return id === "0" || id === "NaN" ? "" : id;
};

/** The cached names; {} when there are none or the stored value is not readable. */
export const readEmployeeNameMap = (): EmployeeNameMap => {
  try {
    const raw = localStorage.getItem(EMPLOYEE_NAME_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeEmployeeNameMap = (map: EmployeeNameMap) => {
  try {
    localStorage.setItem(EMPLOYEE_NAME_MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn("Employee names: could not save the cache", err);
  }
};

/**
 * Name of `empId` from the cache, or null.
 * `realNamesOnly`: trimmed, and null for a placeholder name (print lookups).
 */
export const cachedEmployeeName = (empId: unknown, options: { realNamesOnly?: boolean } = {}): string | null => {
  const id = idKey(empId);
  if (!id) return null;
  const name = readEmployeeNameMap()[id];
  if (!name) return null;
  if (!options.realNamesOnly) return name;
  return isPlaceholderName(name) ? null : String(name).trim();
};

/** True when the cache has names but not this employee. An empty cache (not loaded yet) counts as valid. */
export const isEmployeeKnownOrCacheEmpty = (empId: number): boolean => {
  const map = readEmployeeNameMap();
  return Object.keys(map).length === 0 || Boolean(map[String(empId)]);
};

/** Add / update names from an employee list (`{ empId, empName }` or `{ id, name }`), keeping the others. */
export const mergeEmployeeNames = (list: any[]): EmployeeNameMap => {
  const map: EmployeeNameMap = { ...readEmployeeNameMap() };
  for (const e of list || []) {
    const id = e?.empId ?? e?.id;
    const name = e?.empName ?? e?.name;
    if (id && name) map[String(id)] = name;
  }
  writeEmployeeNameMap(map);
  return map;
};

/** Replace the cache with this branch's list (POS Configuration loads the full list for the branch). */
export const replaceEmployeeNames = (list: any[]): EmployeeNameMap => {
  const map: EmployeeNameMap = {};
  for (const e of list || []) {
    const id = e?.empId ?? e?.id;
    if (id) map[String(id)] = e?.empName ?? e?.name ?? "";
  }
  writeEmployeeNameMap(map);
  return map;
};

/** Remember one name (found by id lookup). */
export const rememberEmployeeName = (empId: unknown, name: string) => {
  const id = idKey(empId);
  if (!id || !name) return;
  writeEmployeeNameMap({ ...readEmployeeNameMap(), [id]: name });
};

/** Load the terminal branch's names from the server into the cache. Throws on a failed request. */
export const refreshEmployeeNamesForBranch = async (): Promise<{ list: any[]; map: EmployeeNameMap }> => {
  const list = await getEmployeeNames(getTerminalBranchId() || 0);
  if (!Array.isArray(list) || list.length === 0) return { list: [], map: readEmployeeNameMap() };
  return { list, map: mergeEmployeeNames(list) };
};

/**
 * Name of `empId`: cache → the authorized employee (same id) → the branch list from the server.
 * Null when not found. `realNamesOnly` skips placeholder names at every step.
 */
export const findEmployeeName = async (
  empId: unknown,
  options: { realNamesOnly?: boolean } = {}
): Promise<string | null> => {
  const id = idKey(empId);
  if (!id) return null;
  const realOnly = Boolean(options.realNamesOnly);

  const cached = cachedEmployeeName(id, options);
  if (cached) return cached;

  if (id === localStorage.getItem("authorizedEmployeeId")) {
    const authName = localStorage.getItem("authorizedEmployeeName");
    if (authName && (!realOnly || !isPlaceholderName(authName))) return realOnly ? authName.trim() : authName;
  }

  try {
    const { map } = await refreshEmployeeNamesForBranch();
    const name = map[id];
    if (name && (!realOnly || !isPlaceholderName(name))) return realOnly ? String(name).trim() : name;
  } catch (err) {
    console.warn("Employee names: branch list lookup failed", err);
  }
  return null;
};

/**
 * Real name of `empId` for a screen: cache → authorized employee → branch list → employee by id. Null when not found.
 * Never falls back to this device's default / logged-in employee (that would show the wrong person).
 */
export const lookupEmployeeName = async (empId: unknown): Promise<string | null> => {
  const found = await findEmployeeName(empId, { realNamesOnly: true });
  if (found) return found;
  const numId = parseInt(idKey(empId), 10);
  if (isNaN(numId) || numId <= 0) return null;
  try {
    const empDetail = (await getEmployeeById(numId)) as { empName?: string; name?: string; firstName?: string } | null;
    const name = empDetail?.empName || empDetail?.name || empDetail?.firstName;
    if (name && !isPlaceholderName(name)) {
      rememberEmployeeName(String(numId), name);
      return String(name).trim();
    }
  } catch (err) {
    console.warn("Employee names: lookup by id failed", err);
  }
  return null;
};

/** The device's fallback names, in order: default employee, authorized employee, logged-in employee. */
export const deviceEmployeeNames = (): { defaultName: string | null; authorizedName: string | null; loggedInName: string | null } => ({
  defaultName: localStorage.getItem("defaultEmployeeName"),
  authorizedName: localStorage.getItem("authorizedEmployeeName"),
  loggedInName: localStorage.getItem("employeeName"),
});

/** The terminal's default employee name (real names only), else null. */
const defaultEmployeeName = (): string | null => {
  const name = deviceEmployeeNames().defaultName;
  return isRealEmployeeName(name) ? String(name).trim() : null;
};

/**
 * Employee of a SAVED order, for screens and prints (owner's rule, AGENT.md §6.0): the employee whose code was punched
 * when the order was placed, or the default employee when no code was asked. Both are saved as the order's employee
 * id, so: the real name already on the order → the name of that id (cache → authorized employee with that id →
 * branch list → employee by id) → "Waiter". Only an order WITHOUT an employee id falls back to the default employee.
 * Never the logged-in / authorized employee of this device for another id.
 */
export const resolveEmployeeNameForPrint = async (empId?: unknown, currentName?: string | null): Promise<string> => {
  if (isRealEmployeeName(currentName)) return String(currentName).trim();
  if (idKey(empId)) return (await lookupEmployeeName(empId)) || "Waiter";
  return defaultEmployeeName() || "Waiter";
};

/** Same rule without server calls (shown at once; the name of an id not cached yet is "Waiter"). */
export const savedOrderWaiterName = (rawName: unknown, empId: unknown): string => {
  if (isRealEmployeeName(rawName)) return String(rawName).trim();
  const id = idKey(empId);
  if (!id) return defaultEmployeeName() || "Waiter";
  const cached = cachedEmployeeName(id, { realNamesOnly: true });
  if (cached) return cached;
  const authName = localStorage.getItem("authorizedEmployeeName");
  if (id === localStorage.getItem("authorizedEmployeeId") && isRealEmployeeName(authName)) return String(authName).trim();
  return "Waiter";
};
