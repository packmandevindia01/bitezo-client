import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showClose?: boolean;
  footer?: React.ReactNode;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
  footer,
}: ModalProps) => {

  // 🔥 ESC + Scroll lock
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (isOpen) {
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
  }

  return () => {
    window.removeEventListener("keydown", handleEsc);
    document.body.style.overflow = "auto";
  };
}, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className={`
          relative w-full ${sizes[size]}
          max-h-[92vh] overflow-y-auto rounded-xl bg-white p-4 shadow-lg z-10 sm:max-h-[90vh] sm:p-6
          animate-[fadeIn_0.2s_ease-in-out]
        `}
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="mb-4 flex items-start justify-between gap-3">
          {title && (
            <h2
              id="modal-title"
              className="text-base font-semibold md:text-lg"
            >
              {title}
            </h2>
          )}

          {showClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="text-sm md:text-base">
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {footer}
          </div>
        )}

      </div>
    </div>
  );
};

export default Modal;
