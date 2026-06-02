import { topAds } from "@/lib/mockData";
import { formatKRW, formatNumber } from "@/lib/format";

export default function CreativePerformance() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        Creative Performance
      </h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
            <th className="pb-3 font-medium">#</th>
            <th className="pb-3 font-medium">Ad</th>
            <th className="pb-3 text-right font-medium">Leads</th>
            <th className="pb-3 text-right font-medium">CPL</th>
          </tr>
        </thead>
        <tbody>
          {topAds.map((ad) => (
            <tr key={ad.rank} className="border-b border-slate-50 last:border-0">
              <td className="py-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {ad.rank}
                </span>
              </td>
              <td className="py-3 pr-3 font-medium text-slate-800">{ad.name}</td>
              <td className="py-3 text-right text-slate-600">
                {formatNumber(ad.leads)}
              </td>
              <td className="py-3 text-right font-medium text-slate-800">
                {formatKRW(ad.cpl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
