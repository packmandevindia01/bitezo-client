import React, { useState, useEffect } from 'react';
import { Download, FileBarChart, Users, Trash2, PackageX, Receipt, Gift, Truck, Wallet } from 'lucide-react';
import { Modal, Button } from '../../../../../../components/common';
import { cashierLogService } from '../../../../cashier/services/cashierLogService';
import { useToast } from '../../../../../../app/providers/useToast';
import { generateEndReportHtml } from '../../../../utils/endReportTemplate';
import { 
  generateEndReportMarkup,
  generateVoidOrderReportMarkup,
  generateVoidProductReportMarkup,
  generateVoidInvoiceReportMarkup,
  generateBillComplementaryReportMarkup,
  generateDriverSummaryReportMarkup,
  generateAllTransactionSummaryReportMarkup
} from '../../../../utils/escPosGenerator';
import { printPosReport } from '../../../../utils/reportPrinter';

import type { 
  ReportType, 
  ReportCardItem, 
  DayClosedLog, 
  ShiftClosedLog, 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem
} from './reports/types';
import { 
  generateVoidOrderReportHtml, 
  generateVoidProductReportHtml, 
  generateVoidInvoiceReportHtml,
  generateBillComplementaryReportHtml,
  generateDriverSummaryReportHtml,
  generateAllTransactionSummaryReportHtml
} from './reports/utils/htmlReportTemplates';
import { exportReportToPdf } from './reports/utils/pdfExportUtils';

import { PosReportsHubView } from './reports/PosReportsHubView';
import { ClosingLogReportView } from './reports/ClosingLogReportView';
import { VoidOrderSummaryView } from './reports/VoidOrderSummaryView';
import { VoidProductSummaryView } from './reports/VoidProductSummaryView';
import { CancelledInvoiceSummaryView } from './reports/CancelledInvoiceSummaryView';
import { BillComplementarySummaryView } from './reports/BillComplementarySummaryView';
import { DriverSummaryView } from './reports/DriverSummaryView';
import { AllTransactionSummaryView } from './reports/AllTransactionSummaryView';
import { GenericReportView } from './reports/GenericReportView';

interface PosReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'DAY_END' | 'SHIFT_END';

const REPORT_CARDS: ReportCardItem[] = [
  {
    id: 'DAY_END',
    title: 'Day End Report',
    badge: 'Z-Report & Closing',
    badgeBg: 'bg-amber-50',
    badgeTextColor: 'text-amber-700',
    description: 'Daily sales summaries, cashier closing balances & Z-Reports',
    icon: FileBarChart,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    id: 'SHIFT_END',
    title: 'Shift End Report',
    badge: 'Shift Audit & Closing',
    badgeBg: 'bg-blue-50',
    badgeTextColor: 'text-blue-700',
    description: 'Cashier shift summaries, drawer balances & shift closing logs',
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    id: 'VOID_ORDER_SUMMARY',
    title: 'Void Order Summary',
    badge: 'Void Audit Log',
    badgeBg: 'bg-red-50',
    badgeTextColor: 'text-red-700',
    description: 'Summary of voided customer orders, employee details & reasons',
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
  },
  {
    id: 'VOID_PRODUCT_SUMMARY',
    title: 'Void Product Summary',
    badge: 'Void Item Log',
    badgeBg: 'bg-rose-50',
    badgeTextColor: 'text-rose-700',
    description: 'Summary of voided products/items, order #, employee & amount',
    icon: PackageX,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
  },
  {
    id: 'CANCELLED_INVOICE_SUMMARY',
    title: 'Cancelled Invoice Summary',
    badge: 'Void Invoice Log',
    badgeBg: 'bg-purple-50',
    badgeTextColor: 'text-purple-700',
    description: 'Summary of cancelled/voided customer invoices, bill # & amount',
    icon: Receipt,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
  },
  {
    id: 'BILL_COMPLEMENTARY_SUMMARY',
    title: 'Bill Complementary Summary',
    badge: 'Complementary Audit',
    badgeBg: 'bg-emerald-50',
    badgeTextColor: 'text-emerald-700',
    description: 'Summary of complementary bills, invoice #, date & customer details',
    icon: Gift,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
  },
  {
    id: 'DRIVER_SUMMARY',
    title: 'Driver Summary Report',
    badge: 'Driver / Delivery Audit',
    badgeBg: 'bg-cyan-50',
    badgeTextColor: 'text-cyan-700',
    description: 'Summary of delivery driver sales totals & order amounts',
    icon: Truck,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-700',
  },
  {
    id: 'ALL_TRANSACTION_SUMMARY',
    title: 'All Transaction Summary',
    badge: 'Payment & Credit Audit',
    badgeBg: 'bg-indigo-50',
    badgeTextColor: 'text-indigo-700',
    description: 'Summary of cash, credit, discounts, pending orders & transactions',
    icon: Wallet,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
  },
];

