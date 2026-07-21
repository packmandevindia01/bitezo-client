import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PaymodeSale } from "../types";

interface Props {
  data: PaymodeSale[];
  loading?: boolean;
}

const COLORS = ["#3b82f6", "#14b8a6", "#f97316", "#a855f7", "#ec4899"];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
        <p className="text-sm font-semibold text-gray-700">
          {payload[0].name}: {Number(payload[0].value).toFixed(3)}
        </p>
      </div>
    );
  }
  return null;
};

const PayModePieChart = ({ data, loading }: Props) => {
  const chartData = data.map((d, index) => ({
    name: d.paymode.trim(),
    value: Number(d.amount),
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Pay Modes</h3>
        <p className="text-xs text-gray-400 mt-0.5">Sales distribution by payment method</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <div className="w-48 h-24 bg-gray-100 rounded-t-full animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
                outerRadius="100%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", color: "#64748b" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PayModePieChart;
