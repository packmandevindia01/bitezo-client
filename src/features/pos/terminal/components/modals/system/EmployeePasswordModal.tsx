import { useState } from "react";
import { Check, Delete, XCircle } from "lucide-react";
import { Modal } from "../../../../../../components/common";

interface EmployeePasswordModalProps {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (password: string) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Back"];

export const EmployeePasswordModal = ({
  isOpen,
  loading,
  error,
  onClose,
  onSubmit,
}: EmployeePasswordModalProps) => {
  const [password, setPassword] = useState("");

  const handleKeyPress = (key: string) => {
    if (loading) return;

    if (key === "Clear") {
      setPassword("");
      return;
    }

    if (key === "Back") {
      setPassword((prev) => prev.slice(0, -1));
      return;
    }

    if (password.length < 12) {
      setPassword((prev) => `${prev}${key}`);
    }
  };

  const handleSubmit = () => {
    if (!password || loading) return;
    const passwordToValidate = password;
    setPassword("");
    onSubmit(passwordToValidate);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      noPadding
      showClose={false}
      className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className="bg-[#49293e] text-white py-3 px-4 flex justify-between items-center shrink-0">
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Employee Code</h2>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 disabled:opacity-30" disabled={loading} tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <div className="bg-[#f8fafc] p-4 space-y-3">
        <div className="bg-[#1e293b] p-4 rounded-2xl shadow-xl flex flex-col items-end relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Enter employee password</span>
          <div className="w-full min-h-[48px] text-right text-4xl font-black text-white font-mono tracking-normal leading-none flex items-center justify-end">
            {password ? "*".repeat(password.length) : ""}
          </div>
        </div>

        <div className="min-h-[32px] flex items-center shrink-0">
          {error ? (
            <div className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[10px] font-black uppercase tracking-wider text-red-600">
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              disabled={loading}
              className={`
                h-12 rounded-xl text-lg font-black transition-all active:scale-90 shadow-sm border border-slate-400 disabled:opacity-50
                ${key === "Clear"
                  ? "bg-red-50 text-red-600 border-red-400"
                  : key === "Back"
                    ? "bg-slate-100 text-slate-700 border-slate-300"
                    : "bg-white text-slate-700 hover:bg-slate-50"}
              `}
            >
              {key === "Back" ? <Delete className="mx-auto" size={22} /> : key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-12 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-all disabled:opacity-50"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!password || loading}
            className="h-12 bg-[#ff9500] text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
