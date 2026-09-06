"use client"

import dynamic from "next/dynamic"
import {
  Settings,
  Save,
  Loader2,
  Star,
  Globe,
  Image as ImageIcon,
  CreditCard,
  Sparkles,
  Code,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSettingsForm } from "./SettingsFormContext"

// Each panel is its own chunk, pulled in the first time its tab is opened.
// Loading all six up front was the bulk of this route's compile and bundle
// cost, and five of them are never looked at in a given visit.
const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
)

const BrandTab = dynamic(() => import("./BrandTab"), { loading: TabFallback })
const PaymentsTab = dynamic(() => import("./PaymentsTab"), { loading: TabFallback })
const RewardsTab = dynamic(() => import("./RewardsTab"), { loading: TabFallback })
const FlashSaleTab = dynamic(() => import("./FlashSaleTab"), { loading: TabFallback })
const PromoPopupTab = dynamic(() => import("./PromoPopupTab"), { loading: TabFallback })
const HomepageTab = dynamic(() => import("./HomepageTab"), { loading: TabFallback })
const SeoTab = dynamic(() => import("./SeoTab"), { loading: TabFallback })

const SETTINGS_TABS = [
  { id: "brand", label: "Branding & Store Info", icon: Globe },
  { id: "payments", label: "Payment Gateways", icon: CreditCard },
  { id: "rewards", label: "Rewards & Currency", icon: Star },
  { id: "flashsale", label: "Flash Sale", icon: Sparkles },
  { id: "promopopup", label: "Promo Popup", icon: Gift },
  { id: "homepage", label: "Homepage", icon: ImageIcon },
  { id: "seo", label: "SEO & Analytics", icon: Code },
] as const

export default function SettingsShell() {
  const { loading, saving, activeSettingsTab, setActiveSettingsTab, handleSaveSettings } = useSettingsForm()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 pb-12">
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* STICKY HEADER WITH TITLE & SAVE BUTTON */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md py-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary text-primary-foreground rounded-xl shadow-sm">
                <Settings size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">System Settings</h1>
                <p className="text-xs text-muted-foreground">Configure global store preferences, payments, rewards & content.</p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="default"
            disabled={saving}
            className="font-bold uppercase tracking-wider gap-2 shadow-sm shrink-0"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Configuration
          </Button>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex overflow-x-auto scrollbar-none border border-border rounded-xl divide-x divide-border">
          {SETTINGS_TABS.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeSettingsTab === tab.id
            const isFirst = index === 0
            const isLast = index === SETTINGS_TABS.length - 1
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSettingsTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none flex-shrink-0",
                  isFirst && "rounded-l-xl",
                  isLast && "rounded-r-xl",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Only the open tab is mounted — field values live in the form context,
            so switching tabs never loses unsaved edits. */}
        {activeSettingsTab === "brand" && <BrandTab />}
        {activeSettingsTab === "payments" && <PaymentsTab />}
        {activeSettingsTab === "rewards" && <RewardsTab />}
        {activeSettingsTab === "flashsale" && <FlashSaleTab />}
        {activeSettingsTab === "promopopup" && <PromoPopupTab />}
        {activeSettingsTab === "homepage" && <HomepageTab />}
        {activeSettingsTab === "seo" && <SeoTab />}

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={saving}
            className="font-bold uppercase tracking-widest"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Configuration
          </Button>
        </div>

      </form>
    </div>
  )
}
