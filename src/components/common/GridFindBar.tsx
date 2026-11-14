import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
import type { GridFind } from "../../hooks/useGridFind";

interface Props {
  find: GridFind;
  /** id of the text box (tests / focus). */
  id: string;
  className?: string;
}

/**
 * "Find product in list" box above a line grid (same as Provider Settings): highlights matching rows,
 * shows "n of N"; Enter / ▼ next, Shift+Enter / ▲ previous (wraps), Esc / × clears.
 */
const GridFindBar = ({ find, id, className = "" }: Props) => {
  const { query, setQuery, matchCount, position, goTo } = find;
  return (
    <div className={`flex-none flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white ${className}`}>
      <div className="relative flex-1 max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              goTo(e.shiftKey ? -1 : 1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setQuery("");
            }
          }}
          placeholder="Find product in list (name, alt name or code)..."
          aria-label="Find product in list"
          className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-gray-200 hover:border-gray-300 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] rounded-md outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Clear search (Esc)"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {query.trim() && (
        <>
          <span
            data-testid={`${id}-count`}
            className={`text-[11px] font-semibold whitespace-nowrap ${matchCount ? "text-gray-600" : "text-red-500"}`}
          >
            {matchCount ? `${position + 1} of ${matchCount}` : "No match"}
          </span>
          <button
            type="button"
            onClick={() => goTo(-1)}
            disabled={matchCount < 2}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#49293e] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            disabled={matchCount < 2}
            className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#49293e] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <ChevronDown size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default GridFindBar;
