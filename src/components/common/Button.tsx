import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  isAction?: boolean; // NEW: Enforces uniform size for form actions
  icon?: React.ReactNode; // NEW: Optional icon for standardizing
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
      isAction = false,
      icon,
      className = "",
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-[#49293e] text-white hover:bg-[#3c2232] border-2 border-[#49293e]",
      secondary: "bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-300",
      danger: "bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-300",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    // Uniform sizing for form action buttons
    const actionClasses = isAction 
      ? "min-w-[120px] h-10.5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200" 
      : "";

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          rounded-xl font-bold transition-all
          inline-flex items-center justify-center gap-2.5
          ${variants[variant]}
          ${!isAction ? sizes[size] : ""}
          ${actionClasses}
          ${fullWidth ? "w-full" : ""}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
          focus:outline-none focus:ring-2 focus:ring-[#49293e]/30 focus:ring-offset-1
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children && (
              <span>
                {children}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
