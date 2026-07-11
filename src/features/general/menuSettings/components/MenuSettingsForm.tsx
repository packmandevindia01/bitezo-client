import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormInput, Checkbox, Button, Loader } from "../../../../components/common";
import type { MenuSettingsDetail, CreateMenuSettingsPayload } from "../types";

const menuSettingsSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code is too long"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  arabicName: z.string().max(100, "Arabic Name is too long"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isActive: z.boolean(),
});

type MenuSettingsFormValues = z.infer<typeof menuSettingsSchema>;

const handleEnterJump = (e: React.KeyboardEvent, nextId: string) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById(nextId)?.focus();
  }
};

const TimePicker = ({ 
  label, 
  value, 
  onChange, 
  disabled,
  tabIndex,
  id,
  nextId,
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  disabled?: boolean;
  tabIndex?: number;
  id?: string;
  nextId?: string;
}) => {
  const [hh24, mmProp, ssProp] = (value || "00:00:00").split(":");
  const h24 = parseInt(hh24 || "0", 10);
  
  const isPM = h24 >= 12;
  const h12Prop = (h24 % 12 || 12).toString().padStart(2, "0");
  const ampmProp = isPM ? "PM" : "AM";

  const [h12, setH12] = useState(h12Prop);
  const [mm, setMm] = useState(mmProp || "00");
  const [ss, setSs] = useState(ssProp || "00");
  const [ampm, setAmpm] = useState(ampmProp);

  useEffect(() => {
    const [h, m, s] = (value || "00:00:00").split(":");
    const hNum = parseInt(h || "0", 10);
    setH12((hNum % 12 || 12).toString().padStart(2, "0"));
    setMm(m || "00");
    setSs(s || "00");
    setAmpm(hNum >= 12 ? "PM" : "AM");
  }, [value]);

  const commit = (newH12: string, newMm: string, newSs: string, newAmpm: string) => {
    let h24Val = parseInt(newH12, 10) || 0;
    if (newAmpm === "PM" && h24Val < 12) h24Val += 12;
    if (newAmpm === "AM" && h24Val === 12) h24Val = 0;
    
    const finalH = h24Val.toString().padStart(2, "0");
    const finalM = newMm.padStart(2, "0");
    const finalS = newSs.padStart(2, "0");
    onChange(`${finalH}:${finalM}:${finalS}`);
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
          <input 
            id={id ? `${id}-h` : undefined}
            type="number"
            value={h12}
            tabIndex={tabIndex}
            disabled={disabled}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setH12(e.target.value)}
            onKeyDown={(e) => handleEnterJump(e, id ? `${id}-m` : "")}
            onBlur={() => {
              let val = parseInt(h12, 10) || 12;
              if (val > 12) val = 12;
              if (val < 1) val = 12;
              const formatted = val.toString().padStart(2, "0");
              setH12(formatted);
              commit(formatted, mm, ss, ampm);
            }}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full text-center placeholder-slate-300 p-0 m-0 border-none focus:ring-0"
          />
          <span className="text-slate-300 font-bold">:</span>
          <input 
            id={id ? `${id}-m` : undefined}
            type="number"
            value={mm}
            tabIndex={tabIndex ? tabIndex + 1 : undefined}
            disabled={disabled}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setMm(e.target.value)}
            onKeyDown={(e) => handleEnterJump(e, id ? `${id}-s` : "")}
            onBlur={() => {
              let val = parseInt(mm, 10) || 0;
              if (val > 59) val = 59;
              if (val < 0) val = 0;
              const formatted = val.toString().padStart(2, "0");
              setMm(formatted);
              commit(h12, formatted, ss, ampm);
            }}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full text-center placeholder-slate-300 p-0 m-0 border-none focus:ring-0"
          />
          <span className="text-slate-300 font-bold">:</span>
          <input 
            id={id ? `${id}-s` : undefined}
            type="number"
            value={ss}
            tabIndex={tabIndex ? tabIndex + 2 : undefined}
            disabled={disabled}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setSs(e.target.value)}
            onKeyDown={(e) => handleEnterJump(e, id ? `${id}-ampm` : "")}
            onBlur={() => {
              let val = parseInt(ss, 10) || 0;
              if (val > 59) val = 59;
              if (val < 0) val = 0;
              const formatted = val.toString().padStart(2, "0");
              setSs(formatted);
              commit(h12, mm, formatted, ampm);
            }}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none w-full text-center placeholder-slate-300 p-0 m-0 border-none focus:ring-0"
          />
          
          <div className="w-px h-4 bg-slate-200 mx-1" />
          
          <button
            id={id ? `${id}-ampm` : undefined}
            type="button"
            tabIndex={tabIndex ? tabIndex + 3 : undefined}
            disabled={disabled}
            onKeyDown={(e) => nextId ? handleEnterJump(e, nextId) : undefined}
            onClick={() => {
              const newAmpm = ampm === "AM" ? "PM" : "AM";
              setAmpm(newAmpm);
              commit(h12, mm, ss, newAmpm);
            }}
            className="bg-transparent text-[10px] font-black text-[#49293e] outline-none cursor-pointer px-1 hover:bg-slate-200 rounded transition-colors"
          >
            {ampm}
          </button>
        </div>
      </div>
    </div>
  );
};

