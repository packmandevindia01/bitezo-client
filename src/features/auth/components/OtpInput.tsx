import { useRef } from "react";

interface Props {
    value: string[];
    onChange: (value: string[]) => void;
    onEnter?: () => void;
}

const OtpInput = ({ value, onChange, onEnter }: Props) => {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (val: string, index: number) => {
        if (!/^\d?$/.test(val)) return;

        const newOtp = [...value];
        newOtp[index] = val;
        onChange(newOtp);

        // 👉 move to next box
        if (val && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        // 👉 backspace go previous
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        } else if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").trim();
        
        if (!/^\d+$/.test(pastedData)) return;

        const digits = pastedData.split("").slice(0, 6);
        const newOtp = [...value];
        
        digits.forEach((digit, i) => {
            newOtp[i] = digit;
        });

        onChange(newOtp);

        const focusIndex = Math.min(digits.length, 5);
        inputs.current[focusIndex]?.focus();
    };

    return (
        <div className="flex justify-center gap-2 sm:gap-3">
            {value.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    autoFocus={index === 0 && window.innerWidth > 1024}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all placeholder:text-slate-300"
                />
            ))}
        </div>
    );
};

export default OtpInput;