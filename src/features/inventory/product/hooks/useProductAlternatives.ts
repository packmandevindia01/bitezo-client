import { useState } from "react";
import { emptyAltDraft } from "../constants";
import type { AltProductDraft } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export const useProductAlternatives = () => {
  const { showToast } = useToast();
  const [alternatives, setAlternatives] = useState<AltProductDraft[]>([]);
  const [altDraft, setAltDraft] = useState<Omit<AltProductDraft, "id">>(emptyAltDraft);

  const setAlternativeField = <K extends keyof Omit<AltProductDraft, "id">>(
    key: K,
    value: Omit<AltProductDraft, "id">[K]
  ) => {
    setAltDraft((prev) => ({ ...prev, [key]: value }));
  };

  const addAlternative = () => {
    if (!altDraft.branchId || !altDraft.altName) {
      showToast("Please provide Branch and Alternative Name.", "warning");
      return;
    }
    setAlternatives((prev) => [...prev, { ...altDraft, id: Date.now() }]);
    setAltDraft(emptyAltDraft);
  };

  const removeAlternative = (id: number) => {
    setAlternatives((prev) => prev.filter((item) => item.id !== id));
  };

  const resetAlternatives = () => {
    setAlternatives([]);
    setAltDraft(emptyAltDraft);
  };

  return {
    alternatives,
    setAlternatives,
    altDraft,
    setAltDraft,
    setAlternativeField,
    addAlternative,
    removeAlternative,
    resetAlternatives,
  };
};
