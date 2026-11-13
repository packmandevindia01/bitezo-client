import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FormProvider, type FieldValues, type UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { PageShell } from "../../../../components/common";

interface DocumentFormShellProps<T extends FieldValues> {
  title: string;
  methods: UseFormReturn<T>;
  /** List page the close button goes back to. */
  closeTo: string;
  /** Shown above the card when the master data (series, branches, ...) could not load. */
  masterError?: string | null;
  /** Card contents: header fields, line grid, footer. */
  children: ReactNode;
  /** Dialogs and windows of the page (inside the form, after the card). */
  dialogs?: ReactNode;
}

/**
 * Frame of a Back Office document page (Purchase Invoice / Return, Stock Adjustment, Physical Entry, Stock
 * Transfer): page title, the master-data error, the full-height card with its close button, and the page's dialogs.
 */
export const DocumentFormShell = <T extends FieldValues>({ title, methods, closeTo, masterError, children, dialogs }: DocumentFormShellProps<T>) => {
  const navigate = useNavigate();
  return (
    <PageShell title={title}>
      <FormProvider {...methods}>
        {masterError && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
            Error loading master data: {masterError}
          </div>
        )}

        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
          {/* Close Button in top right */}
          <button
            type="button"
            onClick={() => navigate(closeTo)}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
            tabIndex={-1}
          >
            <X size={18} />
          </button>

          {children}
        </div>

        {dialogs}
      </FormProvider>
    </PageShell>
  );
};
