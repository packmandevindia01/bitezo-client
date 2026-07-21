import { Suspense, lazy } from "react";
import StatCard from "../components/StatCard";
import { Loader } from "../../../components/common";
import { useAdminDashboard } from "../hooks/useDashboardData";
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
  const { data: dashboardData, isLoading, isError } = useAdminDashboard();

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

  return (
    <div className="space-y-6">
      {/* 🔥 CARDS */}
      <div
        className="
          grid gap-4
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-5
        "
      >
        <StatCard
          title="Orders Today"
          value={statcard?.orderToday ?? 0}
          icon={<ShoppingCart size={18} />}
          color="#3b82f6"
          bgColor="#dbeafe"
          loading={isLoading}
        />

        <StatCard
          title="Customers Today"
          value={statcard?.customersToday ?? 0}
          icon={<Users size={18} />}
          color="#10b981"
          bgColor="#d1fae5"
          loading={isLoading}
        />

        <StatCard
          title="Sales Today"
          value={statcard?.salesToday ?? "0.000"}
          icon={<Banknote size={18} />}
          color="#f59e0b"
          bgColor="#fef3c7"
          loading={isLoading}
        />

        <StatCard
          title="Sales Total"
          value={statcard?.salesTotal ?? "0.000"}
          icon={<CreditCard size={18} />}
          color="#a855f7"
          bgColor="#f3e8ff"
          loading={isLoading}
        />

        <StatCard
          title="Employees"
          value={statcard?.employee ?? 0}
          icon={<UserCheck size={18} />}
          color="#64748b"
          bgColor="#f1f5f9"
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