import { forwardRef } from "react";
import { formatAmount } from "../../../../utils/formatters";
import { numberToWords } from "../../../../utils/numberToWords";

export interface PurchasePrintData {
  companyName: string;
  companyAddress: string;
  companyTrn: string;
  
  docTitle: string; // "PURCHASE INVOICE" or "Purchase Return"
  
  supplierName: string;
  supplierAddress: string;
  supplierTrn: string;
  
  voucherNo: string;
  purchaseNo: string; // PRT No. for return
  date: string;
  paymode: string;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  totals: {
    total: number;
    discount: number;
    adjustmentAmount: number; // or Net Value for return
    roundOff: number;
    vat: number;
    grandTotal: number;
  };
  
  taxSummary: {
    taxCode: string;
    taxable: number;
    vatAmount: number;
    netAmount: number;
  }[];
}

interface PurchasePrintTemplateProps {
  data: PurchasePrintData;
  templateVariant: "With Tax" | "Without Tax";
}

// Maps short currency symbol → full currency name for number-to-words
const CURRENCY_NAMES: Record<string, string> = {
  BHD: "BAHRAINI DINAR",
  USD: "US DOLLAR",
  EUR: "EURO",
  GBP: "POUND STERLING",
  AED: "UAE DIRHAM",
  SAR: "SAUDI RIYAL",
  QAR: "QATARI RIYAL",
  KWD: "KUWAITI DINAR",
  OMR: "OMANI RIAL",
  INR: "INDIAN RUPEE",
};

const SUBUNIT_NAMES: Record<string, string> = {
  BHD: "FILS",
  KWD: "FILS",
  OMR: "BAISA",
  USD: "CENTS",
  EUR: "CENTS",
  GBP: "PENCE",
  AED: "FILS",
  SAR: "HALALAH",
  QAR: "DIRHAM",
  INR: "PAISE",
};

