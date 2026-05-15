import React from "react";
import EmptyState from "./EmptyState";
import Loader from "./Loader";
import Pagination from "./Pagination";

export interface Column<T> {
  header: React.ReactNode;
  accessor: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: keyof T | ((row: T) => string | number);
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  rowClassName?: (row: T, index: number) => string;
}

const Table = <T,>({
  columns,
  data,
  loading,
  rowKey,
  pagination,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
}: TableProps<T>) => {
  return (
    <div className="overflow-hidden rounded-xl bg-white border border-gray-200">

      {loading ? (
        <div className="py-10">
          <Loader />
        </div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-full border-collapse text-left text-sm">

              {/* HEADER */}
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      className={`
                        px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap md:px-4
                        ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                        ${index === 0 ? "pl-[18px] md:pl-[22px]" : ""} 
                      `}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY */}
              <tbody className="divide-y divide-gray-100">
                {data.map((row, rowIndex) => {
                  const key = typeof rowKey === "function" 
                    ? rowKey(row) 
                    : rowKey 
                      ? String(row[rowKey]) 
                      : rowIndex;
                  
                  return (
                    <tr
                      key={key}
                      data-row-key={String(key)}
                      tabIndex={-1}
                      onClick={() => onRowClick?.(row)}
                      onDoubleClick={() => onRowDoubleClick?.(row)}
                      className={`group outline-none transition-colors duration-150 ${rowClassName?.(row, rowIndex) ?? ""} ${
                        onRowClick || onRowDoubleClick 
                          ? 'cursor-pointer hover:bg-[#49293e]/5' 
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {columns.map((col, colIndex) => (
                        <td
                          key={colIndex}
                        className={`
                          px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap md:px-4
                          ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}
                          ${colIndex === 0
                            ? "font-medium text-gray-900 border-l-[3px] border-l-[#49293e] group-hover:border-l-[#6b3d5a]"
                            : ""}
                        `}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

          {/* PAGINATION */}
          {pagination && (
            <div className="border-t border-gray-100 px-4 py-3 md:px-5">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Table;
