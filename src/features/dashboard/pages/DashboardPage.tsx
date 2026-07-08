import { lazy, Suspense } from "react";
import StatCard from "../components/StatCard";
import { Loader } from "../../../components/common";

const SalesChart = lazy(() => import("../components/SalesChart"));
const PurchaseChart = lazy(() => import("../components/PurchaseChart"));

import {
  ShoppingCart,
  Users,
  UserCheck,
  User,
} from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="space-y-6">

      {/* 🔥 CARDS */}
      <div
        className="
          grid gap-4
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4
        "
      >

        {/* Sales */}
        <StatCard
          title="Sales (Month)"
          value="6906.434"
          icon={<ShoppingCart size={18} />}
          color="#3b82f6"
        />

        {/* Customers */}
        <StatCard
          title="Customers"
          value="9319"
          icon={<Users size={18} />}
          color="#22c55e"
        />

        {/* Demo Customers */}
        <StatCard
          title="Demo Customers"
          value="120"
          icon={<UserCheck size={18} />}
          color="#a855f7"
        />

        {/* Users */}
        <StatCard
          title="Users"
          value="256"
          icon={<User size={18} />}
          color="#64748b"
        />

      </div>

      {/* 🔥 CHARTS */}
      <div
        className="
          grid gap-4
          grid-cols-1 
          lg:grid-cols-2
        "
      >

        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-lg shadow-sm"><Loader text="Loading chart..." /></div>}>
          <PurchaseChart />
        </Suspense>
        <Suspense fallback={<div className="h-64 flex items-center justify-center bg-white rounded-lg shadow-sm"><Loader text="Loading chart..." /></div>}>
          <SalesChart />
        </Suspense>

      </div>

    </div>
  );
};

export default DashboardPage;