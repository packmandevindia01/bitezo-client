import { useCallback, useEffect, useMemo, useState } from "react";
import { groupService } from "../services/groupService";
import type { GroupRecord } from "../types";

export const useGroupList = () => {
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchGroups = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await groupService.list();
      setGroups(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load groups.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((g) =>
      [g.code, g.name].some((v) => v.toLowerCase().includes(query))
    );
  }, [groups, search]);

  return {
    groups,
    setGroups,
    listLoading,
    listError,
    search,
    setSearch,
    filteredGroups,
    fetchGroups,
  };
};
