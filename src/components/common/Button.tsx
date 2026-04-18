import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      onClick,
      type = "button",
      disabled = false,
      loading = false,
      fullWidth = false,
      className = "",
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-[#49293e] text-white hover:bg-[#3c2232]",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      sm: "px-3 py-1 text-xs md:text-sm",
      md: "px-3 md:px-4 py-2 text-sm",
      lg: "px-4 md:px-6 py-2 md:py-3 text-sm md:text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          rounded-md font-medium transition
          inline-flex items-center justify-center gap-2
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? "w-full" : ""}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
          focus:outline-none focus:ring-2 focus:ring-[#49293e] focus:ring-offset-1
          ${className}
        `}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? "Please wait..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
