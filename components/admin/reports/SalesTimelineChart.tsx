"use client"

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

export type TimelinePoint = { period: string; label: string; orders: number; revenue: number; items: number }

// Lazy-loaded from the sales report page for the same reason the dashboard
// charts are: recharts is ~300 KB and should not block the first paint.
export default function SalesTimelineChart({
  data,
  formatMoney,
  currencySymbol,
}: {
  data: TimelinePoint[]
  formatMoney: (value: number) => string
  currencySymbol: string
}) {
  return (
    <ResponsiveContainer width="100%" height={320} debounce={100}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
          minTickGap={16}
        />
        <YAxis
          yAxisId="revenue"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          tickFormatter={(v) => `${currencySymbol}${v}`}
          width={64}
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", fontSize: 12 }}
          labelStyle={{ fontWeight: 700, color: "#18181b" }}
          formatter={(value, name) =>
            name === "Revenue" ? [formatMoney(Number(value)), name] : [Number(value), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
        <Bar
          yAxisId="orders"
          dataKey="orders"
          name="Orders"
          fill="#c7d2fe"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="revenue"
          dataKey="revenue"
          name="Revenue"
          type="monotone"
          stroke="#10b981"
          strokeWidth={3}
          dot={data.length <= 45 ? { r: 3, fill: "#fff", stroke: "#10b981", strokeWidth: 2 } : false}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
