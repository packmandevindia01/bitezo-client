import { useRef } from "react";

interface Props {
    value: string[];
    onChange: (value: string[]) => void;
}

const OtpInput = ({ value, onChange }: Props) => {
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
        }
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
                    autoFocus={index === 0 && window.innerWidth > 1024}
                    className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all placeholder:text-slate-300"
                />
            ))}
        </div>
    );
};

export default OtpInput;