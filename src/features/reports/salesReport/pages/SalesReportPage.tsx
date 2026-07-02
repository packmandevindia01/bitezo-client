import { useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { PageShell, FormInput, Button, SearchBar, RecordTableCard } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import SelectInput from "../../../../components/common/SelectInput";
import { useSalesReport } from "../hooks/useSalesReport";
import { exportSalesReportPDF, exportSalesReportExcel } from "../utils/exportUtils";
import { formatCurrency, formatAmount } from "../../../../utils/currency";

const SalesReportPage = () => {
  const { filters, masterData, report } = useSalesReport();

  const branchOptions = useMemo(() => [
    { label: "All Branches", value: "0" },
    ...masterData.branches.map(b => ({ label: b.branchName, value: String(b.branchId) }))
  ], [masterData.branches]);

  const customerOptions = useMemo(() => [
    { label: "All Customers", value: "0" },
    ...masterData.customers.map((c: any) => ({ label: c.customerName, value: String(c.customerId) }))
  ], [masterData.customers]);

  const paymodeOptions = useMemo(() => [
    { label: "All Paymodes", value: "0" },
    ...masterData.paymodes.map(p => ({ label: p.paymodeName, value: String(p.paymodeId) }))
  ], [masterData.paymodes]);

  const handleExportPDF = () => {
    const branchName = branchOptions.find(o => o.value === filters.branchId)?.label;
    const customerName = customerOptions.find(o => o.value === filters.customerId)?.label;
    const paymodeName = paymodeOptions.find(o => o.value === filters.paymodeId)?.label;
    
    exportSalesReportPDF(
      report.salesData,
      report.paymodeData,
      report.totalData,
      { ...filters, branchName, customerName, paymodeName }
    );
  };

  const handleExportExcel = () => {
    const branchName = branchOptions.find(o => o.value === filters.branchId)?.label;
    const customerName = customerOptions.find(o => o.value === filters.customerId)?.label;
    const paymodeName = paymodeOptions.find(o => o.value === filters.paymodeId)?.label;
    
    exportSalesReportExcel(
      report.salesData,
      report.paymodeData,
      report.totalData,
      { ...filters, branchName, customerName, paymodeName }
    );
  };

  // Define Columns for the Table
  const columns = [
    { header: "S.No", accessor: "sNo" },
    { 
      header: "Invoice Date", 
      accessor: "invoiceDate",
      render: (row: any) => row.invoiceDate ? row.invoiceDate.split("T")[0] : ""
    },
    { header: "Invoice No", accessor: "invoiceNo" },
    { header: "Customer", accessor: "customerName" },
    { header: "Paymode", accessor: "paymode" },
    { 
      header: "Net Value", 
      accessor: "netValue", 
      render: (row: any) => <div className="text-right">{formatAmount(Number(row.netValue))}</div>
    },
    { 
      header: "VAT Amt", 
      accessor: "vatAmount",
      render: (row: any) => <div className="text-right">{formatAmount(Number(row.vatAmount))}</div>
    },
    { 
      header: "Net Amt", 
      accessor: "netAmount",
      render: (row: any) => <div className="text-right font-bold">{formatCurrency(Number(row.netAmount))}</div>
    },
  ];

  return (
    <PageShell title="Sales Report">
      {/* FILTER HEADER (Rule: Next-Gen Architecture & Master Data Headers) */}
      <div className="flex flex-col xl:flex-row gap-4 mb-4 justify-between items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <div className="w-36">
            <FormInput 
              id="sr-from-date"
              label="From Date" 
              type="date" 
              value={filters.fromDate}
              onChange={(e) => filters.setFromDate(e.target.value)}
            />
          </div>
          <div className="w-36">
            <FormInput 
              id="sr-to-date"
              label="To Date" 
              type="date" 
              value={filters.toDate}
              onChange={(e) => filters.setToDate(e.target.value)}
            />
          </div>
          <div className="w-48">
            <SearchableSelect 
              id="sr-branch"
              label="Branch" 
              options={branchOptions}
              value={filters.branchId}
              onChange={filters.setBranchId}
            />
          </div>
          <div className="w-56">
            <SearchableSelect 
              id="sr-customer"
              label="Customer" 
              options={customerOptions}
              value={filters.customerId}
              onChange={filters.setCustomerId}
            />
          </div>
          <div className="w-40">
            <SelectInput 
              id="sr-paymode"
              label="Paymode" 
              options={paymodeOptions}
              value={filters.paymodeId}
              onChange={(e) => filters.setPaymodeId(e.target.value)}
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <SearchBar 
              value={filters.searchTerm}
              onChange={filters.setSearchTerm}
              placeholder="Search invoice, customer..."
            />
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button 
            variant="secondary" 
            icon={<FileText size={18} />} 
            onClick={handleExportPDF}
            disabled={report.isLoading || report.salesData.length === 0}
          >
            PDF
          </Button>
          <Button 
            icon={<Download size={18} />} 
            onClick={handleExportExcel}
            disabled={report.isLoading || report.salesData.length === 0}
          >
            Excel
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <RecordTableCard 
        title=""
        data={report.salesData}
        columns={columns as any}
        rowKey="sNo"
        loading={report.isLoading}
      />

      {/* SUMMARY SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Paymode Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Paymode Summary</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Paymode</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.paymodeData.length === 0 && (
                <tr><td colSpan={2} className="py-4 text-center text-gray-400">No data</td></tr>
              )}
              {report.paymodeData.map(p => (
                <tr key={p.paymodeId} className="border-b border-gray-50">
                  <td className="py-2">{p.paymodeName}</td>
                  <td className="py-2 text-right font-semibold">{formatAmount(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand Totals */}
        <div className="bg-white rounded-xl border border-[#49293e]/20 shadow-sm p-4 bg-gradient-to-br from-white to-[#49293e]/5">
          <h3 className="text-sm font-bold text-[#49293e] uppercase tracking-wider mb-3">Grand Totals</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Net Value</span>
              <span className="font-semibold text-gray-800">{formatAmount(report.totalData?.netValue || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total VAT Amount</span>
              <span className="font-semibold text-gray-800">{formatAmount(report.totalData?.vatAmount || 0)}</span>
            </div>
            <div className="pt-3 mt-1 border-t border-[#49293e]/20 flex justify-between items-center">
              <span className="text-base font-bold text-[#49293e]">Net Amount</span>
              <span className="text-2xl font-bold text-[#49293e]">{formatCurrency(report.totalData?.netAmount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default SalesReportPage;
