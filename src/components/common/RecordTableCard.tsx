import Button from "./Button";
import SearchBar from "./SearchBar";
import Table from "./Table";

interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  align?: string;
}

interface RecordTableCardProps<T> {
  title: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  loading?: boolean;
  autoFocusSearch?: boolean;
  extraActions?: React.ReactNode;
}

const RecordTableCard = <T,>({
  title,
  search,
  onSearchChange,
  columns,
  data,
  rowKey,
  actionLabel,
  actionIcon,
  onAction,
  loading = false,
  autoFocusSearch,
  extraActions,
}: RecordTableCardProps<T>) => {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm md:p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Saved Records ({data.length})
          </p>
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          {onSearchChange && (
            <div className="w-full md:w-72">
              <SearchBar
                value={search || ""}
                onChange={onSearchChange}
                placeholder={`Search ${title.toLowerCase()}`}
                autoFocus={autoFocusSearch}
              />
            </div>
          )}

          {extraActions && (
            <div className="w-full md:w-auto">
              {extraActions}
            </div>
          )}

          {actionLabel && onAction && (
            <Button onClick={onAction} className="w-full md:w-auto" isAction icon={actionIcon}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>

      <Table columns={columns} data={data} rowKey={rowKey} loading={loading} />
    </section>
  );
};

export default RecordTableCard;
