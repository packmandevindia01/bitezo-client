import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button } from '../../../../components/common';
import { RotateCcw, Save } from 'lucide-react';
import ExtrasTypeForm from './ExtrasTypeForm';
import { useCreateExtrasType } from '../hooks/useExtrasTypeQueries';
import { extrasTypeFormSchema, type ExtrasTypeForm as ExtrasTypeFormType } from '../schemas';
import { useToast } from '../../../../app/providers/useToast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: number) => void;
}

export const ExtrasTypeQuickAddModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const { showToast } = useToast();
  const createMutation = useCreateExtrasType();
  const form = useForm<ExtrasTypeFormType>({
    resolver: zodResolver(extrasTypeFormSchema) as any,
    defaultValues: { name: '', arabicName: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.clearErrors();
      form.reset({ name: '', arabicName: '' });
      setTimeout(() => {
        const el = document.getElementById('exttype-name');
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
    }
  }, [isOpen, form]);

  const closeModal = () => {
    form.clearErrors();
    form.reset();
    onClose();
  };

  const onSubmit = (data: ExtrasTypeFormType) => {
    createMutation.mutate(data, {
      onSuccess: (res) => {
        closeModal();
        if (onSuccess) onSuccess((res as any).id ?? (res as any).typeId ?? res);
      }
    });
  };

  const onInvalid = (errors: any) => {
    if (errors.name) {
      if (errors.name?.message) {
        showToast(String(errors.name.message), 'error');
      }
      setTimeout(() => {
        const el = document.getElementById('exttype-name');
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
    } else if (errors.arabicName) {
      if (errors.arabicName?.message) {
        showToast(String(errors.arabicName.message), 'error');
      }
      setTimeout(() => {
        const el = document.getElementById('exttype-arabicName');
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
    }
  };

  const handleSave = form.handleSubmit(onSubmit as any, onInvalid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Add Extras Type"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
          <Button
            variant="secondary"
            onClick={() => {
              form.reset({ name: '', arabicName: '' });
              form.clearErrors();
              setTimeout(() => {
                const el = document.getElementById('exttype-name');
                el?.focus();
              }, 10);
            }}
            disabled={createMutation.isPending}
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button
            id="exttype-save"
            onClick={handleSave}
            loading={createMutation.isPending}
            isAction
            icon={<Save size={18} />}
          >
            Save
          </Button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <ExtrasTypeForm form={form} onSave={handleSave} saveButtonId="exttype-save" />
      </form>
    </Modal>
  );
};
