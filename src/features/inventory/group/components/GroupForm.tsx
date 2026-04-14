import { useEffect, useState } from "react";
import { Button, FormInput } from "../../../../components/common";
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
  /** Server-side error message to display inside the form. */
  error?: string | null;
  onSubmit: (data: GroupFormState) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GroupForm = ({
  initialData,
  detailLoading = false,
  saving = false,
  error,
  onSubmit,
  onCancel,
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
      <h2 className="mb-6 text-center text-lg font-bold">GROUP MASTER</h2>

      {/* Server-side error banner */}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex max-w-sm flex-col gap-4">
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

        {/* Active toggle */}
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 select-none">
          <input
            type="checkbox"
            checked={form.isActive}
            disabled={saving}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e]"
          />
          Active
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={handleClear} disabled={saving}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving || !form.code.trim() || !form.name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
};

export default GroupForm;