import React from "react";
import { formatAmount } from "../../../../utils/formatters";
import { getCurrencySymbol } from "../../../../utils/currency";

export interface VoucherPrintData {
  voucherType: "RECEIPT" | "PAYMENT" | "PAYMENT AGAINST";
  companyName: string;
  companyAddress: string;
  companyMobile: string;
  companyPhone: string;
  voucherNo: string;
  date: string;
  paymentType: string;
  partyName: string; // Received from / Paid to
  amount: number;
  amountInWords: string;
  narration: string;
  discount?: number;
  netAmount?: number;
  receiptDetails?: {
    sNo: number;
    voucherType: string;
    invoiceNo: string;
    invoiceDate: string;
    invoiceAmount: number;
    receivedAmount: number;
  }[];
}

interface VoucherPrintTemplateProps {
  data: Partial<VoucherPrintData>;
}

export const VoucherPrintTemplate: React.FC<VoucherPrintTemplateProps> = ({ data }) => {
  const isReceipt = data.voucherType === "RECEIPT";

  return (
    <div id="print-template" className="w-full bg-white text-black p-8 font-sans mx-auto" style={{ maxWidth: '800px' }}>
      {/* HEADER SECTION */}
      <div className="text-center mb-6">
        <div className="border border-yellow-700 rounded-lg p-2 mb-2">
          <h1 className="text-2xl font-bold text-[#49293e]" style={{ color: '#000' }}>
            {data.companyName || "AL ASRIYA ADVANCED TRADING LLC"}
          </h1>
        </div>
        <p className="font-bold text-sm">{data.companyAddress || "SULTANATE OF OMAN"}</p>
        <p className="font-bold text-sm mt-2">
          Mobile : {data.companyMobile || "94661313"} &nbsp;&nbsp;&nbsp; Phone : {data.companyPhone || ""}
        </p>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl font-bold underline underline-offset-4">
          {isReceipt ? "Receipt" : "Payment"}
        </h2>
      </div>

      {/* VOUCHER DETAILS SECTION */}
      <div className="flex justify-between items-end mb-4 font-bold text-sm">
        <div>
          <div className="flex mb-1">
            <span className="w-24">Voucher No</span>
            <span>: &nbsp; {data.voucherNo}</span>
          </div>
          <div className="flex">
            <span className="w-24">Date</span>
            <span>: &nbsp; {data.date}</span>
          </div>
        </div>
        <div className="flex">
          <span className="w-16">TYPE</span>
          <span>: &nbsp; {data.paymentType || (isReceipt ? "CASH RECEIPT" : "CASH PAYMENT")}</span>
        </div>
      </div>

      {/* MAIN BODY SECTION (Inside dotted border) */}
      <div className="border border-dashed border-black p-4 text-sm relative min-h-[160px]">
        <div className="flex justify-between mb-4">
          <div className="flex flex-1">
            <span className="w-32">{isReceipt || data.voucherType === "PAYMENT AGAINST" ? "Received from" : "Paid to"}</span>
            <span className="flex-1">: &nbsp; {data.partyName}</span>
          </div>
          <div className="flex items-center ml-4">
            <span className="w-20">Amount</span>
            <span className="font-bold">: &nbsp; {getCurrencySymbol()} {formatAmount(data.amount || 0)}</span>
          </div>
        </div>
        
        <div className="flex mb-8">
          <span className="w-32">In Words</span>
          <span className="flex-1">: &nbsp; {data.amountInWords}</span>
        </div>

        <div className="flex mb-2">
          <span className="w-32">Narration</span>
          <span className="flex-1">: &nbsp; {data.narration || "-"}</span>
        </div>
      </div>

      {/* RECEIPT DETAILS SECTION (Optional) */}
      {data.receiptDetails && data.receiptDetails.length > 0 && (
        <div className="mt-8">
          <div className="text-center mb-2">
            <h3 className="font-bold underline underline-offset-4 text-sm uppercase">Receipt Details</h3>
          </div>
          <table className="w-full text-center border-collapse text-sm border border-black">
            <thead>
              <tr className="border-b border-black">
                <th className="border-r border-black py-1">Sl No</th>
                <th className="border-r border-black py-1">Vch Type</th>
                <th className="border-r border-black py-1">Invoice No</th>
                <th className="border-r border-black py-1">Invoice Date</th>
                <th className="border-r border-black py-1 text-right pr-2">Invoice Amount</th>
                <th className="py-1 text-right pr-2">Received Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.receiptDetails.map((detail, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="border-r border-black py-1">{detail.sNo}</td>
                  <td className="border-r border-black py-1">{detail.voucherType}</td>
                  <td className="border-r border-black py-1">{detail.invoiceNo}</td>
                  <td className="border-r border-black py-1">{detail.invoiceDate}</td>
                  <td className="border-r border-black py-1 text-right pr-2">{formatAmount(detail.invoiceAmount)}</td>
                  <td className="py-1 text-right pr-2">{formatAmount(detail.receivedAmount)}</td>
                </tr>
              ))}
              {/* FOOTER TOTALS */}
              <tr className="border-b border-black">
                <td colSpan={4} className="border-r border-black py-1"></td>
                <td className="border-r border-black py-1 text-right font-bold pr-2">Total</td>
                <td className="py-1 text-right font-bold pr-2">{formatAmount(data.amount || 0)}</td>
              </tr>
              <tr className="border-b border-black">
                <td colSpan={4} className="border-r border-black py-1"></td>
                <td className="border-r border-black py-1 text-right font-bold pr-2">Discount</td>
                <td className="py-1 text-right font-bold pr-2">{formatAmount(data.discount || 0)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="border-r border-black py-1"></td>
                <td className="border-r border-black py-1 text-right font-bold pr-2">Net Amount</td>
                <td className="py-1 text-right font-bold pr-2">{getCurrencySymbol()} {formatAmount(data.netAmount ?? (data.amount || 0) - (data.discount || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
