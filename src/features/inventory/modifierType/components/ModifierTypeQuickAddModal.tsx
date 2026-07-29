import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, Button } from '../../../../components/common';
import { RotateCcw, Save } from 'lucide-react';
import ModifierTypeForm from './ModifierTypeForm';
import { useCreateModifierType } from '../hooks/useModifierTypeQueries';
import { modifierTypeFormSchema, type ModifierTypeForm as ModifierTypeFormType } from '../schemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: number) => void;
}

export const ModifierTypeQuickAddModal = ({ isOpen, onClose, onSuccess }: Props) => {
  const createMutation = useCreateModifierType();
  const form = useForm<ModifierTypeFormType>({
    resolver: zodResolver(modifierTypeFormSchema) as any,
    defaultValues: { name: '', arabicName: '', price: 0 },
  });

  const closeModal = () => {
    form.reset();
    onClose();
  };

  const onSubmit = (data: ModifierTypeFormType) => {
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
      title="Add Modifier Type"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => form.reset()} disabled={createMutation.isPending} tabIndex={-1} isAction icon={<RotateCcw size={18} />}>
            Clear
          </Button>
          <Button id="modtype-save" onClick={form.handleSubmit(onSubmit as any)} loading={createMutation.isPending} isAction icon={<Save size={18} />}>
            Save
          </Button>
        </div>
      }
    >
      <ModifierTypeForm form={form} />
    </Modal>
  );
};
