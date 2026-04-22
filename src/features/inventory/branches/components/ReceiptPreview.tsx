import { useState, useRef } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SectionDropZone } from "../../../../components/common";
import type { LineItem } from "../types";
import PreviewLine from "./preview/PreviewLine";
import ReceiptDummyBody from "./preview/ReceiptDummyBody";

interface Props {
  branchName: string;
  allLines: LineItem[];
  onOffsetChange: (id: string, offset: number) => void;
}

const ReceiptPreview = ({ branchName, allLines, onOffsetChange }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);

  const headers = allLines.filter((l) => l.section === "header" && l.value);
  const footers = allLines.filter((l) => l.section === "footer" && l.value);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Live Preview
        </p>
        <p className="text-[10px] text-gray-300">drag ↔ to position</p>
      </div>

      <div
        ref={containerRef}
        className="bg-white border border-dashed border-gray-300 rounded-lg p-4 font-mono text-xs"
        onClick={() => setSelectedId(null)}
      >
        {/* Branch identity section */}
        {branchName ? (
          <p className="font-bold text-center text-sm mb-2">{branchName}</p>
        ) : (
          <p className="text-gray-300 text-center text-[10px] mb-2">Branch name here</p>
        )}

        {/* Dynamic Header Zone */}
        <SectionDropZone
          id="preview-zone-header"
          isEmpty={headers.length === 0}
          emptyMessage="Header lines appear here"
          className="mb-1"
        >
          <SortableContext
            items={headers.map((l) => `preview-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {headers.map((line) => (
              <PreviewLine
                key={line.id}
                item={line}
                onOffsetChange={onOffsetChange}
                selectedId={selectedId}
                onSelect={setSelectedId}
                containerRef={containerRef}
              />
            ))}
          </SortableContext>
        </SectionDropZone>

        {/* POS Simulation Body */}
        <ReceiptDummyBody />

        {/* Dynamic Footer Zone */}
        <SectionDropZone
          id="preview-zone-footer"
          isEmpty={footers.length === 0}
          emptyMessage="Footer lines appear here"
        >
          <SortableContext
            items={footers.map((l) => `preview-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {footers.map((line) => (
              <PreviewLine
                key={line.id}
                item={line}
                onOffsetChange={onOffsetChange}
                selectedId={selectedId}
                onSelect={setSelectedId}
                containerRef={containerRef}
              />
            ))}
          </SortableContext>
        </SectionDropZone>
      </div>
    </div>
  );
};

export default ReceiptPreview;
