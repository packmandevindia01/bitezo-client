import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAmount } from "../../../../utils/formatters";
import { getCurrencySymbol } from "../../../../utils/currency";
import type { VoucherPrintData } from "./VoucherPrintTemplate";

export const generateRawPDF = (data: Partial<VoucherPrintData>, paperSize: "A4" | "80mm"): jsPDF => {
  const isReceipt = data.voucherType === "RECEIPT";
  const currency = getCurrencySymbol();

  if (paperSize === "80mm") {
    // 80mm format
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297]
    });

    let y = 8;
    const cw = 80;
    const m = 1; // Removed large margin as requested
    const u = cw - (m * 2);

    const center = (text: string, yPos: number, size: number, bold: boolean = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.text(text, cw / 2, yPos, { align: "center" });
    };

    const leftRight = (left: string, right: string, yPos: number, size: number, bold: boolean = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.text(left, m, yPos);
      doc.text(right, cw - m, yPos, { align: "right" });
    };

    const dashedLine = (yPos: number) => {
      // Use solid line for thermal printers as dashed patterns cause driver rendering bugs
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.line(m, yPos, cw - m, yPos);
    };

    // Header
    center(data.companyName || "AL ASRIYA ADVANCED TRADING LLC", y, 11, true);
    y += 4;
    center(data.companyAddress || "SULTANATE OF OMAN", y, 8);
    y += 3.5;
    center(`M: ${data.companyMobile || "94661313"} | P: ${data.companyPhone || ""}`, y, 8);
    y += 5;

    dashedLine(y); y += 4;
    center((isReceipt ? "Receipt" : "Payment Voucher").toUpperCase(), y, 10, true);
    y += 2.5;
    dashedLine(y); y += 5;

    // Info
    leftRight("Voucher No:", data.voucherNo || "", y, 8.5); y += 4;
    leftRight("Date:", data.date || "", y, 8.5); y += 4;
    leftRight("Type:", data.paymentType || (isReceipt ? "CASH RECEIPT" : "CASH PAYMENT"), y, 8.5, true); y += 5;

    dashedLine(y); y += 5;

    // Party
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(isReceipt || data.voucherType === "PAYMENT AGAINST" ? "Received from:" : "Paid to:", m, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const partyLines = doc.splitTextToSize(data.partyName?.toUpperCase() || "", u);
    doc.text(partyLines, m, y);
    y += (partyLines.length * 4) + 2;

    // Amount
    leftRight("Amount:", `${currency} ${formatAmount(data.amount || 0)}`, y, 11, true);
    y += 5;

    // Amount in words
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    const wordLines = doc.splitTextToSize(data.amountInWords || "", u);
    doc.text(wordLines, m, y);
    y += (wordLines.length * 3.5) + 2;

    if (data.narration) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("Narration:", m, y);
      doc.setFont("helvetica", "normal");
      const narLines = doc.splitTextToSize(data.narration, u - 14);
      doc.text(narLines, m + 14, y);
      y += (narLines.length * 3.5) + 2;
    }

    if (data.receiptDetails && data.receiptDetails.length > 0) {
      dashedLine(y); y += 4;
      center("INVOICE DETAILS", y, 8.5, true); y += 2;
      
      autoTable(doc, {
        startY: y,
        margin: { left: m, right: m },
        theme: 'plain',
        headStyles: { fontStyle: 'bold', fontSize: 7.5, cellPadding: 0.5, textColor: 0 },
        bodyStyles: { fontSize: 7.5, cellPadding: 0.5, textColor: 0 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 'auto' },
          1: { halign: 'left', cellWidth: 'auto' },
          2: { halign: 'right', cellWidth: 'auto' }
        },
        head: [[
          { content: 'Inv#', styles: { halign: 'left' } },
          { content: 'Date', styles: { halign: 'left' } },
          { content: 'Rcvd', styles: { halign: 'right' } }
        ]],
        body: data.receiptDetails.map(d => [
          d.invoiceNo,
          d.invoiceDate,
          formatAmount(d.receivedAmount)
        ]),
        didDrawPage: function (data) {
          y = data.cursor?.y || y;
        }
      });
      y += 2;
      
      dashedLine(y); y += 4;
      leftRight("Total:", formatAmount(data.amount || 0), y, 8.5, true); y += 4;
      
      if (data.discount) {
        leftRight("Discount:", formatAmount(data.discount), y, 8.5); y += 3;
        doc.setLineWidth(0.2);
        doc.line(m, y, cw - m, y); y += 4;
        leftRight("Net:", formatAmount(data.netAmount ?? (data.amount || 0) - (data.discount || 0)), y, 9.5, true); y += 4;
      }
    }

    dashedLine(y); y += 5;
    center("*** Thank You ***", y, 8, true);

    return doc;

  } else {
    // A4 Format
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const m = 15;
    let y = 20;
    const cw = 210;

    const center = (text: string, yPos: number, size: number, bold: boolean = false, color: string = "#000000") => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color);
      doc.text(text, cw / 2, yPos, { align: "center" });
      doc.setTextColor("#000000"); // reset
    };

    doc.setDrawColor(133, 77, 14); // #854d0e border-yellow-700
    doc.setLineWidth(0.5);
    doc.roundedRect(cw/2 - 70, y - 8, 140, 14, 2, 2);
    
    center(data.companyName || "AL ASRIYA ADVANCED TRADING LLC", y, 18, true, "#49293e");
    y += 12;
    center(data.companyAddress || "SULTANATE OF OMAN", y, 10, true);
    y += 6;
    center(`Mobile : ${data.companyMobile || "94661313"}     Phone : ${data.companyPhone || ""}`, y, 10, true);
    y += 15;

    center(isReceipt ? "Receipt" : "Payment", y, 14, true);
    const titleWidth = doc.getTextWidth(isReceipt ? "Receipt" : "Payment");
    doc.setLineWidth(0.3);
    doc.setDrawColor(0);
    doc.line(cw/2 - titleWidth/2, y + 1, cw/2 + titleWidth/2, y + 1);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Voucher No : ${data.voucherNo}`, m, y);
    doc.text(`TYPE : ${data.paymentType || (isReceipt ? "CASH RECEIPT" : "CASH PAYMENT")}`, cw - m, y, { align: 'right' });
    y += 6;
    doc.text(`Date : ${data.date}`, m, y);
    y += 8;

    y += 4;
    doc.setFont("helvetica", "normal");
    const pType = isReceipt || data.voucherType === "PAYMENT AGAINST" ? "Received from" : "Paid to";
    doc.text(`${pType} : ${data.partyName}`, m + 5, y);
    y += 8;
    
    doc.text("Amount : ", m + 5, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${formatAmount(data.amount || 0)}`, m + 35, y);
    doc.setFont("helvetica", "normal");
    y += 8;

    doc.text(`In Words : ${data.amountInWords}`, m + 5, y);
    y += 8;
    
    const narLines = doc.splitTextToSize(data.narration || "-", cw - (m * 2) - 40);
    doc.text("Narration : ", m + 5, y);
    doc.text(narLines, m + 35, y);
    
    y += 15;

    if (data.receiptDetails && data.receiptDetails.length > 0) {
      y += 10;
      center("RECEIPT DETAILS", y, 10, true);
      const subTitleWidth = doc.getTextWidth("RECEIPT DETAILS");
      doc.line(cw/2 - subTitleWidth/2, y + 1, cw/2 + subTitleWidth/2, y + 1);
      y += 5;

      autoTable(doc, {
        startY: y,
        margin: { left: m, right: m },
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0.2, lineColor: 0 },
        bodyStyles: { textColor: 0, lineWidth: 0.2, lineColor: 0 },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        },
        head: [[
          { content: 'Sl No', styles: { halign: 'center' } },
          { content: 'Vch Type', styles: { halign: 'center' } },
          { content: 'Invoice No', styles: { halign: 'center' } },
          { content: 'Invoice Date', styles: { halign: 'center' } },
          { content: 'Invoice Amount', styles: { halign: 'right' } },
          { content: 'Received Amount', styles: { halign: 'right' } }
        ]],
        body: [
          ...data.receiptDetails.map(d => [
            d.sNo, d.voucherType, d.invoiceNo, d.invoiceDate, formatAmount(d.invoiceAmount), formatAmount(d.receivedAmount)
          ]),
          [{ content: '', colSpan: 4, styles: { lineWidth: 0 } }, { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatAmount(data.amount || 0), styles: { fontStyle: 'bold', halign: 'right' } }],
          [{ content: '', colSpan: 4, styles: { lineWidth: 0 } }, { content: 'Discount', styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatAmount(data.discount || 0), styles: { fontStyle: 'bold', halign: 'right' } }],
          [{ content: '', colSpan: 4, styles: { lineWidth: 0 } }, { content: 'Net Amount', styles: { fontStyle: 'bold', halign: 'right' } }, { content: `${currency} ${formatAmount(data.netAmount ?? (data.amount || 0) - (data.discount || 0))}`, styles: { fontStyle: 'bold', halign: 'right' } }]
        ],
      });
    }

    return doc;
  }
};
