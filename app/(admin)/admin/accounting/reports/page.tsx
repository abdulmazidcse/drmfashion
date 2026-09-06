"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AccountingNav from "@/components/admin/accounting/AccountingNav"
import SourceBadge from "@/components/admin/accounting/SourceBadge"
import { apiMessage, isCancel } from "@/components/admin/accounting/apiError"
import DateRangePicker, { isYmd, presetRange, rangeValid, ymd, type DateRange } from "@/components/admin/accounting/DateRangePicker"

type ReportType = "pnl" | "balance-sheet" | "trial-balance" | "ledger"
type Account = { id: string; code: string; name: string; type: string }
type StatementLine = { id: string; code: string; name: string; amount: number }

type ProfitAndLoss = {
  from: string
  to: string
  revenue: StatementLine[]
  costOfSales: StatementLine[]
  operatingExpenses: StatementLine[]
  totalRevenue: number
  totalCostOfSales: number
  grossProfit: number
  totalOperatingExpenses: number
  totalExpenses: number
  netProfit: number
}

type BalanceSheet = {
  asOf: string
  assets: StatementLine[]
  liabilities: StatementLine[]
  equity: StatementLine[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  netIncome: number
  totalLiabilitiesAndEquity: number
}

type TrialBalance = {
  asOf: string
  rows: { id: string; code: string; name: string; type: string; debit: number; credit: number }[]
  totalDebit: number
  totalCredit: number
}

type Ledger = {
  account: Account
  from: string
  to: string
  openingBalance: number
  rows: {
    entryId: string
    entryNo: number
    date: string
    memo: string | null
    source: string
    referenceType: string | null
    referenceId: string | null
    description: string | null
    debit: number
    credit: number
    balance: number
  }[]
  totalDebit: number
  totalCredit: number
  closingBalance: number
}

const TABS: { value: ReportType; label: string; description: string }[] = [
  { value: "pnl", label: "Profit & Loss", description: "Income and expenses for the period." },
  { value: "balance-sheet", label: "Balance Sheet", description: "Assets, liabilities and equity as of a date." },
  { value: "trial-balance", label: "Trial Balance", description: "Every account's net debit or credit as of a date." },
  { value: "ledger", label: "General Ledger", description: "One account's activity with a running balance." },
]

export default function ReportsPage() {
  const { formatBasePrice } = useCurrency()
  const [tab, setTab] = useState<ReportType>("pnl")
  const [range, setRange] = useState<DateRange>(() => presetRange("thisMonth"))
  const [asOf, setAsOf] = useState(() => ymd(new Date()))
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [pnl, setPnl] = useState<ProfitAndLoss | null>(null)
  const [bs, setBs] = useState<BalanceSheet | null>(null)
  const [tb, setTb] = useState<TrialBalance | null>(null)
  const [gl, setGl] = useState<Ledger | null>(null)
  // The query the current report answers; "loading" is derived from whether it
  // matches the controls, so the fetch effect never sets state synchronously.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Account[]>("/admin/accounting/accounts")
      .then((res) => {
        setAccounts(res.data)
        setAccountId((cur) => cur || res.data.find((a) => a.code === "1000")?.id || res.data[0]?.id || "")
      })
      .catch(console.error)
  }, [])

  const usesRange = tab === "pnl" || tab === "ledger"
  const paramsValid = usesRange ? rangeValid(range) && (tab !== "ledger" || Boolean(accountId)) : isYmd(asOf)

  const params = useCallback((): Record<string, string> => {
    const p: Record<string, string> = { type: tab }
    if (usesRange) {
      p.from = range.from
      p.to = range.to
    } else {
      p.asOf = asOf
    }
    if (tab === "ledger") p.accountId = accountId
    return p
  }, [tab, usesRange, range.from, range.to, asOf, accountId])

  const queryKey = paramsValid ? JSON.stringify(params()) : null
  const loading = queryKey !== null && loadedKey !== queryKey

  useEffect(() => {
    if (!queryKey) return
    const controller = new AbortController()
    api
      .get("/admin/accounting/reports", { params: params(), signal: controller.signal })
      .then((res) => {
        if (tab === "pnl") setPnl(res.data)
        else if (tab === "balance-sheet") setBs(res.data)
        else if (tab === "trial-balance") setTb(res.data)
        else setGl(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return
        console.error(err)
        setError(apiMessage(err, "Failed to build report"))
      })
      .then(() => {
        if (!controller.signal.aborted) setLoadedKey(queryKey)
      })
    return () => controller.abort()
  }, [queryKey, params, tab])

  function exportCsv() {
    const p = new URLSearchParams({ ...params(), format: "csv" })
    window.open(`/api/admin/accounting/reports?${p.toString()}`, "_blank")
  }

  const current = TABS.find((t) => t.value === tab)!

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><FileText size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Financial Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Statements built from the journal. Dates are by entry date.</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!paramsValid}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <AccountingNav />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ReportType)}>
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {/* CONTROLS */}
      <Card>
        <CardContent className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {usesRange ? (
            <DateRangePicker value={range} onChange={setRange} />
          ) : (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">As of</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-auto bg-card" />
                <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setAsOf(ymd(new Date()))}>Today</Button>
              </div>
            </div>
          )}
          {tab === "ledger" && (
            <div className="space-y-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-72"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{current.label}</CardTitle>
          <CardDescription>
            {current.description}{" "}
            {usesRange ? `${range.from} to ${range.to}.` : `As of ${asOf}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!paramsValid ? (
            <p className="py-12 text-center text-xs text-rose-600 font-medium">Pick valid dates{tab === "ledger" ? " and an account" : ""}.</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-rose-600 font-medium">{error}</p>
          ) : loading && !((tab === "pnl" && pnl) || (tab === "balance-sheet" && bs) || (tab === "trial-balance" && tb) || (tab === "ledger" && gl)) ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
              <span className="text-muted-foreground text-sm">Building report...</span>
            </div>
          ) : (
            <div className={cn("overflow-x-auto", loading && "opacity-60")}>
              {tab === "pnl" && pnl && <ProfitAndLossView data={pnl} money={formatBasePrice} />}
              {tab === "balance-sheet" && bs && <BalanceSheetView data={bs} money={formatBasePrice} />}
              {tab === "trial-balance" && tb && <TrialBalanceView data={tb} money={formatBasePrice} />}
              {tab === "ledger" && gl && <LedgerView data={gl} money={formatBasePrice} />}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Statement pieces ────────────────────────────────────────────────────────

type Money = (n: number) => string

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}

function SectionRows({ title, lines, total, totalLabel, money }: { title: string; lines: StatementLine[]; total: number; totalLabel: string; money: Money }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={3} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</TableCell>
      </TableRow>
      {lines.length === 0 && (
        <TableRow><TableCell colSpan={3} className="text-xs text-muted-foreground pl-8">No activity</TableCell></TableRow>
      )}
      {lines.map((l) => (
        <TableRow key={l.id}>
          <TableCell className="font-mono text-xs text-muted-foreground w-20 pl-8">{l.code}</TableCell>
          <TableCell className="text-sm">{l.name}</TableCell>
          <TableCell className={cn("text-right font-mono text-sm w-40", l.amount < 0 && "text-rose-600")}>{money(l.amount)}</TableCell>
        </TableRow>
      ))}
      <TotalRow label={totalLabel} amount={total} money={money} />
    </>
  )
}

function TotalRow({ label, amount, money, strong }: { label: string; amount: number; money: Money; strong?: boolean }) {
  return (
    <TableRow className={cn(strong && "bg-muted/60 hover:bg-muted/60")}>
      <TableCell />
      <TableCell className={cn("text-sm font-semibold", strong && "font-bold")}>{label}</TableCell>
      <TableCell className={cn("text-right font-mono text-sm font-semibold border-t border-border", strong && "font-bold", amount < 0 && "text-rose-600")}>
        {money(amount)}
      </TableCell>
    </TableRow>
  )
}

function ProfitAndLossView({ data, money }: { data: ProfitAndLoss; money: Money }) {
  return (
    <Table className="min-w-[560px]">
      <TableBody>
        <SectionRows title="Revenue" lines={data.revenue} total={data.totalRevenue} totalLabel="Total revenue" money={money} />
        <SectionRows title="Cost of sales" lines={data.costOfSales} total={data.totalCostOfSales} totalLabel="Total cost of sales" money={money} />
        <TotalRow label="Gross profit" amount={data.grossProfit} money={money} strong />
        <SectionRows title="Operating expenses" lines={data.operatingExpenses} total={data.totalOperatingExpenses} totalLabel="Total operating expenses" money={money} />
        <TotalRow label="Net profit" amount={data.netProfit} money={money} strong />
      </TableBody>
    </Table>
  )
}

function BalanceSheetView({ data, money }: { data: BalanceSheet; money: Money }) {
  const balanced = Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.005
  return (
    <div>
      <Table className="min-w-[560px]">
        <TableBody>
          <SectionRows title="Assets" lines={data.assets} total={data.totalAssets} totalLabel="Total assets" money={money} />
          <SectionRows title="Liabilities" lines={data.liabilities} total={data.totalLiabilities} totalLabel="Total liabilities" money={money} />
          <SectionRows title="Equity" lines={data.equity} total={data.totalEquity} totalLabel="Total equity" money={money} />
          <TableRow>
            <TableCell />
            <TableCell className="text-sm">Net income to date</TableCell>
            <TableCell className={cn("text-right font-mono text-sm", data.netIncome < 0 && "text-rose-600")}>{money(data.netIncome)}</TableCell>
          </TableRow>
          <TotalRow label="Total liabilities & equity" amount={data.totalLiabilitiesAndEquity} money={money} strong />
        </TableBody>
      </Table>
      <p className={cn("px-6 py-3 text-xs font-medium", balanced ? "text-emerald-600" : "text-rose-600")}>
        {balanced
          ? "Assets equal liabilities plus equity."
          : `Out of balance by ${money(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity))} — check for entries edited outside the ledger.`}
      </p>
    </div>
  )
}

function TrialBalanceView({ data, money }: { data: TrialBalance; money: Money }) {
  const balanced = Math.abs(data.totalDebit - data.totalCredit) < 0.005
  return (
    <div>
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <Th className="w-20">Code</Th>
            <Th>Account</Th>
            <Th className="w-24">Type</Th>
            <Th className="text-right w-36">Debit</Th>
            <Th className="text-right w-36">Credit</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold">No activity</TableCell></TableRow>
          )}
          {data.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
              <TableCell className="text-sm">{r.name}</TableCell>
              <TableCell className="text-[10px] font-semibold tracking-wider text-muted-foreground">{r.type}</TableCell>
              <TableCell className="text-right font-mono text-sm">{r.debit > 0 ? money(r.debit) : ""}</TableCell>
              <TableCell className="text-right font-mono text-sm">{r.credit > 0 ? money(r.credit) : ""}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableCell />
            <TableCell colSpan={2} className="text-sm font-bold">Total</TableCell>
            <TableCell className="text-right font-mono text-sm font-bold border-t border-border">{money(data.totalDebit)}</TableCell>
            <TableCell className="text-right font-mono text-sm font-bold border-t border-border">{money(data.totalCredit)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className={cn("px-6 py-3 text-xs font-medium", balanced ? "text-emerald-600" : "text-rose-600")}>
        {balanced ? "Debits equal credits." : `Out of balance by ${money(Math.abs(data.totalDebit - data.totalCredit))}.`}
      </p>
    </div>
  )
}

function LedgerView({ data, money }: { data: Ledger; money: Money }) {
  return (
    <Table className="min-w-[860px]">
      <TableHeader>
        <TableRow>
          <Th className="w-16">No.</Th>
          <Th className="w-28">Date</Th>
          <Th>Memo</Th>
          <Th className="w-28">Source</Th>
          <Th className="text-right w-32">Debit</Th>
          <Th className="text-right w-32">Credit</Th>
          <Th className="text-right w-36">Balance</Th>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell />
          <TableCell className="font-mono text-xs">{data.from}</TableCell>
          <TableCell colSpan={4} className="text-sm font-semibold">Opening balance — {data.account.code} {data.account.name}</TableCell>
          <TableCell className={cn("text-right font-mono text-sm font-semibold", data.openingBalance < 0 && "text-rose-600")}>{money(data.openingBalance)}</TableCell>
        </TableRow>
        {data.rows.length === 0 && (
          <TableRow><TableCell colSpan={7} className="py-10 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold">No activity in this period</TableCell></TableRow>
        )}
        {data.rows.map((r, idx) => (
          <TableRow key={`${r.entryId}-${idx}`}>
            <TableCell className="font-mono text-xs text-muted-foreground">#{r.entryNo}</TableCell>
            <TableCell className="font-mono text-xs">{r.date.slice(0, 10)}</TableCell>
            <TableCell className="text-sm">
              <p className="truncate max-w-[320px]">{r.memo || "—"}</p>
              {r.description && <p className="text-[11px] text-muted-foreground truncate max-w-[320px]">{r.description}</p>}
            </TableCell>
            <TableCell><SourceBadge source={r.source} /></TableCell>
            <TableCell className="text-right font-mono text-sm">{r.debit > 0 ? money(r.debit) : ""}</TableCell>
            <TableCell className="text-right font-mono text-sm">{r.credit > 0 ? money(r.credit) : ""}</TableCell>
            <TableCell className={cn("text-right font-mono text-sm", r.balance < 0 && "text-rose-600")}>{money(r.balance)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/60 hover:bg-muted/60">
          <TableCell />
          <TableCell className="font-mono text-xs">{data.to}</TableCell>
          <TableCell colSpan={2} className="text-sm font-bold">Closing balance</TableCell>
          <TableCell className="text-right font-mono text-sm font-bold border-t border-border">{money(data.totalDebit)}</TableCell>
          <TableCell className="text-right font-mono text-sm font-bold border-t border-border">{money(data.totalCredit)}</TableCell>
          <TableCell className={cn("text-right font-mono text-sm font-bold border-t border-border", data.closingBalance < 0 && "text-rose-600")}>{money(data.closingBalance)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
