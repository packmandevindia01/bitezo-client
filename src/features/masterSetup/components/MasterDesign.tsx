import { Pencil, Search, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export interface MasterOption {
  label: string;
  value: string;
}

export interface MasterColumn<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => ReactNode;
}

interface MasterScreenProps<T> {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  listEmptyLabel: string;
  columns: MasterColumn<T>[];
  data: T[];
  rowKey: keyof T;
  children: ReactNode;
}

interface MasterFieldRowProps {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}

interface MasterInputProps {
  value: string | number;
  placeholder?: string;
  type?: "text" | "number";
  readOnly?: boolean;
  onChange: (value: string) => void;
}

interface MasterSelectProps {
  value: string;
  placeholder?: string;
  options: MasterOption[];
  onChange: (value: string) => void;
}

interface MasterColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

interface MasterActionButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick: () => void;
  type?: "button" | "submit" | "reset";
}

interface RowActionButtonsProps<T> {
  row: T;
  label: string;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}

const fieldClassName =
  "h-11 w-full rounded-xl border border-[#a9cd8a] bg-white px-4 text-sm font-medium text-[#47513e] outline-none transition focus:border-[#8fbe67] focus:ring-2 focus:ring-[#cfe8ba]";

export const MasterScreen = <T,>({
  title,
  search,
  onSearchChange,
  listEmptyLabel,
  columns,
  data,
  rowKey,
  children,
}: MasterScreenProps<T>) => {
  return (
    <section className="rounded-[2rem] bg-white px-4 py-6 shadow-sm ring-1 ring-gray-100 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-2xl font-semibold uppercase tracking-wide text-[#3e4335] md:text-4xl">
          {title}
        </h1>

        <div className="mx-auto mt-8 max-w-3xl">{children}</div>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="w-full max-w-[220px] rounded-t-2xl border border-b-0 border-[#a9cd8a] bg-white px-4 py-2">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[#85ab68]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search"
                className="w-full border-none bg-transparent pl-7 text-sm font-medium text-[#47513e] outline-none"
              />
            </label>
          </div>

          <div className="min-h-[280px] overflow-hidden rounded-b-[2rem] rounded-tr-[2rem] border border-[#a9cd8a] bg-white">
            {data.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-lg font-medium uppercase tracking-wide text-[#556148]">
                {listEmptyLabel}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#d7e8c7] bg-[#f9fcf6]">
                      {columns.map((column) => (
                        <th
                          key={String(column.accessor)}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#7d9370]"
                        >
                          {column.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr
                        key={String(row[rowKey])}
                        className="border-b border-[#eef6e5] last:border-b-0 hover:bg-[#fbfef8]"
                      >
                        {columns.map((column) => (
                          <td
                            key={String(column.accessor)}
                            className="px-4 py-3 text-sm font-medium text-[#495342]"
                          >
                            {column.render
                              ? column.render(row)
                              : (row[column.accessor] as ReactNode)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const MasterFieldRow = ({ label, children, action }: MasterFieldRowProps) => {
  const gridClassName = action
    ? "grid gap-3 md:grid-cols-[150px,minmax(0,1fr),auto] md:items-center"
    : "grid gap-3 md:grid-cols-[150px,minmax(0,1fr)] md:items-center";

  return (
    <div className={gridClassName}>
      <label className="text-sm font-semibold uppercase tracking-wide text-[#525b48]">{label}</label>
      {children}
      {action ? <div className="md:w-[110px]">{action}</div> : null}
    </div>
  );
};

export const MasterInput = ({
  value,
  placeholder,
  type = "text",
  readOnly,
  onChange,
}: MasterInputProps) => {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClassName} ${readOnly ? "bg-[#f8fbf3]" : ""}`}
    />
  );
};

export const MasterSelect = ({
  value,
  placeholder = "Select",
  options,
  onChange,
}: MasterSelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClassName}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export const MasterColorInput = ({ value, onChange }: MasterColorInputProps) => {
  return (
    <div className={`${fieldClassName} flex items-center gap-3 px-3`}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-10 cursor-pointer rounded border-none bg-transparent p-0"
      />
      <span className="text-sm font-medium uppercase tracking-wide text-[#5f6a54]">
        {value}
      </span>
    </div>
  );
};

export const MasterActionButton = ({
  children,
  variant = "primary",
  onClick,
  type = "button",
}: MasterActionButtonProps) => {
  const variantClassName =
    variant === "primary"
      ? "border-[#8fbe67] bg-gradient-to-b from-[#c8eca9] to-[#9fce73] text-[#394430]"
      : "border-[#b8d79d] bg-gradient-to-b from-[#eef8e5] to-[#cfe9b8] text-[#536246]";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`h-11 rounded-2xl border px-8 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 ${variantClassName}`}
    >
      {children}
    </button>
  );
};

export const RowActionButtons = <T,>({
  row,
  label,
  onEdit,
  onDelete,
}: RowActionButtonsProps<T>) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="rounded-xl p-2 text-[#6e9154] transition hover:bg-[#eef8e6]"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(row)}
        className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
        aria-label={`Delete ${label}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