export const PurchasePrintTemplate = forwardRef<HTMLDivElement, PurchasePrintTemplateProps>(
  ({ data, templateVariant }, ref) => {
    const isWithTax = templateVariant === "With Tax";
    const isReturn = data.docTitle.toLowerCase().includes("return");
    const currencySymbol = localStorage.getItem("currencySymbol") || "BHD";
    const decimalPart = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const currencyFullName = CURRENCY_NAMES[currencySymbol] || currencySymbol;
    const subunitName = SUBUNIT_NAMES[currencySymbol] || "FILS";

    const totalGross = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDiscount = data.items.reduce((sum, item) => sum + ((item.amount || 0) - (item.netValue || 0)), 0);
    const totalNetValue = data.items.reduce((sum, item) => sum + (item.netValue || 0), 0);
    const totalVat = data.items.reduce((sum, item) => sum + (item.vatAmt || 0), 0);
    const totalNetAmount = data.items.reduce((sum, item) => sum + (item.netAmount || 0), 0);

    return (
      <div 
        id="print-template"
        ref={ref} 
        className="p-8 font-sans"
        style={{ width: "210mm", minHeight: "297mm", margin: "0 auto", fontSize: "12px", backgroundColor: "#ffffff", color: "#000000" }}
      >
        <style>
          {`
            #print-template * {
              border-color: #000000 !important;
              color: inherit;
              outline-color: #000000 !important;
              background-color: transparent !important;
              box-shadow: none !important;
              text-shadow: none !important;
              --tw-border-spacing-x: 0;
              --tw-border-spacing-y: 0;
              --tw-translate-x: 0;
              --tw-translate-y: 0;
              --tw-rotate: 0;
              --tw-skew-x: 0;
              --tw-skew-y: 0;
              --tw-scale-x: 1;
              --tw-scale-y: 1;
              --tw-pan-x: ;
              --tw-pan-y: ;
              --tw-pinch-zoom: ;
              --tw-scroll-snap-strictness: proximity;
              --tw-ordinal: ;
              --tw-slashed-zero: ;
              --tw-numeric-figure: ;
              --tw-numeric-spacing: ;
              --tw-numeric-fraction: ;
              --tw-ring-inset: ;
              --tw-ring-offset-width: 0px;
              --tw-ring-offset-color: #fff;
              --tw-ring-color: #000000;
              --tw-ring-offset-shadow: 0 0 #0000;
              --tw-ring-shadow: 0 0 #0000;
              --tw-shadow: 0 0 #0000;
              --tw-shadow-colored: 0 0 #0000;
              --tw-blur: ;
              --tw-brightness: ;
              --tw-contrast: ;
              --tw-grayscale: ;
              --tw-hue-rotate: ;
              --tw-invert: ;
              --tw-saturate: ;
              --tw-sepia: ;
              --tw-drop-shadow: ;
              --tw-backdrop-blur: ;
              --tw-backdrop-brightness: ;
              --tw-backdrop-contrast: ;
              --tw-backdrop-grayscale: ;
              --tw-backdrop-hue-rotate: ;
              --tw-backdrop-invert: ;
              --tw-backdrop-opacity: ;
              --tw-backdrop-saturate: ;
              --tw-backdrop-sepia: ;
            }
            #print-template table, #print-template th, #print-template td {
              border-color: #000000 !important;
            }
          `}
        </style>
        {/* HEADER SECTION */}
        <div className="text-center font-bold mb-4">
          <h1 className="text-xl">{data.companyName}</h1>
          {data.companyAddress.split(',').map((line, i) => (
            <div key={i} className="text-sm font-normal">{line.trim()}</div>
          ))}
          <div className="text-sm font-bold mt-1">TRN No : {data.companyTrn}</div>
        </div>

        <div className="text-center font-bold text-lg border-y border-[#000000] py-1 mb-4 uppercase">
          {data.docTitle}
        </div>

        {/* INFO SECTION */}
        <div className="flex justify-between mb-4 text-xs font-bold leading-relaxed">
          <div className="flex-1">
            <div className="flex"><span className="w-20">Supplier</span>: {data.supplierName}</div>
            <div className="flex"><span className="w-20">Address</span>: {data.supplierAddress}</div>
            <div className="flex"><span className="w-20">TRN No</span>: {data.supplierTrn}</div>
          </div>
          <div className="w-64">
            <div className="flex"><span className="w-24">{isReturn ? 'PRT No.' : 'Voucher No'}</span>: {data.voucherNo}</div>
            <div className="flex"><span className="w-24">{isReturn ? 'Inv No' : 'Purchase No'}</span>: {data.purchaseNo}</div>
            <div className="flex"><span className="w-24">{isReturn ? 'PRT Dt' : 'Date'}</span>: {data.date}</div>
            {!isReturn && <div className="flex"><span className="w-24">Paymode</span>: {data.paymode}</div>}
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-[#000000] text-xs text-center">
            <thead>
              <tr className="font-bold border-b border-[#000000]">
                <th className="border-r border-[#000000] p-1">{isReturn ? 'S/N' : 'No.'}</th>
                <th className="border-r border-[#000000] p-1">{isReturn ? 'Description/Barcode' : 'Product'}</th>
                <th className="border-r border-[#000000] p-1">Qty</th>
                {isReturn && <th className="border-r border-[#000000] p-1">Unit</th>}
                <th className="border-r border-[#000000] p-1">FOC</th>
                {!isReturn && <th className="border-r border-[#000000] p-1">Unit</th>}
                <th className="border-r border-[#000000] p-1">Price</th>
                {!isReturn && <th className="border-r border-[#000000] p-1">Discount</th>}
                {isReturn && <th className="border-r border-[#000000] p-1">Amount</th>}
                {isReturn && <th className="border-r border-[#000000] p-1">Dis Amt</th>}
                <th className="border-r border-[#000000] p-1">{isReturn ? 'Taxable Amount' : 'Net Value'}</th>
                {isWithTax && <th className="border-r border-[#000000] p-1">{isReturn ? 'VAT Amt' : 'VAT (%)'}</th>}
                {isWithTax && !isReturn && <th className="border-r border-[#000000] p-1">VAT Amt</th>}
                <th className="p-1">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx} className="border-b border-[#000000]">
                  <td className="border-r border-[#000000] p-1 align-top">{idx + 1}</td>
                  <td className="border-r border-[#000000] p-1 align-top text-left">{item.productName}</td>
                  <td className="border-r border-[#000000] p-1 align-top">{item.qty}</td>
                  {isReturn && <td className="border-r border-[#000000] p-1 align-top">{item.unit}</td>}
                  <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.foc)}</td>
                  {!isReturn && <td className="border-r border-[#000000] p-1 align-top">{item.unit}</td>}
                  <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.price)}</td>
                  
                  {!isReturn && <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.discount)}</td>}
                  {isReturn && <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.amount)}</td>}
                  {isReturn && <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.discount)}</td>}
                  
                  <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.netValue)}</td>
                  
                  {isWithTax && (
                    <td className="border-r border-[#000000] p-1 align-top">
                      {isReturn ? formatAmount(item.vatAmt) : `${formatAmount(item.vatPercent)}%`}
                    </td>
                  )}
                  {isWithTax && !isReturn && (
                    <td className="border-r border-[#000000] p-1 align-top">{formatAmount(item.vatAmt)}</td>
                  )}
                  <td className="p-1 align-top">{formatAmount(item.netAmount)}</td>
                </tr>
              ))}
              
              {/* TOTAL ROW */}
              <tr className="font-bold border-t border-[#000000]">
                <td colSpan={6} className="text-right p-1">Total</td>
                {isReturn ? (
                  <>
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalGross)}</td>
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalDiscount)}</td>
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalNetValue)}</td>
                    {isWithTax && <td className="border-l border-[#000000] p-1">{formatAmount(totalVat)}</td>}
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalNetAmount)}</td>
                  </>
                ) : (
                  <>
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalDiscount)}</td>
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalNetValue)}</td>
                    {isWithTax && (
                      <>
                        <td className="border-l border-[#000000] p-1"></td>
                        <td className="border-l border-[#000000] p-1">{formatAmount(totalVat)}</td>
                      </>
                    )}
                    <td className="border-l border-[#000000] p-1">{formatAmount(totalNetAmount)}</td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex justify-between items-start text-xs font-bold leading-loose">
          <div className="flex-1 pr-4">
            <div className="mb-2 flex items-center">
              <span className="mr-2">{isReturn ? 'Amount In Words' : 'Grand Total in words'}:</span>
              <span className="font-normal">{numberToWords(data.totals.grandTotal, currencyFullName, subunitName, decimalPart)}</span>
            </div>
            
            {isWithTax && data.taxSummary.length > 0 && (
              <table className="border-collapse border border-[#000000] text-center mt-2 w-3/4">
                <thead>
                  <tr className="border-b border-[#000000]">
                    <th className="border-r border-[#000000] p-1">Tax code</th>
                    <th className="border-r border-[#000000] p-1">{isReturn ? 'Taxable' : 'Net Value'}</th>
                    <th className="border-r border-[#000000] p-1">{isReturn ? 'VAT Amount' : 'Vat Amount'}</th>
                    <th className="p-1">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="font-normal">
                  {data.taxSummary.map((ts, i) => (
                    <tr key={i} className="border-b border-[#000000]">
                      <td className="border-r border-[#000000] p-1">{ts.taxCode}</td>
                      <td className="border-r border-[#000000] p-1">{formatAmount(ts.taxable)}</td>
                      <td className="border-r border-[#000000] p-1">{formatAmount(ts.vatAmount)}</td>
                      <td className="p-1">{formatAmount(ts.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {isReturn && (
              <div className="flex justify-between mt-12 font-bold w-full">
                <div className="w-1/2">
                  <div className="mb-4">For : VENDOR</div>
                  <div>SIGNATURE _______________________</div>
                </div>
                <div className="w-1/2 pl-8">
                  <div className="mb-4">For : {data.companyName}</div>
                  <div>SIGNATURE _______________________</div>
                </div>
              </div>
            )}
          </div>
          
          {/* TOTALS BLOCK RIGHT */}
          <div className="w-64">
            <div className="flex justify-between"><span className="w-32">{isReturn ? 'Total Amount' : 'Total'}</span> <span>{formatAmount(data.totals.total)}</span></div>
            <div className="flex justify-between"><span className="w-32">Discount</span> <span>{formatAmount(data.totals.discount)}</span></div>
            <div className="flex justify-between"><span className="w-32">Net Value</span> <span>{formatAmount(data.totals.total - data.totals.discount)}</span></div>
            {isWithTax && <div className="flex justify-between"><span className="w-32">VAT</span> <span>{formatAmount(data.totals.vat)}</span></div>}
            
            {!isReturn && (
              <>
                <div className="flex justify-between"><span className="w-32">Adjustment Amount</span> <span>{formatAmount(data.totals.adjustmentAmount)}</span></div>
                <div className="flex justify-between"><span className="w-32">Round Off</span> <span>{formatAmount(data.totals.roundOff)}</span></div>
              </>
            )}
            
            <div className="flex justify-between border-t border-[#000000] mt-1 pt-1"><span className="w-32">{isReturn ? 'Net Amount' : 'Grand Total'}</span> <span>{formatAmount(data.totals.grandTotal)}</span></div>
          </div>
        </div>

        {!isReturn && (
          <div className="text-right font-bold mt-12 pt-12 pr-8 text-xs">
            Authority Signatory
          </div>
        )}
      </div>
    );
  }
);
