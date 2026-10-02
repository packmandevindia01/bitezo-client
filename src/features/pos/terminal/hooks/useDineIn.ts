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

  const fetchSections = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const response = await dineInApi.getSections();
      if (response.isSuccess) {
        if (response.data.length > 0) {
          setSections(response.data);
          setSelectedSectionId(prev => prev !== null ? prev : response.data[0].sectionId);
        } else {
          setSections([]);
        }
      } else {
        if (!isSilent) {
          setSections([]);
          showToast(response.message || 'Failed to fetch sections', 'warning');
        }
      }
    } catch (error: any) {
      if (!isSilent) {
        setSections([]);
        showToast(error.message || 'Error fetching sections', 'warning');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [showToast]);

  const fetchTables = useCallback(async (sectionId: number, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const response = await dineInApi.getTables(sectionId);
      if (response.isSuccess) {
        if (response.data.length > 0) {
          setTables(response.data);
        } else {
          setTables([]);
        }
      } else {
        if (!isSilent) {
          setTables([]);
          showToast(response.message || 'Failed to fetch tables', 'warning');
        }
      }
    } catch (error: any) {
      if (!isSilent) {
        setTables([]);
        showToast(error.message || 'Error fetching tables', 'warning');
      }
    } finally {
      if (!isSilent) setLoading(false);
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

  // Auto-refresh Dine In on POS every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedSectionId !== null) {
        void fetchTables(selectedSectionId, true);
      } else {
        void fetchSections(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedSectionId, fetchTables, fetchSections]);

  return {
    sections,
    tables,
    selectedSectionId,
    setSelectedSectionId,
    loading,
    refresh: () => selectedSectionId !== null && fetchTables(selectedSectionId)
  };
};
