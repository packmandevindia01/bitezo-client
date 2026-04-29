import { useState } from "react";
import { Modal, PageShell, RecordTableCard } from "../../../../components/common";
import PaymentVoucherForm from "../components/PaymentVoucherForm";
import type { PaymentVoucherForm as PaymentVoucherFormType } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const PaymentVoucherPage = () => {
  const { formatAmount } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PaymentVoucherFormType[]>([]);

  const handleSave = (newData: PaymentVoucherFormType) => {
    setData(prev => [...prev, newData]);
    setOpen(false);
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => val.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageShell title="Payment Voucher">
       <RecordTableCard
         title="Saved Payment List"
         search={search}
         onSearchChange={setSearch}
         data={filteredData}
         rowKey="vchNo"
         actionLabel="+ Add Payment"
         onAction={() => setOpen(true)}
         columns={[
           { header: "Series", accessor: "series" },
           { header: "Vch No", accessor: "vchNo" },
           { header: "Account", accessor: "account" },
           { 
             header: "Amount", 
             accessor: "amount",
             render: (row) => <span className="font-mono">{formatAmount(row.amount)}</span>
           },
           { header: "Paymode", accessor: "paymode" },
           { header: "Narration", accessor: "narration" },
         ]}
       />
       <Modal isOpen={open} onClose={() => setOpen(false)} title="Payment Voucher" size="lg">
          <PaymentVoucherForm 
            onSubmit={handleSave}
            onCancel={() => setOpen(false)}
          />
       </Modal>
    </PageShell>
  );
}

export default PaymentVoucherPage;