const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PosReportModal: React.FC<PosReportModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType>('HUB');
  const [activeTab, setActiveTab] = useState<TabType>('DAY_END');
  const [asOnDate, setAsOnDate] = useState<string>(() => getTodayStr());
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [dayLogs, setDayLogs] = useState<DayClosedLog[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftClosedLog[]>([]);

  // Centralized report dates state
  const [fromDate, setFromDate] = useState<string>(() => {
    return localStorage.getItem('reportFromDate') || '2026-01-01';
  });
  const [toDate, setToDate] = useState<string>(() => {
    const saved = localStorage.getItem('reportToDate');
    const today = getTodayStr();
    return saved && saved >= today ? saved : today;
  });
  const [fromTime, setFromTime] = useState<string>(() => {
    return localStorage.getItem('reportFromTime') || '00:00';
  });
  const [toTime, setToTime] = useState<string>(() => {
    return localStorage.getItem('reportToTime') || '23:59';
  });

  const [isDayWiseChecked, setIsDayWiseChecked] = useState<boolean>(() => {
    const saved = localStorage.getItem('reportIsDayWise');
    return saved !== null ? saved === 'true' : true;
  });

  const [isTimeWiseChecked, setIsTimeWiseChecked] = useState<boolean>(() => {
    const saved = localStorage.getItem('reportIsTimeWise');
    return saved !== null ? saved === 'true' : false;
  });

  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    localStorage.setItem('reportFromDate', val);
    if (toDate && val > toDate) {
      setToDate(val);
      setAsOnDate(val);
      localStorage.setItem('reportToDate', val);
    }
  };

  const handleToDateChange = (val: string) => {
    setToDate(val);
    setAsOnDate(val);
    localStorage.setItem('reportToDate', val);
    if (fromDate && val < fromDate) {
      setFromDate(val);
      localStorage.setItem('reportFromDate', val);
    }
  };

  const handleFromTimeChange = (val: string) => {
    setFromTime(val);
    localStorage.setItem('reportFromTime', val);
  };

  const handleToTimeChange = (val: string) => {
    setToTime(val);
    localStorage.setItem('reportToTime', val);
  };

  const handleDayWiseCheckChange = (checked: boolean) => {
    setIsDayWiseChecked(checked);
    localStorage.setItem('reportIsDayWise', String(checked));
  };

  const handleTimeWiseCheckChange = (checked: boolean) => {
    setIsTimeWiseChecked(checked);
    localStorage.setItem('reportIsTimeWise', String(checked));
  };



  // Void Order Summary state
  const [voidSummaryLogs, setVoidSummaryLogs] = useState<VoidOrderSummaryItem[]>([]);
  const [voidLoading, setVoidLoading] = useState(false);

  // Void Product Summary state
  const [voidProductSummaryLogs, setVoidProductSummaryLogs] = useState<VoidProductSummaryItem[]>([]);
  const [voidProductLoading, setVoidProductLoading] = useState(false);

  // Cancelled Invoice Summary state
  const [voidInvoiceSummaryLogs, setVoidInvoiceSummaryLogs] = useState<VoidInvoiceSummaryItem[]>([]);
  const [voidInvoiceLoading, setVoidInvoiceLoading] = useState(false);

  // Bill Complementary Summary state
  const [invoiceComplementaryLogs, setInvoiceComplementaryLogs] = useState<InvoiceComplementarySummaryItem[]>([]);
  const [invoiceComplementaryLoading, setInvoiceComplementaryLoading] = useState(false);

  // Driver Summary state
  const [driverSummaryLogs, setDriverSummaryLogs] = useState<DriverSummaryItem[]>([]);
  const [driverLoading, setDriverLoading] = useState(false);

  // All Transaction Summary state
  const [allTransactionLogs, setAllTransactionLogs] = useState<AllTransactionSummaryItem[]>([]);
  const [allTransactionLoading, setAllTransactionLoading] = useState(false);

  // Selected Row Identifier
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  // Day End Checkbox & Day Start/End Date Time State
  const [isDayEndChecked, setIsDayEndChecked] = useState<boolean>(false);
  const [dayStartEndInfo, setDayStartEndInfo] = useState<{ startDate?: string; endDate?: string; dayStart?: string; dayEnd?: string } | null>(null);
  const [dayStartEndLoading, setDayStartEndLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const today = getTodayStr();
      let currentFrom = localStorage.getItem('reportFromDate') || '2026-01-01';
      let currentTo = localStorage.getItem('reportToDate') || today;

      if (currentTo < today) {
        currentTo = today;
        localStorage.setItem('reportToDate', currentTo);
      }

      if (currentFrom > currentTo) {
        currentTo = currentFrom;
        localStorage.setItem('reportToDate', currentTo);
      }

      setFromDate(currentFrom);
      setToDate(currentTo);
      setAsOnDate(currentTo);
    }
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && isDayEndChecked) {
      const targetDate = asOnDate || toDate || new Date().toISOString().split('T')[0];
      setDayStartEndLoading(true);
      cashierLogService.getDayStartEndDate(targetDate)
        .then((data) => {
          if (isMounted) {
            setDayStartEndInfo(data);
          }
        })
        .finally(() => {
          if (isMounted) setDayStartEndLoading(false);
        });
    } else {
      setDayStartEndInfo(null);
    }
    return () => { isMounted = false; };
  }, [isOpen, isDayEndChecked, asOnDate, toDate]);

  useEffect(() => {
    if (isOpen && (selectedReport === 'DAY_END' || selectedReport === 'SHIFT_END')) {
      const targetTab: TabType = selectedReport === 'DAY_END' ? 'DAY_END' : 'SHIFT_END';
      setActiveTab(targetTab);
      void fetchLogs(targetTab);
    }
  }, [isOpen, selectedReport, activeTab, asOnDate]);

  useEffect(() => {
    if (isOpen && selectedReport === 'VOID_ORDER_SUMMARY') {
      void fetchVoidSummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  useEffect(() => {
    if (isOpen && selectedReport === 'VOID_PRODUCT_SUMMARY') {
      void fetchVoidProductSummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  useEffect(() => {
    if (isOpen && selectedReport === 'CANCELLED_INVOICE_SUMMARY') {
      void fetchVoidInvoiceSummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  useEffect(() => {
    if (isOpen && selectedReport === 'BILL_COMPLEMENTARY_SUMMARY') {
      void fetchInvoiceComplementarySummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  useEffect(() => {
    if (isOpen && selectedReport === 'DRIVER_SUMMARY') {
      void fetchDriverSummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  useEffect(() => {
    if (isOpen && selectedReport === 'ALL_TRANSACTION_SUMMARY') {
      void fetchAllTransactionSummary();
    }
  }, [isOpen, selectedReport, fromDate, toDate, fromTime, toTime, isDayWiseChecked, isTimeWiseChecked]);

  const fetchLogs = async (tabOverride?: TabType) => {
    const currentTab = tabOverride || activeTab;
    if (!asOnDate) return;
    setLoading(true);
    setSelectedDayId(null);
    setSelectedShiftId(null);
    
    try {
      if (currentTab === 'DAY_END') {
        const data = await cashierLogService.getDayClosedLogs(asOnDate);
        setDayLogs(data);
      } else {
        const data = await cashierLogService.getShiftClosedLogs(asOnDate);
        setShiftLogs(data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSanitizedDateRange = () => {
    let fDate = isDayWiseChecked ? (fromDate || getTodayStr()) : '2000-01-01';
    let tDate = isDayWiseChecked ? (toDate || getTodayStr()) : '2099-12-31';
    let fTime = isTimeWiseChecked ? (fromTime || '00:00') : '00:00';
    let tTime = isTimeWiseChecked ? (toTime || '23:59') : '23:59';

    if (isDayWiseChecked && fDate > tDate) {
      tDate = fDate;
      setToDate(tDate);
      setAsOnDate(tDate);
      localStorage.setItem('reportToDate', tDate);
    }

    let fullFrom = isTimeWiseChecked ? `${fDate}T${fTime}:00` : fDate;
    let fullTo = isTimeWiseChecked ? `${tDate}T${tTime}:59` : tDate;

    return { fullFrom, fullTo };
  };

  const fetchVoidSummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setVoidLoading(true);
    try {
      const data = await cashierLogService.getVoidOrderSummary(fullFrom, fullTo);
      setVoidSummaryLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch void order summary', 'error');
    } finally {
      setVoidLoading(false);
    }
  };

  const fetchVoidProductSummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setVoidProductLoading(true);
    try {
      const data = await cashierLogService.getVoidProductSummary(fullFrom, fullTo);
      setVoidProductSummaryLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch void product summary', 'error');
    } finally {
      setVoidProductLoading(false);
    }
  };

  const fetchVoidInvoiceSummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setVoidInvoiceLoading(true);
    try {
      const data = await cashierLogService.getVoidInvoiceSummary(fullFrom, fullTo);
      setVoidInvoiceSummaryLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch void invoice summary', 'error');
    } finally {
      setVoidInvoiceLoading(false);
    }
  };

  const fetchInvoiceComplementarySummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setInvoiceComplementaryLoading(true);
    try {
      const data = await cashierLogService.getInvoiceComplementarySummary(fullFrom, fullTo);
      setInvoiceComplementaryLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch invoice complementary summary', 'error');
    } finally {
      setInvoiceComplementaryLoading(false);
    }
  };

  const fetchDriverSummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setDriverLoading(true);
    try {
      const data = await cashierLogService.getDriverSummary(fullFrom, fullTo);
      setDriverSummaryLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch driver summary', 'error');
    } finally {
      setDriverLoading(false);
    }
  };

  const fetchAllTransactionSummary = async () => {
    const { fullFrom, fullTo } = getSanitizedDateRange();
    setAllTransactionLoading(true);
    try {
      const data = await cashierLogService.getAllTransactionSummary(fullFrom, fullTo);
      setAllTransactionLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch all transaction summary', 'error');
    } finally {
      setAllTransactionLoading(false);
    }
  };

  const handlePrintVoidSummary = async (directPrint: boolean) => {
    try {
      const html = generateVoidOrderReportHtml(voidSummaryLogs, fromDate, toDate);
      const markup = generateVoidOrderReportMarkup(voidSummaryLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'Void Order Summary' });
        showToast('Printing Void Order Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintVoidProductSummary = async (directPrint: boolean) => {
    try {
      const html = generateVoidProductReportHtml(voidProductSummaryLogs, fromDate, toDate);
      const markup = generateVoidProductReportMarkup(voidProductSummaryLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'Void Product Summary' });
        showToast('Printing Void Product Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintVoidInvoiceSummary = async (directPrint: boolean) => {
    try {
      const html = generateVoidInvoiceReportHtml(voidInvoiceSummaryLogs, fromDate, toDate);
      const markup = generateVoidInvoiceReportMarkup(voidInvoiceSummaryLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'Cancelled Invoice Summary' });
        showToast('Printing Cancelled Invoice Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintInvoiceComplementarySummary = async (directPrint: boolean) => {
    try {
      const html = generateBillComplementaryReportHtml(invoiceComplementaryLogs, fromDate, toDate);
      const markup = generateBillComplementaryReportMarkup(invoiceComplementaryLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'Bill Complementary Summary' });
        showToast('Printing Bill Complementary Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintDriverSummary = async (directPrint: boolean) => {
    try {
      const html = generateDriverSummaryReportHtml(driverSummaryLogs, fromDate, toDate);
      const markup = generateDriverSummaryReportMarkup(driverSummaryLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'Driver Summary' });
        showToast('Printing Driver Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintAllTransactionSummary = async (directPrint: boolean) => {
    try {
      const html = generateAllTransactionSummaryReportHtml(allTransactionLogs, fromDate, toDate);
      const markup = generateAllTransactionSummaryReportMarkup(allTransactionLogs, fromDate, toDate);
      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: 'All Transaction Summary' });
        showToast('Printing All Transaction Summary...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrintClosingLog = async (directPrint: boolean) => {
    if (activeTab === 'DAY_END' && !selectedDayId) {
      showToast('Please select a Day End record first.', 'warning');
      return;
    }
    if (activeTab === 'SHIFT_END' && (!selectedDayId || !selectedShiftId)) {
      showToast('Please select a Shift End record first.', 'warning');
      return;
    }

    try {
      let html = '';
      let markup = '';
      const reportTitle = activeTab === 'DAY_END' ? 'Day End Report' : 'Shift End Report';
      if (activeTab === 'DAY_END') {
        const reportData = await cashierLogService.getDayEndReport(selectedDayId!);
        html = await generateEndReportHtml(reportData, 'DAYEND', !directPrint);
        markup = generateEndReportMarkup(reportData, 'DAYEND');
      } else {
        const reportData = await cashierLogService.getShiftEndReport(selectedDayId!, selectedShiftId!);
        html = await generateEndReportHtml(reportData, 'SHIFTEND', !directPrint);
        markup = generateEndReportMarkup(reportData, 'SHIFTEND');
      }

      if (directPrint) {
        await printPosReport({ html, markup, directPrint: true, title: reportTitle });
        showToast('Printing report...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      showToast('Generating PDF...', 'info');
      await exportReportToPdf(
        selectedReport,
        fromDate,
        toDate,
        asOnDate,
        {
          voidOrderLogs: voidSummaryLogs,
          voidProductLogs: voidProductSummaryLogs,
          voidInvoiceLogs: voidInvoiceSummaryLogs,
          invoiceComplementaryLogs: invoiceComplementaryLogs,
          driverLogs: driverSummaryLogs,
          allTransactionLogs: allTransactionLogs,
        },
        previewHtml
      );
    } catch (err: any) {
      console.error(err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    if (dateString.startsWith('1900-') || dateString.includes('1900-01-01')) {
      const d = new Date();
      return d.toLocaleString('en-GB', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleCloseAll = () => {
    setSelectedReport('HUB');
    setPreviewHtml(null);
    onClose();
  };

  const handleModalClose = () => {
    if (selectedReport !== 'HUB') {
      setSelectedReport('HUB');
    } else {
      handleCloseAll();
    }
  };

  if (previewHtml) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setPreviewHtml(null)}
        title="Preview Report"
        size="2xl"
      >
        <div className="flex flex-col h-[75vh]">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4 relative shadow-inner">
            <iframe
              id="report-preview-iframe"
              srcDoc={previewHtml}
              className="w-full h-full border-none bg-white"
              title="Report Preview"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              className="flex items-center gap-2 h-11 px-6 bg-pos-orange hover:bg-pos-orange-hover text-[#49293e] shadow-md font-bold transition-all hover:scale-105"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="secondary"
              className="flex items-center gap-2 h-11 px-6 font-bold"
              onClick={() => setPreviewHtml(null)}
            >
              Back
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        selectedReport === 'HUB' 
          ? 'REPORTS HUB' 
          : selectedReport === 'DAY_END'
            ? 'DAY END REPORT'
            : selectedReport === 'SHIFT_END'
              ? 'SHIFT END REPORT'
              : selectedReport === 'VOID_ORDER_SUMMARY'
                ? 'VOID ORDER SUMMARY'
                : selectedReport === 'VOID_PRODUCT_SUMMARY'
                  ? 'VOID PRODUCT SUMMARY'
                  : selectedReport === 'CANCELLED_INVOICE_SUMMARY'
                    ? 'CANCELLED INVOICE SUMMARY'
                    : selectedReport === 'BILL_COMPLEMENTARY_SUMMARY'
                      ? 'BILL COMPLEMENTARY SUMMARY'
                      : selectedReport === 'DRIVER_SUMMARY'
                        ? 'DRIVER SUMMARY REPORT'
                        : selectedReport === 'ALL_TRANSACTION_SUMMARY'
                          ? 'ALL TRANSACTION SUMMARY'
                          : REPORT_CARDS.find(c => c.id === selectedReport)?.title.toUpperCase() || 'REPORT'
      }
      size="2xl"
    >
      {selectedReport === 'HUB' && (
        <PosReportsHubView
          reportCards={REPORT_CARDS}
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          onSelectReport={(id) => setSelectedReport(id)}
        />
      )}

      {(selectedReport === 'DAY_END' || selectedReport === 'SHIFT_END') && (
        <ClosingLogReportView
          reportType={selectedReport === 'DAY_END' ? 'DAY_END' : 'SHIFT_END'}
          asOnDate={asOnDate}
          onDateChange={handleToDateChange}
          loading={loading}
          dayLogs={dayLogs}
          shiftLogs={shiftLogs}
          selectedDayId={selectedDayId}
          selectedShiftId={selectedShiftId}
          onSelectDayId={(id) => setSelectedDayId(id)}
          onSelectShiftId={(dayId, shiftId) => {
            setSelectedDayId(dayId);
            setSelectedShiftId(shiftId);
          }}
          onPrint={handlePrintClosingLog}
          formatDate={formatDate}
          isDayEndChecked={isDayEndChecked}
          onDayEndCheckChange={setIsDayEndChecked}
          dayStartEndInfo={dayStartEndInfo}
          dayStartEndLoading={dayStartEndLoading}
        />
      )}

      {selectedReport === 'VOID_ORDER_SUMMARY' && (
        <VoidOrderSummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={voidLoading}
          logs={voidSummaryLogs}
          onPrint={handlePrintVoidSummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'VOID_PRODUCT_SUMMARY' && (
        <VoidProductSummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={voidProductLoading}
          logs={voidProductSummaryLogs}
          onPrint={handlePrintVoidProductSummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'CANCELLED_INVOICE_SUMMARY' && (
        <CancelledInvoiceSummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={voidInvoiceLoading}
          logs={voidInvoiceSummaryLogs}
          onPrint={handlePrintVoidInvoiceSummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'BILL_COMPLEMENTARY_SUMMARY' && (
        <BillComplementarySummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={invoiceComplementaryLoading}
          logs={invoiceComplementaryLogs}
          onPrint={handlePrintInvoiceComplementarySummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'DRIVER_SUMMARY' && (
        <DriverSummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={driverLoading}
          logs={driverSummaryLogs}
          onPrint={handlePrintDriverSummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'ALL_TRANSACTION_SUMMARY' && (
        <AllTransactionSummaryView
          fromDate={fromDate}
          toDate={toDate}
          fromTime={fromTime}
          toTime={toTime}
          isDayWiseChecked={isDayWiseChecked}
          isTimeWiseChecked={isTimeWiseChecked}
          onFromDateChange={handleFromDateChange}
          onToDateChange={handleToDateChange}
          onFromTimeChange={handleFromTimeChange}
          onToTimeChange={handleToTimeChange}
          onDayWiseCheckChange={handleDayWiseCheckChange}
          onTimeWiseCheckChange={handleTimeWiseCheckChange}
          loading={allTransactionLoading}
          logs={allTransactionLogs}
          onPrint={handlePrintAllTransactionSummary}
          formatDate={formatDate}
        />
      )}

      {selectedReport === 'SETTLED_ORDERS' && (
        <GenericReportView
          title="Settled Orders Report"
          description="Detailed log of settled customer invoices & payments"
          asOnDate={asOnDate}
          onDateChange={setAsOnDate}
        />
      )}

      {selectedReport === 'PAY_IN_OUT' && (
        <GenericReportView
          title="Pay In / Pay Out Log"
          description="Petty cash drawer float and payout log"
          asOnDate={asOnDate}
          onDateChange={setAsOnDate}
        />
      )}

      {selectedReport === 'CASHIER_SHIFT' && (
        <GenericReportView
          title="Cashier Shift Audit Log"
          description="Shift opening balances, counted cash & drawer variances"
          asOnDate={asOnDate}
          onDateChange={setAsOnDate}
        />
      )}
    </Modal>
  );
};
