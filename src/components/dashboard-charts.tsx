"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

function formatRupiahShort(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
}

export function SalesTrendChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E85D2C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#E85D2C" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B6058" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#6B6058" }} axisLine={false} tickLine={false}
          tickFormatter={formatRupiahShort} width={45} />
        <Tooltip
          formatter={(v: number) => ["Rp " + v.toLocaleString("id-ID"), "Penjualan"]}
          contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #F0E2D6" }}
        />
        <Area type="monotone" dataKey="total" stroke="#E85D2C" strokeWidth={2.5} fill="url(#salesFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const STOCK_COLORS: Record<string, string> = {
  Aman: "#2F9E68",
  Menipis: "#F5A524",
  Kritis: "#E5484D",
};

export function StockStatusDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="text-xs text-ink-soft text-center py-8">Belum ada produk</div>;
  }
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={110} height={110}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={32}
            outerRadius={52}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={STOCK_COLORS[d.name] ?? "#C9A15C"} opacity={0.85} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: STOCK_COLORS[d.name] ?? "#C9A15C" }}
            />
            <span className="text-ink-soft">{d.name}</span>
            <span className="font-mono font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
