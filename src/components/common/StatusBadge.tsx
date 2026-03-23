interface Props {
  status: "active" | "inactive" | "pending" | "completed" | string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const StatusBadge = ({
  status,
  label,
  size = "sm",
  className = "",
}: Props) => {

  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-600",
    inactive: "bg-red-100 text-red-600",
    pending: "bg-yellow-100 text-yellow-600",
    completed: "bg-blue-100 text-blue-600",
    default: "bg-gray-100 text-gray-600",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded font-medium
        ${sizes[size]}
        ${styles[status] || styles.default}
        ${className}
      `}
    >
      {label || status}
    </span>
  );
};

export default StatusBadge;