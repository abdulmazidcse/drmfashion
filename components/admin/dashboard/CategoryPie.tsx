"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

type Slice = { name: string; value: number; color: string }

// Shares recharts with RevenueChart — both are pulled in from the same lazy
// chunk, so opening the dashboard costs the library at most once.
export default function CategoryPie({
  data,
  formatValue,
}: {
  data: Slice[]
  formatValue: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={220} debounce={100}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", fontSize: 12 }}
          labelStyle={{ fontWeight: 700, color: "#18181b" }}
          formatter={(value) => [formatValue(Number(value)), "Revenue"]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
