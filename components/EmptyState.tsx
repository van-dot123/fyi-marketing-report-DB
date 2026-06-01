import { Inbox } from "lucide-react";

export default function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Inbox className="h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm font-medium text-slate-600">{title}</p>
      {message && <p className="mt-1 text-xs text-slate-400">{message}</p>}
    </div>
  );
}
