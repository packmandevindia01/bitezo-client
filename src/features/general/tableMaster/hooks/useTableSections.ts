import { useEffect, useState } from "react";
import { sectionService } from "../../section/services/sectionService";

export const useTableSections = () => {
  const [sections, setSections] = useState<any[]>([]);
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
      } catch (err: any) {
        setError(err.message || "Failed to fetch sections");
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
