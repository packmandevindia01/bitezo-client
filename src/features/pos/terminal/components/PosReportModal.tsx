import React, { useState, useEffect } from 'react';
import { Mail, Printer, Eye, X, Search, Download } from 'lucide-react';
import { Modal, Button, FormInput } from '../../../../components/common';
import { cashierLogService } from '../../cashier/services/cashierLogService';
import type { DayClosedLog, ShiftClosedLog } from '../../cashier/services/cashierLogService';
import { useToast } from '../../../../app/providers/useToast';
import { generateEndReportHtml } from '../../utils/endReportTemplate';

interface PosReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'DAY_END' | 'SHIFT_END';

export const PosReportModal: React.FC<PosReportModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('DAY_END');
  const [asOnDate, setAsOnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [dayLogs, setDayLogs] = useState<DayClosedLog[]>([]);
  const [shiftLogs, setShiftLogs] = useState<ShiftClosedLog[]>([]);

  // Selected Row Identifier
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      void fetchLogs();
    }
  }, [isOpen, activeTab]); // Re-fetch on tab change or open

  const fetchLogs = async () => {
    if (!asOnDate) return;
    setLoading(true);
    setSelectedDayId(null);
    setSelectedShiftId(null);
    
    try {
      if (activeTab === 'DAY_END') {
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

  const handlePrint = async (directPrint: boolean) => {
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
      if (activeTab === 'DAY_END') {
        const reportData = await cashierLogService.getDayEndReport(selectedDayId!);
        html = generateEndReportHtml(reportData, 'DAYEND', !directPrint);
      } else {
        const reportData = await cashierLogService.getShiftEndReport(selectedDayId!, selectedShiftId!);
        html = generateEndReportHtml(reportData, 'SHIFTEND', !directPrint);
      }

      if (directPrint) {
        const { printHtmlReceipt } = await import('../../services/qzService');
        const defaultPrinter = localStorage.getItem('posPrinter') || undefined;
        await printHtmlReceipt(html, defaultPrinter);
        showToast('Printing report...', 'success');
      } else {
        setPreviewHtml(html);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handleExportPDF = async () => {
    if (!previewHtml) return;
    try {
      showToast('Generating PDF...', 'info');
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      const iframe = document.getElementById('report-preview-iframe') as HTMLIFrameElement;
      const elementToPrint = iframe?.contentDocument?.documentElement || iframe?.contentDocument?.body;

      if (!elementToPrint) {
        throw new Error("Could not find preview content");
      }

      const opt: any = {
        margin:       0.5,
        filename:     `${activeTab === 'DAY_END' ? 'Day_End' : 'Shift_End'}_Report_${asOnDate}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(elementToPrint).save();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.startsWith('1900-')) return '—';
    const d = new Date(dateString);
    return d.toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  if (previewHtml) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => setPreviewHtml(null)}
        title={`Preview: ${activeTab === 'DAY_END' ? 'DAY END REPORT' : 'SHIFT END REPORT'}`}
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
              className="flex items-center gap-2 h-11 px-6 bg-pos-orange hover:bg-pos-orange-hover text-white shadow-md font-bold transition-all hover:scale-105"
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
      onClose={onClose}
      title={activeTab === 'DAY_END' ? 'DAY END REPORT' : 'SHIFT END REPORT'}
      size="2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <FormInput
              type="date"
              label=""
              value={asOnDate}
              onChange={(e: any) => setAsOnDate(e.target.value)}
              inputClassName="w-40 h-[42px]"
            />
            <Button
              onClick={fetchLogs}
              loading={loading}
              className="h-[42px] px-6"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('DAY_END')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === 'DAY_END'
                  ? 'bg-white text-[#49293e] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Day End
            </button>
            <button
              onClick={() => setActiveTab('SHIFT_END')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === 'SHIFT_END'
                  ? 'bg-white text-[#49293e] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Shift End
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[300px] flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#49293e] text-white">
                <tr>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">Start Date</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">End Date</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">Status</th>
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">Day ID</th>
                  {activeTab === 'SHIFT_END' && (
                    <>
                      <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">Shift ID</th>
                      <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b border-r border-[#49293e]/20">Counter</th>
                    </>
                  )}
                  <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider border-b">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'SHIFT_END' ? 7 : 5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Loading data...
                    </td>
                  </tr>
                ) : (
                  <>
                    {activeTab === 'DAY_END' && dayLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">No Day End logs found for this date.</td>
                      </tr>
                    )}
                    {activeTab === 'DAY_END' && dayLogs.map((log) => {
                      const isSelected = selectedDayId === log.dayId;
                      return (
                        <tr
                          key={log.dayId}
                          onClick={() => setSelectedDayId(log.dayId)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#49293e]/10 hover:bg-[#49293e]/15' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.startDate)}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.endDate)}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold border-r border-slate-100">
                            <span className={log.status === 'Opened' ? 'text-emerald-600' : 'text-slate-600'}>{log.status}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.dayId}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600">{log.branch}</td>
                        </tr>
                      );
                    })}

                    {activeTab === 'SHIFT_END' && shiftLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold text-sm">No Shift End logs found for this date.</td>
                      </tr>
                    )}
                    {activeTab === 'SHIFT_END' && shiftLogs.map((log) => {
                      const isSelected = selectedDayId === log.dayId && selectedShiftId === log.shiftId;
                      return (
                        <tr
                          key={`${log.dayId}-${log.shiftId}`}
                          onClick={() => {
                            setSelectedDayId(log.dayId);
                            setSelectedShiftId(log.shiftId);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#49293e]/10 hover:bg-[#49293e]/15' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.startDate)}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.endDate)}</td>
                          <td className="py-2.5 px-4 text-xs font-semibold border-r border-slate-100">
                            <span className={log.status === 'Opened' ? 'text-emerald-600' : 'text-slate-600'}>{log.status}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.dayId}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.shiftId}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.counter}</td>
                          <td className="py-2.5 px-4 text-xs text-slate-600">{log.branch}</td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
          <Button
            variant="secondary"
            className="flex items-center gap-2 h-10"
            onClick={() => showToast('Mail functionality not configured.', 'warning')}
          >
            <Mail className="w-4 h-4" />
            Send Mail
          </Button>
          <Button
            variant="secondary"
            className="flex items-center gap-2 h-10"
            onClick={() => handlePrint(false)}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button
            className="flex items-center gap-2 h-10"
            onClick={() => handlePrint(true)}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            variant="danger"
            className="flex items-center gap-2 h-10 ml-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
