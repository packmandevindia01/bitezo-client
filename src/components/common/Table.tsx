import React from "react";
import EmptyState from "./EmptyState";
import Loader from "./Loader";
import Pagination from "./Pagination";

/* ✅ EXPORT TYPE */
export interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: keyof T;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

const Table = <T,>({
  columns,
  data,
  loading,
  rowKey,
  pagination,
}: TableProps<T>) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4">

      {/* LOADER */}
      {loading ? (
        <div className="py-10">
          <Loader />
        </div>
      ) : data.length === 0 ? (
        /* EMPTY STATE */
        <EmptyState />
      ) : (
        <>
          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="min-w-150 w-full text-sm md:text-base text-left border-collapse">

              {/* HEADER */}
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  {columns.map((col, index) => (
                    <th key={index} className="px-4 py-2 font-medium">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr
                    key={
                      rowKey
                        ? String(row[rowKey])
                        : rowIndex
                    }
                    className="border-b hover:bg-gray-50 transition"
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-4 py-2">
                        {col.render
                          ? col.render(row)
                          : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

          {/* PAGINATION */}
          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.onPageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Table;