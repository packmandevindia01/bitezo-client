import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageShell, RecordTableCard } from "../../../components/common";
import type { CustomerRecord } from "../types";

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
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");

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
    setCustomers((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <PageShell
      title="Customer Registration"
      description="Customers now have their own feature folder and keep the same list-first experience. Because the form is longer, add and edit open the dedicated full-page form."
    >
      <RecordTableCard
        title="Saved Customer List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredCustomers}
        actionLabel="+ Add Customer"
        onAction={() => navigate("/dashboard/customers/new")}
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
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/customers/new")}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />
    </PageShell>
  );
};

export default CustomerListPage;
