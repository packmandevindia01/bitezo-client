import React, { useState, useEffect } from 'react';
import { 
  SelectInput, 
  Button, 
  RecordTableCard,
  ConfirmDialog
} from '../../../../../components/common';
import { Trash2 } from 'lucide-react';
import type { OrderTypePrinterSetting } from '../../../types';
import { menuApi } from '../../../services/menuApi';

interface OrderTypeWisePrinterTabProps {
  initialData: OrderTypePrinterSetting[];
  onSave: (data: OrderTypePrinterSetting[]) => void;
  loading?: boolean;
}

export const OrderTypeWisePrinterTab: React.FC<OrderTypeWisePrinterTabProps> = ({ 
  initialData, 
  onSave,
  loading 
}) => {
  const [items, setItems] = useState<OrderTypePrinterSetting[]>(initialData);
  const [form, setForm] = useState({
    orderType: '',
    printer: 'pos-80c',
  });
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const [orderTypeOptions, setOrderTypeOptions] = useState<{ label: string; value: string; id: number }[]>([]);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    menuApi.getOrderTypes().then(data => {
      setOrderTypeOptions(data.map(ot => ({ label: ot.orderType, value: ot.orderType, id: ot.orderTypeId })));
    }).catch(console.error);
  }, []);

  const printerOptions = [
    { label: 'pos-80c', value: 'pos-80c' },
    { label: 'delivery', value: 'delivery' },
    { label: 'No Printer', value: 'No Printer' },
  ];

  const handleAdd = () => {
    if (!form.orderType) return;
    const match = orderTypeOptions.find(o => o.value === form.orderType);
    const newItem: OrderTypePrinterSetting = {
      orderTypeId: match?.id,
      orderType: form.orderType,
      printer: form.printer,
    };
    
    if (items.some(i => i.orderType === newItem.orderType)) {
      setItems(items.map(i => i.orderType === newItem.orderType ? newItem : i));
    } else {
      setItems([newItem, ...items]);
    }
    
    setForm({ ...form, orderType: '' });
  };

  const handleDelete = (orderType: string) => {
    setItems(items.filter(item => item.orderType !== orderType));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Entry Form */}
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3 min-w-[300px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">Order Type</label>
            <div className="flex-1">
              <SelectInput
                autoFocus={window.innerWidth > 1024}
                noMargin
                options={orderTypeOptions}
                value={form.orderType}
                onChange={(e) => setForm({ ...form, orderType: e.target.value })}
                placeholder="Select Order Type"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 min-w-[280px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">Master KOT Printer</label>
            <div className="flex-1">
              <SelectInput
                noMargin
                options={printerOptions}
                value={form.printer}
                onChange={(e) => setForm({ ...form, printer: e.target.value })}
              />
            </div>
          </div>

          <Button 
            variant="primary" 
            onClick={handleAdd}
            className="h-10.5 px-8 uppercase tracking-[0.2em] font-black text-[10px] shadow-sm ml-auto"
            disabled={!form.orderType}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      {/* List Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <RecordTableCard
          title="Order Type Wise Printer List"
          data={items}
          rowKey="orderType"
          columns={[
            { header: "SNo", accessor: "orderType", render: (_: any, index: number) => index + 1 },
            { 
              header: "Order Type", 
              accessor: "orderType",
              render: (row) => {
                const id = (row as any).orderTypeId;
                if (row.orderType) return row.orderType;
                if (id) {
                  const match = orderTypeOptions.find(o => o.id === id || String(o.id) === String(id));
                  if (match) return match.label;
                }
                return id ? `Order Type #${id}` : 'Unknown';
              }
            },
            { header: "Master KOT Printer", accessor: "printer" },
            { 
              header: "Actions", 
              accessor: "orderType",
              render: (row) => (
                <button 
                  onClick={() => handleDelete(row.orderType)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )
            }
          ]}
        />
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-4">
          <Button 
            variant="primary" 
            onClick={() => onSave(items)}
            loading={loading}
            className="px-12 uppercase tracking-widest font-black text-[10px]"
          >
            Save Order Type Routing
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteAll(true)}
            className="text-red-500 border-red-100 hover:bg-red-50"
            disabled={items.length === 0}
          >
            Delete All
          </Button>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Total Mappings: {items.length}
        </p>
      </div>

      <ConfirmDialog
        isOpen={showDeleteAll}
        title="Delete All Mappings"
        message="Are you sure you want to clear all order type printer settings? This cannot be undone."
        onConfirm={() => {
          setItems([]);
          setShowDeleteAll(false);
        }}
        onCancel={() => setShowDeleteAll(false)}
      />
    </div>
  );
};
