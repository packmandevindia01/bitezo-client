import { useState, useRef } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SectionDropZone } from "../../../../components/common";
import type { LineItem } from "../types";
import PreviewLine from "./preview/PreviewLine";
import ReceiptSampleBody from "./preview/ReceiptSampleBody";

interface Props {
  branchName: string;
  allLines: LineItem[];
  activeTab: "kot" | "end";
  onOffsetChange: (id: string, offset: number) => void;
}

/** Width the POS renders a receipt at (qzService: 288px × 2 = the printer's 576 dots). */
const RECEIPT_WIDTH_PX = 288;

const ReceiptPreview = ({ branchName, allLines, activeTab, onOffsetChange }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);

  const headers = allLines.filter((l) => (activeTab === "kot" ? l.section === "header" : l.section === "dayEndHeader") && l.value);
  const footers = activeTab === "kot" ? allLines.filter((l) => l.section === "footer" && l.value) : [];

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
        className="box-content bg-white border border-dashed border-gray-300 rounded-lg font-mono text-xs mx-auto"
        style={{ width: RECEIPT_WIDTH_PX }}
        onClick={() => setSelectedId(null)}
      >
        {/* The end report shows the branch name; the bill prints only the lines below. */}
        {activeTab === "end" && (branchName ? (
          <p className="font-bold text-center text-sm mb-2">{branchName}</p>
        ) : (
          <p className="text-gray-300 text-center text-[10px] mb-2">Branch name here</p>
        ))}

        {/* Dynamic Header Zone: same side space as the printed bill */}
        <div className="px-3 mb-2.5">
        <SectionDropZone
          id="preview-zone-header"
          isEmpty={headers.length === 0}
          emptyMessage="Header lines appear here"
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
        </div>

        {/* The real bill body */}
        {activeTab === "kot" ? <ReceiptSampleBody /> : (
          <div className="py-4 my-2 border-y border-dashed border-gray-200 text-center text-gray-400">
            [End Report Data]
          </div>
        )}

        {/* Dynamic Footer Zone */}
        <div className="px-3 mt-2.5 mb-2">
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
    </div>
  );
};

export default ReceiptPreview;
