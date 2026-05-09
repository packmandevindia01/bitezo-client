import { useState, useEffect, useCallback } from 'react';
import { dineInApi } from '../../services/dineInApi';
import type { DineInSection, DineInTable } from '../../types';
import { useToast } from '../../../../app/providers/useToast';

export const useDineIn = () => {
  const { showToast } = useToast();
  const [sections, setSections] = useState<DineInSection[]>([]);
  const [tables, setTables] = useState<DineInTable[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dineInApi.getSections();
      if (response.isSuccess) {
        setSections(response.data);
        if (response.data.length > 0 && selectedSectionId === null) {
          setSelectedSectionId(response.data[0].sectionId);
        }
      } else {
        showToast(response.message || 'Failed to fetch sections', 'warning');
      }
    } catch (error: any) {
      showToast(error.message || 'Error fetching sections', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedSectionId]);

  const fetchTables = useCallback(async (sectionId: number) => {
    try {
      setLoading(true);
      const response = await dineInApi.getTables(sectionId);
      if (response.isSuccess) {
        setTables(response.data);
      } else {
        showToast(response.message || 'Failed to fetch tables', 'warning');
      }
    } catch (error: any) {
      showToast(error.message || 'Error fetching tables', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (selectedSectionId !== null) {
      fetchTables(selectedSectionId);
    }
  }, [selectedSectionId, fetchTables]);

  return {
    sections,
    tables,
    selectedSectionId,
    setSelectedSectionId,
    loading,
    refresh: () => selectedSectionId !== null && fetchTables(selectedSectionId)
  };
};
