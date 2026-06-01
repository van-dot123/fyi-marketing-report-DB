"use client";

import MetricCard from "@/components/MetricCard";
import SpendSessionsChart from "@/components/SpendSessionsChart";
import CreativePerformance from "@/components/CreativePerformance";
import AnalysisNotes from "@/components/AnalysisNotes";
import { useDateRange } from "@/components/DateRangePicker";
import { filterWeeks, metricsFor } from "@/lib/mockData";

export default function Overview() {
  const { start, end } = useDateRange();
  const weeks = filterWeeks(start, end);
  const metrics = metricsFor(weeks);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-6">
        <SpendSessionsChart data={weeks} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CreativePerformance />
        <AnalysisNotes />
      </div>
    </>
  );
}
