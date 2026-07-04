import { Button, Checkbox, FormInput, Modal } from "../../../../components/common";
import { Save, RotateCcw } from "lucide-react";
import { useQuickAddGroup } from "../hooks/useQuickAddGroup";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}

export const QuickAddGroupModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { form, handleSubmit, handleClear, isSaving } = useQuickAddGroup(onCreated, onClose);
  const { register, watch, setValue, formState: { errors } } = form;

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Group" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
        <FormInput
          id="q-grp-code"
          label="Code"
          required
          autoFocus
          {...register("code")}
          onKeyDown={(e) => handleKeyDown(e, "q-grp-name")}
          error={errors.code?.message}
        />
        <FormInput
          id="q-grp-name"
          label="Name"
          required
          {...register("name")}
          onKeyDown={(e) => handleKeyDown(e, "q-grp-arabic")}
          error={errors.name?.message}
        />
        <FormInput
          id="q-grp-arabic"
          label="Arabic Name"
          {...register("arabicName")}
          onKeyDown={(e) => handleKeyDown(e, "q-grp-active")}
        />
        <div className="flex items-center h-10">
          <Checkbox
            id="q-grp-active"
            label="Active"
            checked={watch("isActive")}
            onChange={(e) => setValue("isActive", e.target.checked)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={handleClear} tabIndex={-1} isAction icon={<RotateCcw size={16} />}>
            Clear
          </Button>
          <Button type="submit" loading={isSaving} isAction icon={<Save size={16} />}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
