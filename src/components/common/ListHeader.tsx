import React from "react";
import { Plus } from "lucide-react";
import { Button, SearchBar } from "./index";

interface ListHeaderProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  autoFocusSearch?: boolean;
  canAdd?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  children?: React.ReactNode;
  extraActions?: React.ReactNode;
}

const ListHeader: React.FC<ListHeaderProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  autoFocusSearch = false,
  canAdd = false,
  onAdd,
  addLabel = "Add New",
  children,
  extraActions,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
      <div className="flex gap-4 items-end flex-1">
        {children}
        {search !== undefined && onSearchChange && (
          <div className="flex-1 max-w-sm">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              autoFocus={autoFocusSearch}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {extraActions}
        {canAdd && onAdd && (
          <Button icon={<Plus size={18} />} onClick={onAdd}>
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ListHeader;
