import React from "react";
import { PosDeliveryPage } from "../pages/PosDeliveryPage";

interface PosDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosDeliveryModal: React.FC<PosDeliveryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <PosDeliveryPage isModal={true} onCloseModal={onClose} />;
};

export default PosDeliveryModal;
