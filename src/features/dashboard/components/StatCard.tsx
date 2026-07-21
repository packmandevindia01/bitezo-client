import React from "react";
import { TrendingUp } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: number; // percentage change, optional
  loading?: boolean;
}

const StatCard = ({ title, value, icon, color, bgColor, subtitle, trend, loading }: Props) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200">
      {/* Top row: icon + trend */}
      <div className="flex items-center justify-between">
        <div
          className="w-11 h-11 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: bgColor, color }}
        >
          {icon}
        </div>

        {trend !== undefined && (
          <span
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              backgroundColor: trend >= 0 ? "#dcfce7" : "#fee2e2",
              color: trend >= 0 ? "#16a34a" : "#dc2626",
            }}
          >
            <TrendingUp size={11} style={{ transform: trend < 0 ? "scaleY(-1)" : "none" }} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
      ) : (
        <div>
          <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{value}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
    </div>
  );
};

export default StatCard;