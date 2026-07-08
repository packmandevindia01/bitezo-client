import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showClose?: boolean;
  footer?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  noScroll?: boolean;
  hideScrollbar?: boolean;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
  footer,
  className = "",
  noPadding = false,
  noScroll = false,
  hideScrollbar = false,
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
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-3 sm:px-4"
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
          relative flex flex-col w-full ${sizes[size]}
          max-h-[90vh] rounded-xl bg-white shadow-lg z-10
          animate-[fadeIn_0.2s_ease-in-out]
          ${noPadding ? "p-0" : "p-4 sm:p-6"}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        {(title || showClose) && !noPadding && (
          <div className="mb-4 flex items-start justify-between gap-3 shrink-0">
            {title && (
              <h2
                id="modal-title"
                className="text-base font-semibold md:text-lg"
              >
                {title}
              </h2>
            )}

            <div className="flex items-center gap-2">
              {showClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Close"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className={`flex-1 min-h-0 flex flex-col ${noScroll ? "overflow-hidden" : "overflow-y-auto"} ${hideScrollbar ? "scrollbar-hide" : ""} text-sm md:text-base ${noPadding ? "" : "pr-1"}`}>
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
