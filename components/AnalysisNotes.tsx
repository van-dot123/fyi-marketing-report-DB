"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { analysisNotes, AnalysisNote } from "@/lib/mockData";

export default function AnalysisNotes() {
  const [notes, setNotes] = useState<AnalysisNote[]>(analysisNotes);
  const [draft, setDraft] = useState("");

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      {
        id: `n${Date.now()}`,
        author: "You",
        text,
        date: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setDraft("");
  };

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">
        Analysis Notes
      </h2>

      <ul className="mb-4 flex-1 space-y-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-500">{note.author}</span>
              <span>{note.date}</span>
            </div>
            <p className="text-sm text-slate-700">{note.text}</p>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder="Add a note…"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          onClick={addNote}
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </section>
  );
}
