"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  action: string;
  module: string;
  description: string;
  created_at: string;
  profiles: { full_name: string } | null;
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  insert: "Menambah",
  update: "Mengubah",
  delete: "Menghapus",
};

export function ActivityLogTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("semua");

  const modules = useMemo(
    () => Array.from(new Set(rows.map((r) => r.module))),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        (r.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchModule = moduleFilter === "semua" || r.module === moduleFilter;
      return matchSearch && matchModule;
    });
  }, [rows, search, moduleFilter]);

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2.5 mb-5">
        <input
          placeholder="Cari nama pengguna / aktivitas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-line px-3.5 py-2 text-sm w-64"
        />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="rounded-xl border border-line px-3 py-2 text-sm bg-white"
        >
          <option value="semua">Semua modul</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-start gap-3 border-b border-line pb-2.5 last:border-0">
            <span className="text-[10px] font-bold px-2 py-1 rounded-pill bg-orange-soft text-orange-deep uppercase shrink-0">
              {ACTION_LABEL[r.action] ?? r.action}
            </span>
            <div className="flex-1 text-sm">
              <span className="font-semibold">{r.profiles?.full_name ?? "Sistem"}</span>{" "}
              <span className="text-ink-soft">{r.description}</span>
            </div>
            <div className="text-[11px] text-ink-soft font-mono shrink-0">
              {formatDateTime(r.created_at)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-soft py-6 text-center">Belum ada aktivitas tercatat.</p>
        )}
      </div>
    </div>
  );
}
