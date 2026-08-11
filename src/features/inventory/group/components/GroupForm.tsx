import { useEffect, useState } from "react";
import { Trash2, Save, RotateCcw } from "lucide-react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
import { groupService } from "../services/groupService";
import type { GroupDetail, GroupForm as GroupFormState } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildInitialForm = (detail?: GroupDetail | null): GroupFormState => ({
  code: detail?.code ?? "",
  name: detail?.name ?? "",
  arabicName: detail?.arabicName ?? "",
  isActive: detail?.isActive ?? true,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData?: GroupDetail | null;
  detailLoading?: boolean;
  saving?: boolean;
  onSubmit: (data: GroupFormState) => void;
  onDelete?: () => void;
}

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
    
    if (!initialData) {
      groupService.getNextGroupCode()
        .then(code => setForm(prev => ({ ...prev, code })))
        .catch(() => {}); // ignore error, user can still type it manually
    }
  }, [initialData]);

  const handleChange = <K extends keyof GroupFormState>(key: K, value: GroupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(buildInitialForm(null));
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    onSubmit(form);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  if (detailLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10.5 rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 mb-4">
        <FormInput
          id="grp-code"
          label="Code"
          tabIndex={1}
          value={form.code}
          disabled={saving}
          readOnly
          className="uppercase font-mono cursor-not-allowed text-slate-500 bg-slate-50"
        />

        <FormInput
          id="grp-name"
          label="Name"
          autoFocus
          tabIndex={2}
          value={form.name}
          disabled={saving}
          onChange={(e) => handleChange("name", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "grp-arabic")}
        />

        <FormInput
          id="grp-arabic"
          label="Arabic Name"
          tabIndex={3}
          value={form.arabicName}
          disabled={saving}
          className="text-right"
          onChange={(e) => handleChange("arabicName", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e)}
        />

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <Checkbox
            label="Active Status"
            tabIndex={4}
            checked={form.isActive}
            disabled={saving}
            onChange={(e) => handleChange("isActive", e.target.checked)}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
        <Button 
          variant="secondary" 
          tabIndex={-1} 
          onClick={handleClear} 
          disabled={saving}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>
        <Button 
          tabIndex={5}
          onClick={handleSubmit} 
          disabled={saving || !form.code.trim() || !form.name.trim()}
          isAction
          loading={saving}
          icon={<Save size={18} />}
        >
          Save
        </Button>
        {initialData && (
          <Button
            variant="danger"
            tabIndex={6}
            onClick={onDelete}
            disabled={saving}
            isAction
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default GroupForm;