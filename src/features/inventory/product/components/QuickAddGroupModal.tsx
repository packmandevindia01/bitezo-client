import { useEffect } from "react";
import { Button, Checkbox, FormInput, Modal } from "../../../../components/common";
import { Save, RotateCcw } from "lucide-react";
import { useQuickAddGroup } from "../hooks/useQuickAddGroup";
import { groupService } from "../../group/services/groupService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}

export const QuickAddGroupModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { form, handleSubmit, handleClear, isSaving } = useQuickAddGroup(onCreated, onClose);
  const { register, watch, setValue, formState: { errors } } = form;

  useEffect(() => {
    if (isOpen) {
      if (!form.getValues("code")) {
        groupService.getNextGroupCode()
          .then(code => form.setValue("code", code, { shouldValidate: true }))
          .catch(() => {});
      }
      setTimeout(() => {
        document.getElementById("q-grp-name")?.focus();
      }, 50);
    }
  }, [isOpen, form]);

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        setTimeout(() => {
          const target = document.getElementById(nextFieldId);
          if (target) {
            target.focus();
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
              try {
                target.setSelectionRange(0, target.value.length);
              } catch {
                target.select?.();
              }
            }
          }
        }, 10);
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
    setTimeout(() => {
      const fieldErrors = form.formState.errors;
      if (fieldErrors.code) {
        document.getElementById("q-grp-code")?.focus();
      } else if (fieldErrors.name) {
        document.getElementById("q-grp-name")?.focus();
      }
    }, 20);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Group" size="sm">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 pb-2">
        <FormInput
          id="q-grp-code"
          label="Code"
          required
          autoFocus
          maxLength={50}
          {...register("code")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!watch("code")?.trim()) {
                void form.trigger("code");
                document.getElementById("q-grp-code")?.focus();
                return;
              }
              handleKeyDown(e, "q-grp-name");
            }
          }}
          error={errors.code?.message}
        />
        <FormInput
          id="q-grp-name"
          label="Name"
          required
          maxLength={50}
          {...register("name")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!watch("name")?.trim()) {
                void form.trigger("name");
                document.getElementById("q-grp-name")?.focus();
                return;
              }
              handleKeyDown(e, "q-grp-arabic");
            }
          }}
          error={errors.name?.message}
        />
        <FormInput
          id="q-grp-arabic"
          label="Arabic Name"
          maxLength={50}
          {...register("arabicName")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!watch("code")?.trim()) {
                void form.trigger("code");
                document.getElementById("q-grp-code")?.focus();
                return;
              }
              if (!watch("name")?.trim()) {
                void form.trigger("name");
                document.getElementById("q-grp-name")?.focus();
                return;
              }
              handleKeyDown(e, "q-grp-save-btn");
            }
          }}
        />
        <div className="flex items-center h-10">
          <Checkbox
            id="q-grp-active"
            label="Active"
            checked={watch("isActive")}
            onChange={(e) => setValue("isActive", e.target.checked)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!watch("code")?.trim()) {
                  void form.trigger("code");
                  document.getElementById("q-grp-code")?.focus();
                  return;
                }
                if (!watch("name")?.trim()) {
                  void form.trigger("name");
                  document.getElementById("q-grp-name")?.focus();
                  return;
                }
                handleKeyDown(e, "q-grp-save-btn");
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={handleClear} tabIndex={-1} isAction icon={<RotateCcw size={16} />}>
            Clear
          </Button>
          <Button id="q-grp-save-btn" type="submit" loading={isSaving} isAction icon={<Save size={16} />}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
