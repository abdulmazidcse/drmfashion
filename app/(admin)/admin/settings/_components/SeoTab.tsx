"use client"

import { Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function SeoTab() {
  const {
    googleSiteVerification,
    setGoogleSiteVerification,
    facebookDomainVerification,
    setfacebookDomainVerification,
    googleAnalyticsId,
    setGoogleAnalyticsId,
    facebookPixelId,
    setfacebookPixelId,
    customHeadScripts,
    setCustomHeadScripts,
    fieldLabel,
    helpText,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* SEO & ANALYTICS SETTINGS */}
        <CollapsibleCard
          title="SEO & Tracking Analytics"
          description="Configure Google Search Console, Facebook Verification, Analytics trackers, and custom head scripts."
          icon={Globe}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>
                Google Site Verification Code
              </Label>
              <Input
                type="text"
                value={googleSiteVerification}
                onChange={(e) => setGoogleSiteVerification(e.target.value)}
                placeholder="e.g. abc123xyz..."
              />
              <p className={helpText}>
                * Used for Google Search Console domain ownership verification.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Facebook Domain Verification Code
              </Label>
              <Input
                type="text"
                value={facebookDomainVerification}
                onChange={(e) => setfacebookDomainVerification(e.target.value)}
                placeholder="e.g. 1234567890abcdef..."
              />
              <p className={helpText}>
                * Used for Facebook Business Manager domain ownership verification.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Google Analytics Measurement ID (G-XXXX)
              </Label>
              <Input
                type="text"
                value={googleAnalyticsId}
                onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                placeholder="e.g. G-XXXXXXXXXX"
              />
              <p className={helpText}>
                * Google Analytics 4 tracking ID. Standard tag will be automatically injected.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Facebook Pixel ID
              </Label>
              <Input
                type="text"
                value={facebookPixelId}
                onChange={(e) => setfacebookPixelId(e.target.value)}
                placeholder="e.g. 1234567890"
              />
              <p className={helpText}>
                * Facebook Meta Pixel ID. Standard page view tracker script will be automatically injected.
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-6 border-t pt-5">
            <Label className={fieldLabel}>
              Custom HTML Head Scripts (Optional)
            </Label>
            <Textarea
              value={customHeadScripts}
              onChange={(e) => setCustomHeadScripts(e.target.value)}
              placeholder="<script>...</script>&#10;<meta ... />"
              rows={5}
              className="font-mono text-xs"
            />
            <p className={helpText}>
              * Inject custom HTML tags (scripts, stylesheets, meta elements) directly into the head of your storefront pages.
            </p>
          </div>
        </CollapsibleCard>
    </div>
  )
}
