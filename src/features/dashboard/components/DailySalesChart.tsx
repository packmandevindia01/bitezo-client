import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { DailySale } from "../types";

interface Props {
  data: DailySale[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">{label.trim()}</p>
        <p className="text-sm font-semibold text-indigo-600">
          Amount: {Number(payload[0].value).toFixed(3)}
        </p>
      </div>
    );
  }
  return null;
};

const DailySalesChart = ({ data, loading }: Props) => {
  const chartData = data.map((d) => ({
    day: d.day.trim(),
    amount: Number(d.amount),
  }));

  const maxVal = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gray-800">Daily Sales</h3>
        <p className="text-xs text-gray-400 mt-0.5">Sales trends over the week</p>
      </div>

      {loading ? (
        <div className="h-62.5 flex items-end gap-2 px-2" style={{ height: 250 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-100 rounded-t-lg animate-pulse"
              style={{ height: `${Math.random() * 60 + 30}%` }}
            />
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="day"
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9", radius: 4 }} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.amount === maxVal ? "#6366f1" : "#c7d2fe"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DailySalesChart;
