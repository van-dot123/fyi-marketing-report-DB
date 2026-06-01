import { Inbox, PlugZap } from "lucide-react";

type Variant = "connecting" | "no-data";

const COPY: Record<Variant, { title: string; message: string }> = {
  connecting: {
    title: "Connecting to Supabase…",
    message: "Set NEXT_PUBLIC_SUPABASE_URL or check the connection.",
  },
  "no-data": {
    title: "No submissions yet",
    message: "The salary_submissions table returned no rows.",
  },
};

export default function EmptyState({
  variant,
  title,
  message,
}: {
  variant?: Variant;
  title?: string;
  message?: string;
}) {
  const copy = variant ? COPY[variant] : { title: title ?? "No data", message };
  const Icon = variant === "connecting" ? PlugZap : Inbox;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Icon className="h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-600">{copy.title}</p>
      {copy.message && <p className="mt-1 text-xs text-slate-400">{copy.message}</p>}
    </div>
  );
}
