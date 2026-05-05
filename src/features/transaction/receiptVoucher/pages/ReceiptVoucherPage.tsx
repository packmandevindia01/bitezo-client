import { useState, useEffect } from "react";
import { Modal, PageShell, RecordTableCard } from "../../../../components/common";
import ReceiptVoucherForm from "../components/ReceiptVoucherForm";
import type { ReceiptVoucherForm as ReceiptVoucherFormType } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const STORAGE_KEY = "bitezo_receipt_vouchers";

const ReceiptVoucherPage = () => {
  const { formatAmount } = useCurrency();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ReceiptVoucherFormType[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleSave = (newData: ReceiptVoucherFormType) => {
    setData(prev => [newData, ...prev]);
    setOpen(false);
  };

  const filteredData = data.filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageShell title="Receipt Voucher">
       <RecordTableCard
         title="Saved Receipt List"
         search={search}
         onSearchChange={setSearch}
         data={filteredData}
         rowKey={(row) => `${row.vchNo}-${row.series}`}
         actionLabel="+ Add Receipt"
         onAction={() => setOpen(true)}
         autoFocusSearch
         columns={[
           { 
             header: "Series", 
             accessor: "series",
             render: (row) => <span className="font-bold text-gray-700">{row.series}</span>
           },
           { 
             header: "Vch No", 
             accessor: "vchNo",
             render: (row) => <span className="text-xs font-bold text-gray-400 uppercase">{row.vchNo}</span>
           },
           { 
             header: "Account", 
             accessor: "account",
             render: (row) => <span className="font-medium text-gray-600">{row.account}</span>
           },
           { 
             header: "Amount", 
             accessor: "amount",
             render: (row) => <span className="font-black text-emerald-600">{formatAmount(Number(row.amount))}</span>
           },
           { 
             header: "Paymode", 
             accessor: "paymode",
             render: (row) => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">{row.paymode}</span>
           },
           { header: "Narration", accessor: "narration" },
         ]}
       />
       <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Receipt Voucher" size="lg">
          <div className="p-1">
            <ReceiptVoucherForm 
              onSubmit={handleSave}
              onCancel={() => setOpen(false)}
            />
          </div>
       </Modal>
    </PageShell>
  );
}

export default ReceiptVoucherPage;
