"use client"

import { Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function SeoTab() {
  const {
    seoMetaTitle,
    setSeoMetaTitle,
    seoMetaDescription,
    setSeoMetaDescription,
    googleSiteVerification,
    setGoogleSiteVerification,
    facebookDomainVerification,
    setfacebookDomainVerification,
    gtmId,
    setGtmId,
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
          {/* SITE META TAGS */}
        <CollapsibleCard
          title="Site Meta Tags"
          description="The title and description search engines show for the site. Leave empty to fall back to the store name."
          icon={Globe}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>
                Meta Title{" "}
                <span className={seoMetaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}>
                  ({seoMetaTitle.length} characters)
                </span>
              </Label>
              <Input
                type="text"
                value={seoMetaTitle}
                onChange={(e) => setSeoMetaTitle(e.target.value)}
                placeholder="Tall Plus | Tall Men's & Women's Clothing"
              />
              <p className={helpText}>
                * Aim for 30–60 characters. Shorter titles get padded by Google, longer ones truncated.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Meta Description{" "}
                <span className={seoMetaDescription.length > 160 ? "text-destructive" : "text-muted-foreground"}>
                  ({seoMetaDescription.length} characters)
                </span>
              </Label>
              <Textarea
                rows={3}
                value={seoMetaDescription}
                onChange={(e) => setSeoMetaDescription(e.target.value)}
                placeholder="High-end contemporary fashion tailored for modern individuals…"
              />
              <p className={helpText}>
                * Aim for 120–160 characters.
              </p>
            </div>
          </div>
        </CollapsibleCard>

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
                Google Tag Manager Container ID (GTM-XXXX)
              </Label>
              <Input
                type="text"
                value={gtmId}
                onChange={(e) => setGtmId(e.target.value)}
                placeholder="e.g. GTM-XXXXXXX"
              />
              <p className={helpText}>
                * Loads the GTM container and sends <code>view_item</code>,{" "}
                <code>add_to_cart</code> and <code>purchase</code> to its dataLayer.
                Configure GA4 inside GTM — set this and the Measurement ID below is
                skipped, so page views are not counted twice.
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
                * Google Analytics 4 tracking ID, for sites not using GTM. Ignored while
                a Container ID is set above.
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
