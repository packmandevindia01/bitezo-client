import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBranches } from "../services/branchService";
import { counterService } from "../../general/counter/services/counterService";
import { useToast } from "../../../app/providers/useToast";
import type { BranchOption, CounterOption, SystemType } from "../types";

export const useSystemRegistration = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [systemType, setSystemType] = useState<SystemType>("pos");
  const [systemName, setSystemName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [counterId, setCounterId] = useState("");
  
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [counters, setCounters] = useState<CounterOption[]>([]);
  
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [errors, setErrors] = useState({ systemName: "", branchId: "", counterId: "" });

  // Load existing settings on mount
  useEffect(() => {
    const existingName = localStorage.getItem("systemName");
    if (existingName) setSystemName(existingName);
    
    const existingBranch = localStorage.getItem("systemBranchId");
    if (existingBranch) setBranchId(existingBranch);

    const existingCounter = localStorage.getItem("systemCounterId");
    if (existingCounter) setCounterId(existingCounter);
    
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

  // Fetch counters when branch changes
  useEffect(() => {
    if (!branchId || systemType !== "pos") {
      setCounters([]);
      setCounterId("");
      return;
    }

    setLoadingCounters(true);
    counterService.list()
      .then((allCounters) => {
        // Filter counters by branch if the API doesn't do it server-side
        const filtered = allCounters.map(c => ({ id: c.counterId, name: c.counterName }));
        setCounters(filtered);
      })
      .catch(() => showToast("Could not load counters", "error"))
      .finally(() => setLoadingCounters(false));
  }, [branchId, systemType, showToast]);

  const validate = useCallback(() => {
    const next = { systemName: "", branchId: "", counterId: "" };
    if (!systemName.trim()) next.systemName = "System name is required";
    if (!branchId) next.branchId = "Please select a branch";
    if (systemType === "pos" && !counterId) next.counterId = "Please select a counter";
    
    setErrors(next);
    return !next.systemName && !next.branchId && (systemType !== "pos" || !next.counterId);
  }, [systemName, branchId, counterId, systemType]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const selectedBranch = branches.find((b) => String(b.id) === branchId);
      const selectedCounter = counters.find((c) => String(c.id) === counterId);

      localStorage.setItem("systemType", systemType);
      localStorage.setItem("systemName", systemName.trim());
      localStorage.setItem("systemBranchId", branchId);
      localStorage.setItem("systemBranchName", selectedBranch?.name ?? "");
      
      if (systemType === "pos") {
        localStorage.setItem("systemCounterId", counterId);
        localStorage.setItem("systemCounterName", selectedCounter?.name ?? "");
      }

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

  const handleFieldChange = (field: "systemName" | "branchId" | "counterId", value: string) => {
    if (field === "systemName") {
      setSystemName(value);
      setErrors((p) => ({ ...p, systemName: "" }));
    } else if (field === "branchId") {
      setBranchId(value);
      setErrors((p) => ({ ...p, branchId: "", counterId: "" }));
      setCounterId(""); // Reset counter on branch change
    } else {
      setCounterId(value);
      setErrors((p) => ({ ...p, counterId: "" }));
    }
  };

  return {
    systemType,
    setSystemType,
    systemName,
    branchId,
    counterId,
    branches,
    counters,
    loadingBranches,
    loadingCounters,
    saving,
    errors,
    handleFieldChange,
    handleSubmit,
  };
};
