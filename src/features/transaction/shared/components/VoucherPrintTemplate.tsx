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
  paperSize?: "A4" | "80mm";
}

export const VoucherPrintTemplate: React.FC<VoucherPrintTemplateProps> = ({ data, paperSize = "A4" }) => {
  const isReceipt = data.voucherType === "RECEIPT";

  if (paperSize === "80mm") {
    return (
      <div id="print-template" className="w-[300px] bg-white text-black font-sans mx-auto text-xs px-4 py-2">
        {/* 80mm Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold uppercase tracking-wide leading-tight mb-1">{data.companyName || "AL ASRIYA ADVANCED TRADING LLC"}</h1>
          <p className="text-[11px] text-gray-800">{data.companyAddress || "SULTANATE OF OMAN"}</p>
          <p className="text-[11px] text-gray-800">M: {data.companyMobile || "94661313"} | P: {data.companyPhone || ""}</p>
        </div>

        <div className="text-center mb-4 border-y border-black border-dashed py-1">
          <h2 className="font-extrabold uppercase tracking-widest text-sm">{isReceipt ? "Receipt" : "Payment Voucher"}</h2>
        </div>

        <div className="mb-3 text-[11px]">
          <div className="flex justify-between"><span className="font-semibold text-gray-600">Voucher No:</span> <span className="font-bold">{data.voucherNo}</span></div>
          <div className="flex justify-between"><span className="font-semibold text-gray-600">Date:</span> <span className="font-bold">{data.date}</span></div>
          <div className="flex justify-between"><span className="font-semibold text-gray-600">Type:</span> <span className="font-bold">{data.paymentType || (isReceipt ? "CASH RECEIPT" : "CASH PAYMENT")}</span></div>
        </div>

        <div className="border-t border-black border-dashed py-3 mb-2">
          <div className="mb-3">
            <div className="text-gray-600 mb-0.5 font-semibold text-[11px]">{isReceipt || data.voucherType === "PAYMENT AGAINST" ? "Received from:" : "Paid to:"}</div>
            <div className="font-bold text-sm uppercase">{data.partyName}</div>
          </div>
          <div className="flex justify-between items-center font-bold text-lg mt-3 bg-gray-50 py-1 rounded">
            <span>Amount:</span>
            <span>{getCurrencySymbol()} {formatAmount(data.amount || 0)}</span>
          </div>
          <div className="mt-2 text-[11px] leading-tight italic text-gray-700">
            {data.amountInWords}
          </div>
          {data.narration && (
            <div className="mt-3 text-[11px] break-all">
              <span className="font-semibold text-gray-600">Narration:</span> {data.narration}
            </div>
          )}
        </div>

        {data.receiptDetails && data.receiptDetails.length > 0 && (
          <div className="mt-3 border-t border-black border-dashed pt-2">
            <div className="text-center mb-2 font-bold uppercase text-[11px] tracking-wider">Invoice Details</div>
            <table className="w-full text-left text-[10px] mb-2 border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1 font-semibold text-gray-600">Inv#</th>
                  <th className="py-1 font-semibold text-gray-600">Date</th>
                  <th className="py-1 text-right font-semibold text-gray-600">Rcvd</th>
                </tr>
              </thead>
              <tbody>
                {data.receiptDetails.map((detail, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5">{detail.invoiceNo}</td>
                    <td className="py-1.5">{detail.invoiceDate}</td>
                    <td className="py-1.5 text-right font-bold">{formatAmount(detail.receivedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-black border-dashed pt-2 mt-1 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-gray-600">Total:</span>
                <span className="font-bold">{formatAmount(data.amount || 0)}</span>
              </div>
              {!!data.discount && (
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-gray-600">Discount:</span>
                  <span className="font-bold">{formatAmount(data.discount)}</span>
                </div>
              )}
              {!!data.discount && (
                <div className="flex justify-between font-bold text-sm pt-1 mt-1 border-t border-gray-300">
                  <span>Net:</span>
                  <span>{formatAmount(data.netAmount ?? (data.amount || 0) - (data.discount || 0))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-6 pt-3 border-t border-black border-dashed text-[11px] font-semibold text-gray-600">
          <p>*** Thank You ***</p>
        </div>
      </div>
    );
  }

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
            <span className="mr-2">:</span>
            <span>{data.voucherNo}</span>
          </div>
          <div className="flex">
            <span className="w-24">Date</span>
            <span className="mr-2">:</span>
            <span>{data.date}</span>
          </div>
        </div>
        <div className="flex">
          <span className="w-16">TYPE</span>
          <span className="mr-2">:</span>
          <span>{data.paymentType || (isReceipt ? "CASH RECEIPT" : "CASH PAYMENT")}</span>
        </div>
      </div>

      {/* MAIN BODY SECTION (Inside dotted border) */}
      <div className="border border-dashed border-black p-4 text-sm relative min-h-[160px]">
        <div className="mb-4">
          <div className="flex mb-2">
            <span className="w-32">{isReceipt || data.voucherType === "PAYMENT AGAINST" ? "Received from" : "Paid to"}</span>
            <span className="mr-2">:</span>
            <span className="flex-1">{data.partyName}</span>
          </div>
          <div className="flex">
            <span className="w-32">Amount</span>
            <span className="mr-2">:</span>
            <span className="font-bold flex-1">{getCurrencySymbol()} {formatAmount(data.amount || 0)}</span>
          </div>
        </div>
        
        <div className="flex mb-8">
          <span className="w-32">In Words</span>
          <span className="mr-2">:</span>
          <span className="flex-1">{data.amountInWords}</span>
        </div>

        <div className="flex mb-2">
          <span className="w-32 flex-shrink-0">Narration</span>
          <span className="mr-2">:</span>
          <span className="flex-1 break-all">{data.narration || "-"}</span>
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
