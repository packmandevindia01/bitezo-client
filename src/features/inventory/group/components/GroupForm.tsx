import { useEffect, useState } from "react";
import { Trash2, Save, RotateCcw } from "lucide-react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
import type { GroupDetail, GroupForm as GroupFormState } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildInitialForm = (detail?: GroupDetail | null): GroupFormState => ({
  code: detail?.code ?? "",
  name: detail?.name ?? "",
  arabicName: detail?.arabicName ?? "",
  isActive: detail?.isActive ?? true,
  posStatus: detail?.posStatus ?? true,
  startTime: detail?.startTime ?? "00:00:00",
  endTime: detail?.endTime ?? "23:59:59",
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData?: GroupDetail | null;
  detailLoading?: boolean;
  saving?: boolean;
  onSubmit: (data: GroupFormState) => void;
  onDelete?: () => void;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const TimePicker = ({ 
  label, 
  value, 
  onChange, 
  disabled 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  disabled?: boolean;
}) => {
  const [hh24, mm, ss] = value.split(":");
  const h24 = parseInt(hh24, 10);
  
  const isPM = h24 >= 12;
  const h12 = h24 % 12 || 12;
  const ampm = isPM ? "PM" : "AM";
  
  const update = (h12Val: string, mmVal: string, ssVal: string, ampmVal: string) => {
    let h24Val = parseInt(h12Val, 10);
    if (ampmVal === "PM" && h24Val < 12) h24Val += 12;
    if (ampmVal === "AM" && h24Val === 12) h24Val = 0;
    
    const finalH = h24Val.toString().padStart(2, "0");
    onChange(`${finalH}:${mmVal}:${ssVal}`);
  };

  return (
    <div className="relative group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block px-1">
        {label}
      </label>
      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 group-focus-within:border-[#49293e] group-focus-within:ring-1 group-focus-within:ring-[#49293e]/10 transition-all">
        <div className="p-1.5 text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 2v10l4.5 4.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
          </svg>
        </div>
        
        <div className="flex flex-1 items-center gap-0.5">
          <select 
            value={h12.toString().padStart(2, "0")} 
            disabled={disabled}
            onChange={(e) => update(e.target.value, mm, ss, ampm)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full cursor-pointer appearance-none text-center"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const val = (i + 1).toString().padStart(2, "0");
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          <span className="text-slate-300 font-bold">:</span>
          <select 
            value={mm} 
            disabled={disabled}
            onChange={(e) => update(h12.toString(), e.target.value, ss, ampm)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full cursor-pointer appearance-none text-center"
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const val = i.toString().padStart(2, "0");
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          <span className="text-slate-300 font-bold">:</span>
          <select 
            value={ss} 
            disabled={disabled}
            onChange={(e) => update(h12.toString(), mm, e.target.value, ampm)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full cursor-pointer appearance-none text-center"
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const val = i.toString().padStart(2, "0");
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          
          <div className="w-px h-4 bg-slate-200 mx-1" />
          
          <select 
            value={ampm}
            disabled={disabled}
            onChange={(e) => update(h12.toString(), mm, ss, e.target.value)}
            className="bg-transparent text-[10px] font-black text-[#49293e] outline-none cursor-pointer appearance-none px-1"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const GroupForm = ({
  initialData,
  detailLoading = false,
  saving = false,
  onSubmit,
  onDelete,
}: Props) => {
  const [form, setForm] = useState<GroupFormState>(() => buildInitialForm(initialData));

  useEffect(() => {
    setForm(buildInitialForm(initialData));
  }, [initialData]);

  const handleChange = <K extends keyof GroupFormState>(key: K, value: GroupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(buildInitialForm(initialData));
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) return;

    onSubmit({
      ...form,
      code: form.code.trim().toUpperCase().replace(/\s/g, '_'),
      name: form.name.trim(),
      arabicName: form.arabicName.trim(),
    });
  };

  if (detailLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <FormInput
            label="Code"
            autoFocus
            tabIndex={1}
            value={form.code}
            disabled={saving}
            onChange={(e) => handleChange("code", e.target.value.toUpperCase().replace(/\s/g, '_'))}
            className="uppercase font-mono"
          />

          <FormInput
            label="Name"
            tabIndex={2}
            value={form.name}
            disabled={saving}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <FormInput
            label="Arabic Name"
            tabIndex={3}
            value={form.arabicName}
            disabled={saving}
            className="text-right"
            onChange={(e) => handleChange("arabicName", e.target.value)}
          />

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Display & Status</h4>
            <div className="flex flex-col gap-3">
              <Checkbox
                label="Active Status"
                tabIndex={4}
                checked={form.isActive}
                disabled={saving}
                onChange={(e) => handleChange("isActive", e.target.checked)}
              />
              <Checkbox
                label="Show on POS"
                tabIndex={5}
                checked={form.posStatus}
                disabled={saving}
                onChange={(e) => handleChange("posStatus", e.target.checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border-2 border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-[#49293e]/5 rounded-lg">
                <svg className="w-4 h-4 text-[#49293e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700">Service Schedule</h4>
            </div>

            <div className="space-y-6 flex-1">
              <TimePicker 
                label="Opening Time" 
                value={form.startTime} 
                onChange={(val) => handleChange("startTime", val)} 
                disabled={saving}
              />

              <TimePicker 
                label="Closing Time" 
                value={form.endTime} 
                onChange={(val) => handleChange("endTime", val)} 
                disabled={saving}
              />

              <div className="mt-4 p-3 bg-[#49293e]/5 rounded-lg border border-[#49293e]/10">
                <p className="text-[10px] text-[#49293e] font-medium leading-relaxed italic">
                  This group will only show on POS during the specified hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 mt-2">
        <Button 
          variant="secondary" 
          tabIndex={-1} 
          onClick={handleClear} 
          disabled={saving}
          isAction
          icon={<RotateCcw size={18} />}
        />
        <Button 
          tabIndex={9}
          onClick={handleSubmit} 
          disabled={saving || !form.code.trim() || !form.name.trim()}
          isAction
          loading={saving}
          icon={<Save size={18} />}
        />
        {initialData && (
          <Button
            variant="danger"
            tabIndex={10}
            onClick={onDelete}
            disabled={saving}
            isAction
            icon={<Trash2 size={18} />}
          />
        )}
      </div>
    </>
  );
};

export default GroupForm;