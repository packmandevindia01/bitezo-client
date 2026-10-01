import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../../../../../../components/common";
import { TouchKeyboard } from "../../../../../../components/common/TouchKeyboard";

interface PosRecallSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (searchValue: string, searchStatus: string) => void;
  initialSearchStatus?: string;
  initialSearchValue?: string;
}

const SEARCH_TABS = [
  { id: "ORDER NO", label: "ORDER NO" },
  { id: "TICKET NO", label: "TICKET NO" },
  { id: "CUSTOMER", label: "CUSTOMER" },
  { id: "VEHICLE NO", label: "VEHICLE NO" },
  { id: "MOBILE NO", label: "MOBILE NO" },
];

export const PosRecallSearchModal: React.FC<PosRecallSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  initialSearchStatus = "ORDER NO",
  initialSearchValue = "",
}) => {
  const [activeTab, setActiveTab] = useState(initialSearchStatus);
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state and ensure input focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialSearchStatus);
      setSearchValue(initialSearchValue);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSearchStatus, initialSearchValue]);

  const handleSearch = () => {
    onSearch(searchValue, activeTab);
    onClose();
  };

  const handleInput = (char: string) => {
    setSearchValue((prev) => prev + char);
  };

  const handleBackspace = () => {
    setSearchValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSearchValue("");
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
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchValue("");
                inputRef.current?.focus();
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
            ref={inputRef}
            type="text"
            autoFocus
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={`TYPE ${activeTab.toUpperCase()}...`}
            className="w-full h-12 bg-transparent text-center text-lg font-black text-[#252f4a] tracking-wider outline-none placeholder:text-slate-300 placeholder:text-sm placeholder:font-bold placeholder:tracking-widest"
          />
        </div>

        {/* Keyboard Container */}
        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 mt-2">
          <TouchKeyboard
            layout={activeTab.toUpperCase().includes("NO") ? "numeric" : "qwerty"}
            embedded={true}
            hideCloseKey={true}
            onInput={handleInput}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onEnter={handleSearch}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!searchValue}
            tabIndex={-1}
            className="px-8 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
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
