import { useEffect, useState } from "react";
import { sectionService } from "../../section/services/sectionService";
import type { SectionRecord } from "../../section/types";

export const useTableSections = () => {
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const data = await sectionService.list();
        setSections(data);
        if (data.length > 0 && selectedSectionId === null) {
          setSelectedSectionId(data[0].sectionId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch sections";
        setError(msg);
      }
    };
    fetchSections();
  }, [selectedSectionId]);

  return {
    sections,
    selectedSectionId,
    setSelectedSectionId,
    sectionError: error,
    setSectionError: setError,
  };
};
