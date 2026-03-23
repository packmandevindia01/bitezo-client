interface LoaderProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const Loader = ({
  fullScreen = false,
  size = "md",
  text,
  className = "",
}: LoaderProps) => {

  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-2
        ${fullScreen ? "fixed inset-0 bg-black/20 z-50" : ""}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Spinner */}
      <div
        className={`
          ${sizes[size]}
          border-[#49293e] border-t-transparent
          rounded-full animate-spin
        `}
      />

      {/* Text */}
      {text && (
        <p className="text-sm text-gray-600">
          {text}
        </p>
      )}
    </div>
  );
};

export default Loader;