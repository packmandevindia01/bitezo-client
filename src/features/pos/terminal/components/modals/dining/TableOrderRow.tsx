/** One order on the Dine-In table screen: the Recall list text, Printed badge and a PRINT button (guest bill). */
import React from "react";
import { Printer } from "lucide-react";

export const TableOrderRow: React.FC<{
  text: string;
  isSelected: boolean;
  isPrinted: boolean;
  /** Row click / Enter: open the Recall preview. */
  onOpen: () => void;
  /** PRINT: guest bill of this order. */
  onPrint: () => void;
}> = ({ text, isSelected, isPrinted, onOpen, onPrint }) => (
              <div
                    role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
                className={`
                  flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
                  hover:border-[#f48120]/30 hover:shadow-md transition-all group
                  ${isSelected ? "ring-2 ring-[#f48120] shadow-lg translate-x-1" : ""}
                `}
              >
                <div className={`
                  flex-1 min-w-0 p-4 flex flex-col justify-center gap-1.5 transition-colors
                  ${isSelected ? "bg-[#f48120] text-white" : "group-hover:bg-gray-50"}
                `}>
                  {isPrinted && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${isSelected ? "bg-white/20" : "bg-green-100"}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? "text-white" : "text-green-700"}`}>
                          Printed
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#f48120]"}`} />
                    <p className={`text-sm font-bold leading-snug italic break-words [overflow-wrap:anywhere] [word-break:break-word] min-w-0 ${isSelected ? "text-white" : "text-gray-800"}`}>
                      "{text}"
                    </p>
                  </div>
                </div>
            
                {/* Print (guest receipt) — same position and colours as the Recall list */}
                <div className="w-[100px] shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrint();
                    }}
                    className={`
                      w-full h-full flex flex-col items-center justify-center gap-1 transition-all text-white
                      ${isPrinted ? "bg-[#3e4d22] hover:bg-[#34411c]" : "bg-[#556b2f] hover:bg-[#4a5d29]"}
                    `}
                  >
                    <Printer size={18} strokeWidth={3} />
                    <div className="font-black text-[10px] uppercase tracking-widest">Print</div>
                  </button>
                </div>
              </div>
);
