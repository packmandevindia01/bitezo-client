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
