import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBranches } from "../services/branchService";
import { useToast } from "../../../app/providers/useToast";
import type { BranchOption, SystemType } from "../types";

export const useSystemRegistration = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [systemType, setSystemType] = useState<SystemType>("pos");
  const [systemName, setSystemName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ systemName: "", branchId: "" });

  // Load existing settings on mount
  useEffect(() => {
    const existingName = localStorage.getItem("systemName");
    if (existingName) setSystemName(existingName);
    
    const existingBranch = localStorage.getItem("systemBranchId");
    if (existingBranch) setBranchId(existingBranch);
    
    const existingType = localStorage.getItem("systemType") as SystemType | null;
    if (existingType) setSystemType(existingType);
  }, []);

  // Fetch branch list
  useEffect(() => {
    setLoadingBranches(true);
    fetchBranches()
      .then(setBranches)
      .catch(() => showToast("Could not load branches", "error"))
      .finally(() => setLoadingBranches(false));
  }, [showToast]);

  const validate = useCallback(() => {
    const next = { systemName: "", branchId: "" };
    if (!systemName.trim()) next.systemName = "System name is required";
    if (!branchId) next.branchId = "Please select a branch";
    setErrors(next);
    return !next.systemName && !next.branchId;
  }, [systemName, branchId]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const selectedBranch = branches.find((b) => String(b.id) === branchId);

      localStorage.setItem("systemType", systemType);
      localStorage.setItem("systemName", systemName.trim());
      localStorage.setItem("systemBranchId", branchId);
      localStorage.setItem("systemBranchName", selectedBranch?.name ?? "");
      localStorage.setItem("systemRegisteredAt", new Date().toISOString());

      showToast(
        `System registered as ${systemType === "pos" ? "POS Terminal" : "Back Office"}`,
        "success"
      );

      if (systemType === "pos") {
        navigate("/cashier/in", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: "systemName" | "branchId", value: string) => {
    if (field === "systemName") {
      setSystemName(value);
      setErrors((p) => ({ ...p, systemName: "" }));
    } else {
      setBranchId(value);
      setErrors((p) => ({ ...p, branchId: "" }));
    }
  };

  return {
    systemType,
    setSystemType,
    systemName,
    branchId,
    branches,
    loadingBranches,
    saving,
    errors,
    handleFieldChange,
    handleSubmit,
  };
};
