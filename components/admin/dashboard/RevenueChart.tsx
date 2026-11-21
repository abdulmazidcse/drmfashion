"use client"

import { ResponsiveContainer, ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"

type Point = { label: string; sales: number; delivered: number; orders: number }

// Split out of the dashboard page so recharts (~300 KB) is fetched only when
// the chart actually renders, instead of blocking the first paint of the most
// visited screen in the admin.
//
// Orders are bars on their own axis; the two money lines share the left axis:
// "Sales" is what was ordered that day, "Delivered" what was actually handed
// over (and so earned) that day. On a cash-on-delivery shop the gap between
// the two is the money still out with the courier.
export default function RevenueChart({
  data,
  formatMoney,
}: {
  data: Point[]
  formatMoney: (value: number) => string
}) {
  const compact = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))
  return (
    <ResponsiveContainer width="100%" height={280} debounce={100}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 600 }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          yAxisId="money"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          tickFormatter={compact}
          width={44}
        />
        <YAxis
          yAxisId="orders"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", fontSize: 12 }}
          labelStyle={{ fontWeight: 700, color: "#18181b" }}
          formatter={(value, name) => [name === "Orders" ? String(value) : formatMoney(Number(value)), name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#e0e7ff" radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Line
          yAxisId="money"
          dataKey="sales"
          name="Sales"
          type="monotone"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          yAxisId="money"
          dataKey="delivered"
          name="Delivered"
          type="monotone"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
