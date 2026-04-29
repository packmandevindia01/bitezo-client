import { useState } from "react";
import { Modal, PageShell, RecordTableCard } from "../../../../components/common";
import ReceiptVoucherForm from "../components/ReceiptVoucherForm";
import type { ReceiptVoucherForm as ReceiptVoucherFormType } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const ReceiptVoucherPage = () => {
  const { formatAmount } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ReceiptVoucherFormType[]>([]);

  const handleSave = (newData: ReceiptVoucherFormType) => {
    setData(prev => [...prev, newData]);
    setOpen(false);
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => val.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageShell title="Receipt Voucher">
       <RecordTableCard
         title="Saved Receipt List"
         search={search}
         onSearchChange={setSearch}
         data={filteredData}
         rowKey="vchNo"
         actionLabel="+ Add Receipt"
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
       <Modal isOpen={open} onClose={() => setOpen(false)} title="Receipt Voucher" size="lg">
          <ReceiptVoucherForm 
            onSubmit={handleSave}
            onCancel={() => setOpen(false)}
          />
       </Modal>
    </PageShell>
  );
}

export default ReceiptVoucherPage;
