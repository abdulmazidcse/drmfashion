"use client"

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"

export type MonthPoint = { period: string; label: string; revenue: number; expenses: number; profit: number }

// Lazy-loaded from the accounting overview: recharts is ~300 KB and should not
// block the first paint of the KPI cards.
export default function RevenueExpenseChart({
  data,
  formatMoney,
  currencySymbol,
}: {
  data: MonthPoint[]
  formatMoney: (value: number) => string
  currencySymbol: string
}) {
  return (
    <ResponsiveContainer width="100%" height={300} debounce={100}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10, fontWeight: 700 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#a1a1aa", fontSize: 10 }}
          tickFormatter={(v) => `${currencySymbol}${v}`}
          width={64}
        />
        <Tooltip
          cursor={{ fill: "#fafafa" }}
          contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", fontSize: 12 }}
          labelStyle={{ fontWeight: 700, color: "#18181b" }}
          formatter={(value, name) => [formatMoney(Number(value)), name]}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="expenses" name="Expenses" fill="#fda4af" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}
