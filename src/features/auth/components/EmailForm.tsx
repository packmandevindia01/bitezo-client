import { useState } from "react";
import { FormInput, Button } from "../../../components/common";
import { isValidEmail } from "../../../utils/validators";

interface Props {
  onSubmit: (email: string) => void;
}

const EmailForm = ({ onSubmit }: Props) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Invalid email");
      return;
    }

    setError("");
    onSubmit(email);
  };

  return (
    <div className="flex flex-col gap-4">

      <FormInput
        label="Email Address"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />

      <Button onClick={handleSubmit} className="w-full">
        Send OTP
      </Button>

    </div>
  );
};

export default EmailForm;