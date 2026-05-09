import React, { useState, useEffect } from 'react';
import { 
  SelectInput, 
  SearchableSelect, 
  Button, 
  RecordTableCard,
  ConfirmDialog
} from '../../../../components/common';
import { Trash2 } from 'lucide-react';
import type { CategoryPrinterSetting } from '../../types';
import { categoryService } from '../../../inventory/category/services/categoryService';

interface CategoryWisePrinterTabProps {
  initialData: CategoryPrinterSetting[];
  onSave: (data: CategoryPrinterSetting[]) => void;
  loading?: boolean;
}

export const CategoryWisePrinterTab: React.FC<CategoryWisePrinterTabProps> = ({ 
  initialData, 
  onSave,
  loading 
}) => {
  const [items, setItems] = useState<CategoryPrinterSetting[]>(initialData);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    firstPrinter: 'pos-80c',
    secondPrinter: 'No Printer',
  });
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  useEffect(() => {
    categoryService.listName().then(data => {
      setCategoryOptions(data.map(c => ({ label: c.catName, value: String(c.catId) })));
    });
  }, []);

  const printerOptions = [
    { label: 'pos-80c', value: 'pos-80c' },
    { label: 'delivery', value: 'delivery' },
    { label: 'No Printer', value: 'No Printer' },
  ];

  const handleAdd = () => {
    if (!form.categoryId) return;
    const cat = categoryOptions.find(c => c.value === form.categoryId);
    const newItem: CategoryPrinterSetting = {
      categoryId: parseInt(form.categoryId),
      category: cat?.label,
      firstPrinter: form.firstPrinter,
      secondPrinter: form.secondPrinter,
    };
    
    // Check if category already exists in list
    if (items.some(item => item.categoryId === newItem.categoryId)) {
      setItems(items.map(item => item.categoryId === newItem.categoryId ? newItem : item));
    } else {
      setItems([newItem, ...items]);
    }
    
    setForm({ ...form, categoryId: '' });
  };

  const handleDelete = (id: number) => {
    setItems(items.filter(item => item.categoryId !== id));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3 min-w-[300px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">Category</label>
            <div className="flex-1">
              <SearchableSelect
                autoFocus
                options={categoryOptions}
                value={form.categoryId}
                onChange={(val) => setForm({ ...form, categoryId: val })}
                placeholder="Search category..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 min-w-[220px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">KOT 1</label>
            <div className="flex-1">
              <SelectInput
                noMargin
                options={printerOptions}
                value={form.firstPrinter}
                onChange={(e) => setForm({ ...form, firstPrinter: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-[220px]">
            <label className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] whitespace-nowrap">KOT 2</label>
            <div className="flex-1">
              <SelectInput
                noMargin
                options={printerOptions}
                value={form.secondPrinter}
                onChange={(e) => setForm({ ...form, secondPrinter: e.target.value })}
              />
            </div>
          </div>

          <Button 
            variant="primary" 
            onClick={handleAdd}
            className="h-10.5 px-8 uppercase tracking-[0.2em] font-black text-[10px] shadow-sm ml-auto"
            disabled={!form.categoryId}
          >
            Add Mapping
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <RecordTableCard
          title="Category Wise Printer List"
          data={items}
          rowKey="categoryId"
          columns={[
            { header: "SNo", accessor: "categoryId", render: (_: any, index: number) => index + 1 },
            { header: "Category", accessor: "category" },
            { header: "First Printer", accessor: "firstPrinter" },
            { header: "Second Printer", accessor: "secondPrinter" },
            { 
              header: "Actions", 
              accessor: "categoryId",
              render: (row) => (
                <button 
                  onClick={() => handleDelete(row.categoryId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )
            }
          ]}
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-4">
          <Button 
            variant="primary" 
            onClick={() => onSave(items)}
            loading={loading}
            className="px-12 uppercase tracking-widest font-black text-[10px]"
          >
            Save Category Routing
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
        message="Are you sure you want to clear all category-wise printer settings?"
        onConfirm={() => {
          setItems([]);
          setShowDeleteAll(false);
        }}
        onCancel={() => setShowDeleteAll(false)}
      />
    </div>
  );
};
