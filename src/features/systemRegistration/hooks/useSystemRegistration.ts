import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBranches, fetchTerminals } from "../services/branchService";
import { counterService } from "../../general/counter/services/counterService";
import { useToast } from "../../../app/providers/useToast";
import type { BranchOption, CounterOption, TerminalOption, SystemType } from "../types";

export const useSystemRegistration = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [systemType, setSystemType] = useState<SystemType>("pos");
  const [terminalId, setTerminalId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [counterId, setCounterId] = useState("");
  
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [terminals, setTerminals] = useState<TerminalOption[]>([]);
  
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [errors, setErrors] = useState({ terminalId: "", branchId: "", counterId: "" });

  // Load existing settings on mount
  useEffect(() => {
    const existingTerminalId = localStorage.getItem("terminalId") || localStorage.getItem("systemId");
    if (existingTerminalId) setTerminalId(existingTerminalId);
    
    const existingBranch = localStorage.getItem("systemBranchId");
    if (existingBranch) setBranchId(existingBranch);

    const existingCounter = localStorage.getItem("systemCounterId");
    if (existingCounter) setCounterId(existingCounter);
    
    const existingType = localStorage.getItem("systemType") as SystemType | null;
    if (existingType) setSystemType(existingType);
  }, []);

  // Handle system type change with persistence
  const handleSystemTypeChange = (type: SystemType) => {
    setSystemType(type);
    localStorage.setItem("systemType", type);
  };

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

  // Fetch terminals when branch changes
  useEffect(() => {
    if (!branchId) {
      setTerminals([]);
      setTerminalId("");
      return;
    }

    setLoadingTerminals(true);
    fetchTerminals(branchId)
      .then(setTerminals)
      .catch(() => showToast("Could not load terminals", "error"))
      .finally(() => setLoadingTerminals(false));
  }, [branchId, showToast]);

  const validate = useCallback(() => {
    const next = { terminalId: "", branchId: "", counterId: "" };
    if (!terminalId) next.terminalId = "Please select a terminal";
    if (!branchId) next.branchId = "Please select a branch";
    if (systemType === "pos" && !counterId) next.counterId = "Please select a counter";
    
    setErrors(next);
    return !next.terminalId && !next.branchId && (systemType !== "pos" || !next.counterId);
  }, [terminalId, branchId, counterId, systemType]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const selectedBranch = branches.find((b) => String(b.id) === branchId);
      const selectedCounter = counters.find((c) => String(c.id) === counterId);
      const selectedTerminal = terminals.find((t) => String(t.id) === terminalId);

      localStorage.setItem("systemType", systemType);
      localStorage.setItem("systemName", selectedTerminal?.name ?? "");
      localStorage.setItem("terminalId", terminalId);
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

  const handleFieldChange = (field: "terminalId" | "branchId" | "counterId", value: string) => {
    if (field === "terminalId") {
      setTerminalId(value);
      setErrors((p) => ({ ...p, terminalId: "" }));
    } else if (field === "branchId") {
      setBranchId(value);
      setErrors((p) => ({ ...p, branchId: "", counterId: "", terminalId: "" }));
      setCounterId(""); // Reset counter on branch change
      setTerminalId(""); // Reset terminal on branch change
    } else {
      setCounterId(value);
      setErrors((p) => ({ ...p, counterId: "" }));
    }
  };

  return {
    systemType,
    setSystemType: handleSystemTypeChange,
    terminalId,
    branchId,
    counterId,
    branches,
    counters,
    terminals,
    loadingBranches,
    loadingCounters,
    loadingTerminals,
    saving,
    errors,
    handleFieldChange,
    handleSubmit,
  };
};

