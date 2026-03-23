import { useState, useEffect } from "react";
import { Button } from "../../../components/common";
import OtpInput from "./OtpInput";

interface Props {
  onSubmit: (otp: string) => void;
}

const OtpForm = ({ onSubmit }: Props) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  // ⏱ TIMER
  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Enter complete OTP");
      return;
    }

    setError("");
    onSubmit(otpValue);
  };

  const handleResend = () => {
    console.log("Resend OTP");
    setTimer(30);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* OTP BOXES */}
      <OtpInput value={otp} onChange={setOtp} />

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      {/* VERIFY BUTTON */}
      <Button onClick={handleSubmit} className="w-full">
        Verify OTP
      </Button>

      {/* RESEND */}
      <div className="text-center text-sm text-gray-600">
        {timer > 0 ? (
          <p>Resend in {timer}s</p>
        ) : (
          <button
            onClick={handleResend}
            className="text-[#49293e] font-medium hover:underline"
          >
            Resend OTP
          </button>
        )}
      </div>

    </div>
  );
};

export default OtpForm;