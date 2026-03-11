import { MetricsCards } from "./components/MetricsCards";
import { OverviewChart } from "./components/OverviewChart";
import { RecentSitesTable } from "./components/RecentSitesTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Visão Geral do Painel</h1>
      <MetricsCards />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <OverviewChart />
        <RecentSitesTable />
      </div>
    </div>
  );
}