interface MenuSettingsFormProps {
  initialData: MenuSettingsDetail | null;
  detailLoading: boolean;
  saving: boolean;
  onSubmit: (data: Omit<CreateMenuSettingsPayload, "createdAt">) => void;
  onDelete?: () => void;
}

const MenuSettingsForm = ({
  initialData,
  detailLoading,
  saving,
  onSubmit,
  onDelete,
}: MenuSettingsFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsSchema),
    defaultValues: {
      code: "",
      name: "",
      arabicName: "",
      startTime: "00:00:00",
      endTime: "00:00:00",
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code || "",
        name: initialData.name || "",
        arabicName: initialData.arabicName || "",
        startTime: initialData.startTime || "00:00:00",
        endTime: initialData.endTime || "00:00:00",
        isActive: initialData.isActive !== false,
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: MenuSettingsFormValues) => {
    // Ensure seconds are included for time fields
    const formattedStartTime = data.startTime.split(":").length === 2 ? `${data.startTime}:00` : data.startTime;
    const formattedEndTime = data.endTime.split(":").length === 2 ? `${data.endTime}:00` : data.endTime;
    
    onSubmit({
      ...data,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
    });
  };

  if (detailLoading) {
    return <Loader text="Loading details..." />;
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            id="code"
            label="Code"
            autoFocus
            required
            tabIndex={1}
            {...register("code")}
            onKeyDown={(e) => handleEnterJump(e, "name")}
            error={errors.code?.message}
          />
          <FormInput
            id="name"
            label="Name"
            required
            tabIndex={2}
            {...register("name")}
            onKeyDown={(e) => handleEnterJump(e, "arabicName")}
            error={errors.name?.message}
          />
          <FormInput
            id="arabicName"
            label="Arabic Name"
            tabIndex={3}
            {...register("arabicName")}
            onKeyDown={(e) => handleEnterJump(e, "startTime-h")}
            error={errors.arabicName?.message}
          />
          <Controller
            name="startTime"
            control={control}
            render={({ field }) => (
              <TimePicker
                id="startTime"
                label="Start Time"
                value={field.value}
                onChange={field.onChange}
                disabled={saving}
                tabIndex={4}
                nextId="endTime-h"
              />
            )}
          />
          <Controller
            name="endTime"
            control={control}
            render={({ field }) => (
              <TimePicker
                id="endTime"
                label="End Time"
                value={field.value}
                onChange={field.onChange}
                disabled={saving}
                tabIndex={8}
                nextId="isActive"
              />
            )}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isActive"
                label="Active Status"
                tabIndex={12}
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between mt-auto rounded-b-xl shrink-0">
        <div>
          {onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={saving}
              tabIndex={-1}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => reset()}
            disabled={saving}
            className="w-24"
            tabIndex={-1}
          >
            Clear
          </Button>
          <Button type="submit" loading={saving} disabled={saving} className="w-24" tabIndex={13}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export default MenuSettingsForm;
