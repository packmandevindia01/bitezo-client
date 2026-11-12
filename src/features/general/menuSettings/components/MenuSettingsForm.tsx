import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, Moon, Sun, AlertTriangle, Info } from "lucide-react";
import { FormInput, Checkbox, Button, Loader } from "../../../../components/common";
import type { MenuSettingsDetail, CreateMenuSettingsPayload } from "../types";
import {
  SESSION_PRESETS,
  crossesMidnight,
  durationMinutes,
  formatDuration,
  formatSessionHours,
  formatTime12,
  isAllDay,
  sessionsOverlap,
  toApiTime,
  toInputTime,
  toMinutes,
} from "../utils/sessionTime";
import { SessionTimelineAxis, SessionTimelineRow, type TimelineSession } from "./SessionTimeline";

const timeField = z.string().refine((v) => toMinutes(v) !== null, "Choose a time");

const menuSettingsSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code is too long"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  arabicName: z.string().max(100, "Arabic Name is too long"),
  startTime: timeField,
  endTime: timeField,
  isActive: z.boolean(),
});

type MenuSettingsFormValues = z.infer<typeof menuSettingsSchema>;

const handleEnterJump = (e: React.KeyboardEvent, nextId: string) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById(nextId)?.focus();
  }
};

const ALL_DAY = "00:00:00";
const DEFAULT_HOURS = { start: "06:00:00", end: "11:00:00" };

interface MenuSettingsFormProps {
  initialData: MenuSettingsDetail | null;
  detailLoading: boolean;
  saving: boolean;
  onSubmit: (data: Omit<CreateMenuSettingsPayload, "createdAt">) => void;
  onDelete?: () => void;
  /** The other sessions, drawn faintly on the timeline so overlaps are visible. */
  otherSessions?: TimelineSession[];
}

/**
 * Session hours: All day, or From → To with presets. A plain summary and a 24-hour bar show exactly when the session
 * runs (including past midnight) next to the other sessions.
 */
