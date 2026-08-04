"use client"

import { ResponsiveContainer, ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

type Point = { label: string; revenue: number; orders: number }

// Split out of the dashboard page so recharts (~300 KB) is fetched only when
// the chart actually renders, instead of blocking the first paint of the most
// visited screen in the admin.
export default function RevenueChart({
  data,
  currencySymbol,
}: {
  data: Point[]
  currencySymbol: string
}) {
  return (
    <ResponsiveContainer width="100%" height={280} debounce={100}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
        />
        <YAxis
          yAxisId="revenue"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          tickFormatter={(v) => `${currencySymbol}${v}`}
          width={56}
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
        />
        <Line
          yAxisId="revenue"
          dataKey="revenue"
          name="Revenue"
          type="monotone"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ r: 4, fill: "#fff", stroke: "#10b981", strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="orders"
          dataKey="orders"
          name="Orders"
          type="monotone"
          stroke="#6366f1"
          strokeWidth={3}
          dot={{ r: 4, fill: "#fff", stroke: "#6366f1", strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
