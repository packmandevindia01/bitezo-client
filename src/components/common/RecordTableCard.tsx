import Button from "./Button";
import SearchBar from "./SearchBar";
import Table from "./Table";

interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
}

interface RecordTableCardProps<T> {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  actionLabel?: string;
  onAction?: () => void;
}

const RecordTableCard = <T,>({
  title,
  search,
  onSearchChange,
  columns,
  data,
  rowKey,
  actionLabel,
  onAction,
}: RecordTableCardProps<T>) => {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
            Saved Records
          </p>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>

        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
          <div className="w-full md:w-72">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={`Search ${title.toLowerCase()}`}
            />
          </div>

          {actionLabel && onAction && (
            <Button onClick={onAction} className="w-full md:w-auto">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>

      <Table columns={columns} data={data} rowKey={rowKey} />
    </section>
  );
};

export default RecordTableCard;
