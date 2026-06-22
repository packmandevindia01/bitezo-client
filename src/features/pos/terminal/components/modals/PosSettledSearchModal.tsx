import React, { useState, useEffect } from "react";
import { Modal } from "../../../../../components/common";
import { TouchKeyboard } from "../../../../../components/common/TouchKeyboard";

interface PosSettledSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchValue: string, searchStatus: string) => void;
  initialSearchStatus?: string;
  initialSearchValue?: string;
}

const SEARCH_TABS = [
  { id: "Order No", label: "Order No" },
  { id: "Ticket No", label: "Ticket No" },
  { id: "Customer", label: "Customer" },
  { id: "Vehicle No", label: "Vehicle No" },
  { id: "Mobile No", label: "Mobile No" },
];

export const PosSettledSearchModal: React.FC<PosSettledSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  initialSearchStatus = "Order No",
  initialSearchValue = "",
}) => {
  const [activeTab, setActiveTab] = useState(initialSearchStatus);
  const [searchValue, setSearchValue] = useState(initialSearchValue);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialSearchStatus);
      setSearchValue(initialSearchValue);
    }
  }, [isOpen, initialSearchStatus, initialSearchValue]);

  const handleSearch = () => {
    onSearch(searchValue, activeTab);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Orders"
      className="w-full max-w-[95vw] md:max-w-4xl"
    >
      <div className="p-3 md:p-4 flex flex-col gap-3">
        {/* Search Field Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchValue("");
              }}
              className={`
                py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-[#c04b11] text-white shadow-md border border-[#9b3a0c]"
                    : "bg-[#252f4a] text-slate-300 hover:bg-[#2c3859] border border-transparent"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Display */}
        <div className="bg-white border-2 border-[#252f4a] rounded-lg p-1 text-center shadow-inner">
          <input
            type="text"
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={`TYPE ${activeTab.toUpperCase()}...`}
            className="w-full h-12 bg-transparent text-center text-lg font-black text-[#252f4a] tracking-wider outline-none placeholder:text-slate-300 placeholder:text-sm placeholder:font-bold placeholder:tracking-widest"
          />
        </div>

        {/* Keyboard Container */}
        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 mt-2">
          <TouchKeyboard
            layout={activeTab.includes("No") ? "numeric" : "qwerty"}
            embedded={true}
            hideCloseKey={true}
            onEnter={handleSearch}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => setSearchValue("")}
            disabled={!searchValue}
            tabIndex={-1}
            className="px-8 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleSearch}
            className="px-8 py-3 rounded-xl bg-[#252f4a] text-white font-bold uppercase tracking-widest text-xs shadow-md hover:bg-[#1a2133] transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </Modal>
  );
};
