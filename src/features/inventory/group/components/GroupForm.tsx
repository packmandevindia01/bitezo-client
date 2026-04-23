import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
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
  /** Populated when editing an existing group; null / undefined for create. */
  initialData?: GroupDetail | null;
  /** True while the parent is fetching the detail record for edit mode. */
  detailLoading?: boolean;
  /** True while the save mutation is in flight. */
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

  // Re-populate form when detail arrives asynchronously (edit mode)
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
      code: form.code.trim(),
      name: form.name.trim(),
      arabicName: form.arabicName.trim(),
      isActive: form.isActive,
    });
  };

  // ── Loading skeleton while edit detail is being fetched ───────────────────
  if (detailLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex max-w-sm flex-col gap-4 mb-6">
        <FormInput
          label="Code"
          autoFocus
          value={form.code}
          disabled={saving}
          onChange={(e) => handleChange("code", e.target.value)}
        />

        <FormInput
          label="Name"
          value={form.name}
          disabled={saving}
          onChange={(e) => handleChange("name", e.target.value)}
        />

        <FormInput
          label="Arabic Name"
          value={form.arabicName}
          disabled={saving}
          onChange={(e) => handleChange("arabicName", e.target.value)}
        />

        <Checkbox
          label="Active"
          checked={form.isActive}
          disabled={saving}
          onChange={(e) => handleChange("isActive", e.target.checked)}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={handleClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !form.code.trim() || !form.name.trim()}>
          {saving ? "Saving…" : initialData ? "Update" : "Save"}
        </Button>
        {initialData && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
          >
            <Trash2 size={16} />
            Delete Group
          </Button>
        )}
      </div>
    </>
  );
};

export default GroupForm;