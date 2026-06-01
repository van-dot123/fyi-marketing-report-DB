export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          FYI Vietnam Marketing Dashboard
        </h1>
        <p className="mt-2 text-slate-600">
          Weekly marketing performance across SNS, GA4, and Meta Ads.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">
          Dashboard coming soon
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Data sources are wired up via the Google Sheets API. Charts and
          metrics will render here.
        </p>
      </section>
    </main>
  );
}
