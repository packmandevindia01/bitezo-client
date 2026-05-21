import { useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { employeeService } from "../../../general/employee/services/employeeService";

interface EmployeeAuthorizationOptions {
  actionLabel: string;
  onAuthorized: (employeeId: number) => Promise<void> | void;
}

export const useEmployeeAuthorization = () => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAuthorization, setPendingAuthorization] = useState<EmployeeAuthorizationOptions | null>(null);

  const requestAuthorization = (options: EmployeeAuthorizationOptions) => {
    setPendingAuthorization(options);
    setError(null);
    setIsOpen(true);
  };

  const closeAuthorization = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
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
      const response = await employeeService.validateEmployeePassword(password);
      const employeeId = response.data?.employeeId ?? 0;
      const hasPrivilege = Boolean(response.data?.hasPrivilege);

      if (employeeId <= 0) {
        setError("Invalid Employee Password");
        showToast("Invalid Employee Password", "error");
        return;
      }

      if (!hasPrivilege) {
        const message = `Employee has no privilege for ${authAction.actionLabel}`;
        setError(message);
        showToast(message, "error");
        return;
      }

      // Password OK — mark authorized and close the modal
      authorized = true;
      verifiedEmployeeId = employeeId;
      setIsOpen(false);
      setPendingAuthorization(null);
    } catch {
      // Only password validation errors reach here
      setError("Invalid Employee Password");
      showToast("Invalid Employee Password", "error");
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
      onClose: closeAuthorization,
      onSubmit: validatePassword,
    },
    requestAuthorization,
  };
};
