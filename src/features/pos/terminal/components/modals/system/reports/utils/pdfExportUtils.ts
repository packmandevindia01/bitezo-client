import { formatCurrency } from '../../../../../../../../utils/currency';
import type { 
  ReportType, 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem 
} from '../types';

export const exportReportToPdf = async (
  reportType: ReportType,
  fromDate: string,
  toDate: string,
  asOnDate: string,
  logsData: {
    voidOrderLogs?: VoidOrderSummaryItem[];
    voidProductLogs?: VoidProductSummaryItem[];
    voidInvoiceLogs?: VoidInvoiceSummaryItem[];
    invoiceComplementaryLogs?: InvoiceComplementarySummaryItem[];
    driverLogs?: DriverSummaryItem[];
    allTransactionLogs?: AllTransactionSummaryItem[];
  },
  previewHtml?: string | null
): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const companyName = localStorage.getItem('companyName') || 'BITEZO POS';

  if (reportType === 'VOID_ORDER_SUMMARY') {
    const logs = logsData.voidOrderLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('VOID ORDER SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

    const headers = [['S.No', 'Order No', 'Order Type', 'Date & Time', 'Employee', 'Reason', 'Amount']];
    const body = logs.map((item) => [
      String(item.sNo),
      `#${item.orderNo}`,
      item.orderType || '-',
      item.date ? new Date(item.date).toLocaleString('en-GB') : '-',
      item.employee || '-',
      item.reason || '-',
      formatCurrency(item.amount),
    ]);

    const foot = [[
      { content: 'Total Void Amount:', colSpan: 6, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
      { content: formatCurrency(totalAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [73, 41, 62], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0 || data.column.index === 1) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 6) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save(`Void_Order_Summary_${fromDate}_to_${toDate}.pdf`);
  } else if (reportType === 'VOID_PRODUCT_SUMMARY') {
    const logs = logsData.voidProductLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('VOID PRODUCT SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const totalQty = logs.reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);
    const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

    const headers = [['S.No', 'Order No', 'Order Type', 'Void Date', 'Employee', 'Product', 'Qty', 'Amount']];
    const body = logs.map((item) => [
      String(item.sNo),
      `#${item.orderNo}`,
      item.orderType || '-',
      item.voidDate ? new Date(item.voidDate).toLocaleString('en-GB') : '-',
      item.employee || '-',
      item.product || '-',
      `${item.quantity} ${item.unit || ''}`.trim(),
      formatCurrency(item.amount),
    ]);

    const foot = [[
      { content: 'Total Void Qty & Amount:', colSpan: 6, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
      { content: String(totalQty), styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
      { content: formatCurrency(totalAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0 || data.column.index === 1 || data.column.index === 6) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 7) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save(`Void_Product_Summary_${fromDate}_to_${toDate}.pdf`);
  } else if (reportType === 'CANCELLED_INVOICE_SUMMARY') {
    const logs = logsData.voidInvoiceLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('CANCELLED INVOICE SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

    const headers = [['S.No', 'Bill No', 'Order No', 'Order Type', 'Date & Time', 'Employee', 'Amount']];
    const body = logs.map((item) => [
      String(item.sNo),
      item.billNo || '-',
      `#${item.orderNo}`,
      item.orderType || '-',
      item.date ? new Date(item.date).toLocaleString('en-GB') : '-',
      item.employee || '-',
      formatCurrency(item.amount),
    ]);

    const foot = [[
      { content: 'Total Cancelled Invoice Amount:', colSpan: 6, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
      { content: formatCurrency(totalAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0 || data.column.index === 1 || data.column.index === 2) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 6) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save(`Cancelled_Invoice_Summary_${fromDate}_to_${toDate}.pdf`);
  } else if (reportType === 'BILL_COMPLEMENTARY_SUMMARY') {
    const logs = logsData.invoiceComplementaryLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('BILL COMPLEMENTARY SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const headers = [['S.No', 'Bill No', 'Date & Time', 'Customer']];
    const body = logs.map((item) => [
      String(item.sNo),
      item.billNo || '-',
      item.date ? new Date(item.date).toLocaleString('en-GB') : '-',
      item.customer || '-',
    ]);

    const foot = [[
      { content: `Total Complementary Bills: ${logs.length}`, colSpan: 4, styles: { halign: 'left' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0 || data.column.index === 1) {
          data.cell.styles.halign = 'center';
        }
      }
    });

    doc.save(`Bill_Complementary_Summary_${fromDate}_to_${toDate}.pdf`);
  } else if (reportType === 'DRIVER_SUMMARY') {
    const logs = logsData.driverLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('DRIVER SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

    const headers = [['S.No', 'Driver / Waiter Name', 'Total Amount']];
    const body = logs.map((item) => [
      String(item.sNo),
      item.driver || '-',
      formatCurrency(item.amount),
    ]);

    const foot = [[
      { content: 'Total Amount:', colSpan: 2, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
      { content: formatCurrency(totalAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 2) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save(`Driver_Summary_${fromDate}_to_${toDate}.pdf`);
  } else if (reportType === 'ALL_TRANSACTION_SUMMARY') {
    const logs = logsData.allTransactionLogs || [];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyName, 105, 14, { align: 'center' });

    doc.setFontSize(12);
    doc.text('ALL TRANSACTION SUMMARY REPORT', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate}`, 105, 28, { align: 'center' });

    const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

    const headers = [['S.No', 'Particulars', 'Total Amount']];
    const body = logs.map((item, idx) => [
      String(idx + 1),
      item.particular || '-',
      formatCurrency(item.amount),
    ]);

    const foot = [[
      { content: 'Total Amount:', colSpan: 2, styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
      { content: formatCurrency(totalAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }
    ]];

    autoTable(doc, {
      startY: 34,
      head: headers,
      body: body,
      foot: foot,
      theme: 'striped',
      headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, font: 'helvetica' },
      didParseCell: (data) => {
        if (data.column.index === 0) {
          data.cell.styles.halign = 'center';
        } else if (data.column.index === 2) {
          data.cell.styles.halign = 'right';
        }
      }
    });

    doc.save(`All_Transaction_Summary_${fromDate}_to_${toDate}.pdf`);
  } else {
    if (!previewHtml) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '1000px';
    document.body.appendChild(iframe);

    const d = iframe.contentDocument || iframe.contentWindow?.document;
    if (d) {
      d.open(); d.write(previewHtml); d.close();
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(d.documentElement).set({ margin: 0.5, filename: `Report_${asOnDate}.pdf` }).save();
    }
    document.body.removeChild(iframe);
  }
};
