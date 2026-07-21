import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MonthlySale } from "../types";

interface Props {
  data: MonthlySale[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">{label.trim()}</p>
        <p className="text-sm font-semibold text-emerald-600">
          Amount: {Number(payload[0].value).toFixed(3)}
        </p>
      </div>
    );
  }
  return null;
};

const MonthlySalesChart = ({ data, loading }: Props) => {
  const chartData = data.map((d) => ({
    month: d.month.trim(),
    amount: Number(d.amount),
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-800">Monthly Sales</h3>
        <p className="text-xs text-gray-400 mt-0.5">Sales trends over the available months</p>
      </div>

      {loading ? (
        <div className="h-62.5 bg-gray-50 rounded-xl animate-pulse" style={{ height: 250 }} />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(val) => val.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#emeraldGrad)"
              dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default MonthlySalesChart;