const SessionHoursField = ({
  start,
  end,
  onChange,
  disabled,
  name,
  otherSessions,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  name: string;
  otherSessions: TimelineSession[];
}) => {
  const allDay = isAllDay(start, end);
  const overnight = crossesMidnight(start, end);
  const overlapping = otherSessions.filter((s) => !s.inactive && sessionsOverlap([start, end], [s.start, s.end]));

  const setTime = (which: "start" | "end", value: string) => {
    const minutes = toMinutes(value);
    if (minutes === null) return;
    if (which === "start") onChange(toApiTime(minutes), end);
    else onChange(start, toApiTime(minutes));
  };

  const modeClass = (active: boolean) =>
    `flex-1 h-9 rounded-lg text-xs font-bold transition-colors ${
      active ? "bg-[#49293e] text-white shadow" : "text-slate-500 hover:text-[#49293e]"
    }`;

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-[#49293e]" />
        <span className="text-sm font-bold text-slate-700">Session hours</span>
        <span className="text-xs text-slate-400">— when this menu shows on the POS</span>
      </div>

      {/* All day / set hours */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Session hours">
        <button type="button" role="radio" aria-checked={allDay} disabled={disabled} className={modeClass(allDay)}
          onClick={() => onChange(ALL_DAY, ALL_DAY)}>
          All day
        </button>
        <button type="button" role="radio" aria-checked={!allDay} disabled={disabled} className={modeClass(!allDay)}
          onClick={() => { if (allDay) onChange(DEFAULT_HOURS.start, DEFAULT_HOURS.end); }}>
          Set hours
        </button>
      </div>

      {!allDay && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Sun size={12} /> From
              </span>
              <input
                id="startTime"
                type="time"
                step={60}
                value={toInputTime(start)}
                disabled={disabled}
                onChange={(e) => setTime("start", e.target.value)}
                onKeyDown={(e) => handleEnterJump(e, "endTime")}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Moon size={12} /> To
              </span>
              <input
                id="endTime"
                type="time"
                step={60}
                value={toInputTime(end)}
                disabled={disabled}
                onChange={(e) => setTime("end", e.target.value)}
                onKeyDown={(e) => handleEnterJump(e, "isActive")}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Quick:</span>
            {SESSION_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={disabled}
                tabIndex={-1}
                onClick={() => onChange(p.start, p.end)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#49293e] hover:text-[#49293e] transition-colors"
              >
                {p.label} <span className="text-slate-400">{formatTime12(p.start)}–{formatTime12(p.end)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Plain summary */}
      <div className="rounded-lg bg-[#49293e]/5 px-3 py-2 text-sm text-slate-700" aria-live="polite">
        {allDay ? (
          <span><b>Runs all day</b> — always shown on the POS.</span>
        ) : (
          <span>
            Runs <b>{formatTime12(start)}</b> → <b>{formatTime12(end)}</b>
            {overnight && <b> next day</b>} · {formatDuration(durationMinutes(start, end))}
          </span>
        )}
      </div>

      {overnight && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            Ends <b>after midnight</b> ({formatTime12(end)} the next morning). If you meant the same day, set To later than From
            (e.g. {formatTime12(start)} → {formatTime12(toApiTime((toMinutes(start) ?? 0) + 180))}).
          </span>
        </div>
      )}
      {overlapping.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            Overlaps with {overlapping.map((s) => `${s.name} (${formatSessionHours(s.start, s.end)})`).join(", ")}. Both show on the
            POS as separate tabs during that time.
          </span>
        </div>
      )}

      {/* Day timeline */}
      <div className="space-y-1.5">
        <SessionTimelineRow session={{ key: "this", name: name || "This session", start, end, highlight: true }} />
        {otherSessions.map((s) => <SessionTimelineRow key={s.key} session={s} />)}
        <SessionTimelineAxis />
      </div>
    </div>
  );
};

const MenuSettingsForm = ({
  initialData,
  detailLoading,
  saving,
  onSubmit,
  onDelete,
  otherSessions = [],
}: MenuSettingsFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsSchema),
    defaultValues: {
      code: "",
      name: "",
      arabicName: "",
      startTime: DEFAULT_HOURS.start,
      endTime: DEFAULT_HOURS.end,
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code || "",
        name: initialData.name || "",
        arabicName: initialData.arabicName || "",
        startTime: initialData.startTime || ALL_DAY,
        endTime: initialData.endTime || ALL_DAY,
        isActive: initialData.isActive !== false,
      });
    }
  }, [initialData, reset]);

  const name = watch("name");
  const others = useMemo(
    () => otherSessions.filter((s) => s.key !== initialData?.menuId),
    [otherSessions, initialData?.menuId],
  );

  const handleFormSubmit = (data: MenuSettingsFormValues) => {
    onSubmit({
      ...data,
      startTime: toApiTime(toMinutes(data.startTime) ?? 0),
      endTime: toApiTime(toMinutes(data.endTime) ?? 0),
    });
  };

  if (detailLoading) {
    return <Loader text="Loading details..." />;
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onKeyDown={(e) => handleEnterJump(e, "startTime")}
            error={errors.arabicName?.message}
          />
        </div>

        <Controller
          name="startTime"
          control={control}
          render={({ field: startField }) => (
            <Controller
              name="endTime"
              control={control}
              render={({ field: endField }) => (
                <SessionHoursField
                  start={startField.value}
                  end={endField.value}
                  disabled={saving}
                  name={name}
                  otherSessions={others}
                  onChange={(s, e) => { startField.onChange(s); endField.onChange(e); }}
                />
              )}
            />
          )}
        />
        {(errors.startTime || errors.endTime) && (
          <p className="text-xs text-red-600">{errors.startTime?.message || errors.endTime?.message}</p>
        )}

        <div className="pt-2 border-t border-gray-100">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isActive"
                label="Active Status"
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
          <Button type="submit" loading={saving} disabled={saving} className="w-24">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export default MenuSettingsForm;
