export interface DefaultEmployeeConfig {
  isEnabled: boolean;
  employeeId: number;
  employeeName: string;
}

export const getDefaultEmployeeConfig = (): DefaultEmployeeConfig => {
  try {
    const rawOverride = localStorage.getItem("posDefaultEmployeeOverride");
    if (rawOverride) {
      const parsed = JSON.parse(rawOverride);
      if (parsed?.defaultEmployee === "Enable" && Number(parsed?.employeeId) > 0) {
        return {
          isEnabled: true,
          employeeId: Number(parsed.employeeId),
          employeeName: parsed.employeeName || localStorage.getItem("defaultEmployeeName") || "",
        };
      }
    }
    const saved = localStorage.getItem("posConfigs");
    if (saved) {
      const parsed = JSON.parse(saved);
      const configs = parsed?.configs || parsed;
      if (configs?.defaultEmployee === "Enable" && Number(configs?.employeeId) > 0) {
        return {
          isEnabled: true,
          employeeId: Number(configs.employeeId),
          employeeName: localStorage.getItem("defaultEmployeeName") || "",
        };
      }
    }
  } catch {
    // ignore parse errors
  }
  return { isEnabled: false, employeeId: 0, employeeName: "" };
};

export const isDefaultEmployeeActive = (): boolean => {
  return getDefaultEmployeeConfig().isEnabled;
};

/**
 * Disables the default employee in localStorage (both override and posConfigs).
 * Clears cached employee and waiter names and dispatches an event for listening components.
 */
export const disableDefaultEmployeeConfig = (reason?: string): void => {
  try {
    console.warn("[defaultEmployee] Disabling default employee.", reason || "");

    // 1. Remove overrides and cached names
    localStorage.removeItem("posDefaultEmployeeOverride");
    localStorage.removeItem("defaultEmployeeName");
    localStorage.removeItem("selectedWaiterId");
    localStorage.removeItem("selectedWaiterName");

    // 2. Clear default employee in posConfigs if saved
    const saved = localStorage.getItem("posConfigs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.configs) {
          parsed.configs.defaultEmployee = "Disable";
          parsed.configs.employeeId = 0;
        }
        if (parsed?.defaultEmployee) {
          parsed.defaultEmployee = "Disable";
          parsed.employeeId = 0;
        }
        localStorage.setItem("posConfigs", JSON.stringify(parsed));
      } catch (parseErr) {
        console.warn("[defaultEmployee] Failed to update posConfigs:", parseErr);
      }
    }

    // 3. Dispatch window event so listening components/hooks can react
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pos:default-employee-disabled", {
          detail: { reason },
        })
      );
    }
  } catch (err) {
    console.error("[defaultEmployee] Failed to disable default employee config:", err);
  }
};

/**
 * Inspects an API error (status 409, 400, etc.) to determine if it was caused by
 * employeeId not existing in the system (e.g. EMPLOYEE_NOT_FOUND or validator message).
 */
export const isEmployeeNotFoundError = (err: any): boolean => {
  if (!err) return false;
  const resData = err?.response?.data || err?.data || err;

  if (resData?.code === "EMPLOYEE_NOT_FOUND" || resData?.field === "employeeId") {
    return true;
  }

  const errors = Array.isArray(resData?.errors) ? resData.errors : [];
  for (const e of errors) {
    if (typeof e === "string") {
      const lower = e.toLowerCase();
      if (lower.includes("employee") || lower.includes("counter was not found")) return true;
    } else if (e && typeof e === "object") {
      if (e.code === "EMPLOYEE_NOT_FOUND" || e.field === "employeeId") return true;
      const msg = String(e.message || "").toLowerCase();
      if (msg.includes("employee") || msg.includes("counter was not found")) return true;
    }
  }

  const mainMsg = String(resData?.message || resData?.title || err?.message || "").toLowerCase();
  if (
    mainMsg.includes("employee_not_found") ||
    mainMsg.includes("employee not found") ||
    mainMsg.includes("specified employee") ||
    mainMsg.includes("counter was not found") // Backend typo for employeeId validator
  ) {
    return true;
  }

  return false;
};

/**
 * Checks whether the given employeeId exists in the locally cached posEmpNameMap.
 * If the cache is populated and does NOT contain this employee, returns false.
 * If cache is empty or not yet loaded, returns true (optimistic check).
 */
export const isDefaultEmployeeValidInCache = (employeeId: number): boolean => {
  if (!employeeId || employeeId <= 0) return false;
  try {
    const mapRaw = localStorage.getItem("posEmpNameMap");
    if (mapRaw) {
      const map = JSON.parse(mapRaw);
      const keys = Object.keys(map);
      // Only validate against cache if the cache actually contains entries
      if (keys.length > 0) {
        return Boolean(map[String(employeeId)]);
      }
    }
  } catch {}
  return true;
};

/**
 * Validates the currently configured default employee against a fresh list of branch employees.
 * If configured employee does NOT exist in the list, automatically disables the default employee.
 */
export const validateDefaultEmployeeAgainstList = (employees: any[]): boolean => {
  const current = getDefaultEmployeeConfig();
  if (!current.isEnabled || !current.employeeId) return true;
  if (!Array.isArray(employees) || employees.length === 0) return true;

  const found = employees.some((e: any) => {
    const id = Number(e.empId ?? e.id);
    return id === current.employeeId;
  });

  if (!found) {
    disableDefaultEmployeeConfig(
      `Employee ID ${current.employeeId} not found in branch employees list`
    );
    return false;
  }

  return true;
};

