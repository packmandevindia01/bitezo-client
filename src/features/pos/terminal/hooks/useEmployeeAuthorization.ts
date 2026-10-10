import { useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { employeeService } from "../../../general/employee/services/employeeService";
import { getDefaultEmployeeConfig } from "../../utils/defaultEmployee";

interface EmployeeAuthorizationOptions {
  actionLabel: string;
  permissionId?: number;
  onAuthorized: (employeeId: number) => Promise<void> | void;
}

export const useEmployeeAuthorization = () => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const [pendingAuthorization, setPendingAuthorization] = useState<EmployeeAuthorizationOptions | null>(null);

  const requestAuthorization = (options: EmployeeAuthorizationOptions) => {
    const defaultEmp = getDefaultEmployeeConfig();
    if (defaultEmp.isEnabled && defaultEmp.employeeId > 0) {
      localStorage.setItem("authorizedEmployeeId", String(defaultEmp.employeeId));
      if (defaultEmp.employeeName) {
        localStorage.setItem("authorizedEmployeeName", defaultEmp.employeeName);
      }
      void options.onAuthorized(defaultEmp.employeeId);
      return;
    }

    setPendingAuthorization(options);
    setError(null);
    setIsAdminOverride(false);
    setIsOpen(true);
  };

  const closeAuthorization = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
    setIsAdminOverride(false);
    setPendingAuthorization(null);
  };

  const validatePassword = async (password: string) => {
    if (!pendingAuthorization) return;

    setLoading(true);
    setError(null);

    let authorized = false;
    let verifiedEmployeeId = 0;
    const authAction = pendingAuthorization; // capture before clearing state

    try {
      const defaultEmp = getDefaultEmployeeConfig();
      if (defaultEmp.isEnabled && defaultEmp.employeeId > 0 && (!password || password.trim() === "")) {
        authorized = true;
        verifiedEmployeeId = defaultEmp.employeeId;
        localStorage.setItem("authorizedEmployeeId", String(defaultEmp.employeeId));
        if (defaultEmp.employeeName) {
          localStorage.setItem("authorizedEmployeeName", defaultEmp.employeeName);
        }
        setIsOpen(false);
        setIsAdminOverride(false);
        setPendingAuthorization(null);
      } else {
        const response = await employeeService.validateEmployeePassword(password, pendingAuthorization.permissionId);
        const employeeId = response.data?.employeeId ?? 0;
        const hasPrivilege = Boolean(response.data?.hasPrivilege);

      if (employeeId <= 0) {
        setError(isAdminOverride ? "Invalid Admin Password" : "Invalid Employee Password");
        showToast(isAdminOverride ? "Invalid Admin Password" : "Invalid Employee Password", "error");
        return;
      }

      if (pendingAuthorization.permissionId && !hasPrivilege) {
        // If they don't have privilege, we trigger Admin Override mode!
        setIsAdminOverride(true);
        const message = `No privilege for ${authAction.actionLabel}. Enter Authorized Admin Password.`;
        setError(message);
        showToast(message, "error");
        return; // Return early, leaving the modal open for the admin to type their password
      }

      // Password OK and has privilege — mark authorized and close the modal
      authorized = true;
      verifiedEmployeeId = employeeId;
      if (employeeId > 0) {
        localStorage.setItem("authorizedEmployeeId", String(employeeId));
        try {
          const mapRaw = localStorage.getItem("posEmpNameMap");
          if (mapRaw) {
            const map = JSON.parse(mapRaw);
            if (map[String(employeeId)]) {
              localStorage.setItem("authorizedEmployeeName", map[String(employeeId)]);
            }
          }
        } catch {}
      }
      setIsOpen(false);
      setIsAdminOverride(false);
      setPendingAuthorization(null);
      }
    } catch {
      // Only password validation errors reach here
      const errorMsg = isAdminOverride ? "Invalid Admin Password" : "Invalid Employee Password";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }

    // Run the action OUTSIDE the try-catch so its errors are never mistaken
    // for password errors (e.g. a 400 from the order API)
    if (authorized) {
      await authAction.onAuthorized(verifiedEmployeeId);
    }
  };


  return {
    authorizationModalKey: `${isOpen}-${error ?? "ready"}`,
    authorizationModalProps: {
      isOpen,
      loading,
      error,
      isAdminOverride,
      onClose: closeAuthorization,
      onSubmit: validatePassword,
    },
    requestAuthorization,
  };
};
