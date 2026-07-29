import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button } from '../../../../components/common';
import { RotateCcw, Save } from 'lucide-react';
import ExtrasTypeForm from './ExtrasTypeForm';
import { useCreateExtrasType } from '../hooks/useExtrasTypeQueries';
import { extrasTypeFormSchema, type ExtrasTypeForm as ExtrasTypeFormType } from '../schemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: number) => void;
}

export const ExtrasTypeQuickAddModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const createMutation = useCreateExtrasType();
  const form = useForm<ExtrasTypeFormType>({
    resolver: zodResolver(extrasTypeFormSchema) as any,
    defaultValues: { name: '', arabicName: '' },
  });

  const closeModal = () => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Add Extras Type"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => form.reset()} disabled={createMutation.isPending} tabIndex={-1} isAction icon={<RotateCcw size={18} />}>
            Clear
          </Button>
          <Button id="exttype-save" onClick={form.handleSubmit(onSubmit as any)} loading={createMutation.isPending} isAction icon={<Save size={18} />}>
            Save
          </Button>
        </div>
      }
    >
      <ExtrasTypeForm form={form} />
    </Modal>
  );
};
