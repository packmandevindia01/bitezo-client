import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard } from "../../../../components/common";
import type { CustomerRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const initialCustomers: CustomerRecord[] = [
  {
    id: 1,
    customerId: "CUST-001",
    custName: "Al Noor Foods",
    custMob: "+973 36001234",
    country: "Bahrain",
    branchCount: 3,
  },
  {
    id: 2,
    customerId: "CUST-002",
    custName: "Spice Route Cafe",
    custMob: "+971 501234567",
    country: "UAE",
    branchCount: 2,
  },
];

const CustomerListPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");

  const canAdd = hasPermission("Customer Master", "Add");
  const canEdit = hasPermission("Customer Master", "Edit");
  const canDelete = hasPermission("Customer Master", "Delete");

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((item) =>
      [item.customerId, item.custName, item.custMob, item.country].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [customers, search]);

  const handleDelete = (id: number) => {
    if (!canDelete) return;
    setCustomers((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <PageShell title="Customer Registration"  >
      <RecordTableCard
        title="Saved Customer List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredCustomers}
        actionLabel={canAdd ? "+ Add Customer" : undefined}
        onAction={canAdd ? () => navigate("/dashboard/customers/new") : undefined}
        columns={[
          { header: "Customer ID", accessor: "customerId" },
          { header: "Customer Name", accessor: "custName" },
          { header: "Mobile", accessor: "custMob" },
          { header: "Country", accessor: "country" },
          { header: "Branches", accessor: "branchCount" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/customers/new")}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </PageShell>
  );
};

export default CustomerListPage;

