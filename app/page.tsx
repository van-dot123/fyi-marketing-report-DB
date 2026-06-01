import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MetricCard from "@/components/MetricCard";
import SpendSessionsChart from "@/components/SpendSessionsChart";
import CreativePerformance from "@/components/CreativePerformance";
import AnalysisNotes from "@/components/AnalysisNotes";
import { metricSummaries } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title="Overview" />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {metricSummaries.map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </div>

          <div className="mt-6">
            <SpendSessionsChart />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CreativePerformance />
            <AnalysisNotes />
          </div>
        </main>
      </div>
    </div>
  );
}
