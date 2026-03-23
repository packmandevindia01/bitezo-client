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
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg border rounded-md outline-none focus:ring-2 focus:ring-[#49293e]"
                />
            ))}
        </div>
    );
};

export default OtpInput;