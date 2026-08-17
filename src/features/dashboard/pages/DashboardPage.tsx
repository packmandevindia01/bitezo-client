import { Suspense, lazy } from "react";
import StatCard from "../components/StatCard";
import { Loader } from "../../../components/common";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  ShoppingCart,
  Users,
  UserCheck,
  CreditCard,
  Banknote
} from "lucide-react";

// Lazy loaded charts
const MonthlySalesChart = lazy(() => import("../components/MonthlySalesChart"));
const DailySalesChart = lazy(() => import("../components/DailySalesChart"));
const OrderTypePieChart = lazy(() => import("../components/OrderTypePieChart"));
const PayModePieChart = lazy(() => import("../components/PayModePieChart"));

const DashboardPage = () => {
  const { data: dashboardData, isLoading, isError, mode } = useDashboardData();

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-100">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    );
  }

  const statcard = dashboardData?.statcard;
  const hasSalesTotal = statcard?.salesTotal !== undefined && statcard?.salesTotal !== null;
  const isUserMode = mode === "user";

  // Theme palettes: Admin vs User Dashboard
  const theme = isUserMode
    ? {
        badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
        badgeText: "User Dashboard",
        card1: { color: "#0d9488", bgColor: "#ccfbf1" }, // Teal
        card2: { color: "#0284c7", bgColor: "#e0f2fe" }, // Sky Blue
        card3: { color: "#059669", bgColor: "#d1fae5" }, // Emerald
        card4: { color: "#e11d48", bgColor: "#ffe4e6" }, // Rose (Employees)
      }
    : {
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        badgeText: "Admin Dashboard",
        card1: { color: "#3b82f6", bgColor: "#dbeafe" }, // Blue
        card2: { color: "#10b981", bgColor: "#d1fae5" }, // Green
        card3: { color: "#f59e0b", bgColor: "#fef3c7" }, // Amber
        cardSalesTotal: { color: "#a855f7", bgColor: "#f3e8ff" }, // Purple
        card4: { color: "#64748b", bgColor: "#f1f5f9" }, // Slate
      };

  return (
    <div className="space-y-6">
      {/* Dashboard Mode Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-sm ${theme.badgeBg}`}>
            {theme.badgeText}
          </span>
        </div>
      </div>

      {/* 🔥 CARDS */}
      <div
        className={`
          grid gap-4
          grid-cols-1 
          sm:grid-cols-2 
          ${hasSalesTotal ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-2 lg:grid-cols-4"}
        `}
      >
        <StatCard
          title="Orders Today"
          value={statcard?.orderToday ?? 0}
          icon={<ShoppingCart size={18} />}
          color={theme.card1.color}
          bgColor={theme.card1.bgColor}
          loading={isLoading}
        />

        <StatCard
          title="Customers Today"
          value={statcard?.customersToday ?? 0}
          icon={<Users size={18} />}
          color={theme.card2.color}
          bgColor={theme.card2.bgColor}
          loading={isLoading}
        />

        <StatCard
          title="Sales Today"
          value={statcard?.salesToday ?? "0.000"}
          icon={<Banknote size={18} />}
          color={theme.card3.color}
          bgColor={theme.card3.bgColor}
          loading={isLoading}
        />

        {hasSalesTotal && (
          <StatCard
            title="Sales Total"
            value={statcard?.salesTotal ?? "0.000"}
            icon={<CreditCard size={18} />}
            color={theme.cardSalesTotal?.color || "#a855f7"}
            bgColor={theme.cardSalesTotal?.bgColor || "#f3e8ff"}
            loading={isLoading}
          />
        )}

        <StatCard
          title="Employees"
          value={statcard?.employee ?? 0}
          icon={<UserCheck size={18} />}
          color={theme.card4.color}
          bgColor={theme.card4.bgColor}
          loading={isLoading}
        />
      </div>

      {/* 🔥 CHARTS (Line & Bar) */}
      <div
        className="
          grid gap-4
          grid-cols-1 
          lg:grid-cols-2
        "
      >
        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><Loader text="Loading chart..." /></div>}>
          <MonthlySalesChart data={dashboardData?.monthlysales ?? []} loading={isLoading} />
        </Suspense>
        
        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><Loader text="Loading chart..." /></div>}>
          <DailySalesChart data={dashboardData?.dailysales ?? []} loading={isLoading} />
        </Suspense>
      </div>

      {/* 🔥 CHARTS (Half Pies) */}
      <div
        className="
          grid gap-4
          grid-cols-1 
          lg:grid-cols-2
        "
      >
        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><Loader text="Loading chart..." /></div>}>
          <OrderTypePieChart data={dashboardData?.ordertypsales ?? []} loading={isLoading} />
        </Suspense>
        
        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100"><Loader text="Loading chart..." /></div>}>
          <PayModePieChart data={dashboardData?.paymodesales ?? []} loading={isLoading} />
        </Suspense>
      </div>

    </div>
  );
};

export default DashboardPage;