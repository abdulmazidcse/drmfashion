"use client"

import { Gift, SlidersHorizontal, Trash2, UploadCloud } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function PromoPopupTab() {
  const {
    promoPopupEnabled,
    setPromoPopupEnabled,
    promoPopupHeading,
    setPromoPopupHeading,
    promoPopupHighlight,
    setPromoPopupHighlight,
    promoPopupSubheading,
    setPromoPopupSubheading,
    promoPopupConsentText,
    setPromoPopupConsentText,
    promoPopupButtonText,
    setPromoPopupButtonText,
    promoPopupCode,
    setPromoPopupCode,
    promoPopupSuccessHeading,
    setPromoPopupSuccessHeading,
    promoPopupSuccessText,
    setPromoPopupSuccessText,
    promoPopupTabLabel,
    setPromoPopupTabLabel,
    promoPopupImageUrl,
    setPromoPopupImageUrl,
    promoPopupShowShopFor,
    setPromoPopupShowShopFor,
    promoPopupShopForOptions,
    setPromoPopupShopForOptions,
    promoPopupTermsUrl,
    setPromoPopupTermsUrl,
    promoPopupPrivacyUrl,
    setPromoPopupPrivacyUrl,
    promoPopupDelaySeconds,
    setPromoPopupDelaySeconds,
    promoPopupFrequencyDays,
    setPromoPopupFrequencyDays,
    uploadingPromoPopupImage,
    setUploadingPromoPopupImage,
    handleFieldFileUpload,
    fieldLabel,
    helpText,
  } = useSettingsForm()

  const isOn = promoPopupEnabled !== "false"
  const showShopFor = promoPopupShowShopFor !== "false"

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* CONTENT */}
      <CollapsibleCard
        title="Promo Popup (Slide-in Drawer)"
        description="The email-capture drawer that slides in from the right of the storefront."
        icon={Gift}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={isOn ? "default" : "secondary"}>{isOn ? "Active" : "Disabled"}</Badge>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOn ? "bg-primary" : "bg-muted-foreground/30"}`}
              onClick={() => setPromoPopupEnabled(isOn ? "false" : "true")}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${isOn ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        }
      >
        <div className={`space-y-6 transition-all ${isOn ? "" : "opacity-50 pointer-events-none"}`}>
          {/* HEADLINE STACK */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Heading (Small, Top)</Label>
              <Input
                type="text"
                value={promoPopupHeading}
                onChange={(e) => setPromoPopupHeading(e.target.value)}
                placeholder="You just got"
              />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Highlight (Large)</Label>
              <Input
                type="text"
                value={promoPopupHighlight}
                onChange={(e) => setPromoPopupHighlight(e.target.value)}
                placeholder="15% off"
              />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Subheading (Bottom)</Label>
              <Input
                type="text"
                value={promoPopupSubheading}
                onChange={(e) => setPromoPopupSubheading(e.target.value)}
                placeholder="your next order"
              />
            </div>
          </div>

          {/* PREVIEW */}
          <div className="border rounded-xl bg-muted/30 py-8 px-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Preview</p>
            <p className="text-xl font-bold text-foreground leading-tight">{promoPopupHeading || "You just got"}</p>
            <p className="text-4xl font-black text-foreground leading-none my-1">{promoPopupHighlight || "15% off"}</p>
            <p className="text-lg font-bold text-foreground leading-tight">{promoPopupSubheading || "your next order"}</p>
          </div>

          {/* CONSENT TEXT */}
          <div className="space-y-3">
            <Label className={fieldLabel}>Consent / Legal Text</Label>
            <Textarea
              value={promoPopupConsentText}
              onChange={(e) => setPromoPopupConsentText(e.target.value)}
              rows={5}
              placeholder="By submitting this form, you agree to receive recurring automated promotional emails..."
            />
            <p className={helpText}>* Shown in small print above the email field. Plain text only — the Terms / Privacy links below are appended automatically.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Submit Button Text</Label>
              <Input
                type="text"
                value={promoPopupButtonText}
                onChange={(e) => setPromoPopupButtonText(e.target.value)}
                placeholder="Reveal Promo Code"
              />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Promo Code</Label>
              <Input
                type="text"
                value={promoPopupCode}
                onChange={(e) => setPromoPopupCode(e.target.value.toUpperCase())}
                placeholder="WELCOME15"
                className="font-mono uppercase"
              />
              <p className={helpText}>* Revealed after a visitor submits their email. Leave blank to just say thank you.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Success Heading</Label>
              <Input
                type="text"
                value={promoPopupSuccessHeading}
                onChange={(e) => setPromoPopupSuccessHeading(e.target.value)}
                placeholder="Here is your code"
              />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Success Message</Label>
              <Input
                type="text"
                value={promoPopupSuccessText}
                onChange={(e) => setPromoPopupSuccessText(e.target.value)}
                placeholder="Apply it at checkout to claim your discount."
              />
            </div>
          </div>

          {/* HEADER IMAGE */}
          <div className="space-y-3">
            <Label className={fieldLabel}>Header Image (Optional)</Label>
            <div className="flex gap-3 items-center">
              <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                <UploadCloud className="w-4 h-4" />
                {uploadingPromoPopupImage ? "..." : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFieldFileUpload(e, setPromoPopupImageUrl, setUploadingPromoPopupImage)}
                  disabled={uploadingPromoPopupImage}
                />
              </label>
              {promoPopupImageUrl && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPromoPopupImageUrl("")}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={promoPopupImageUrl}>
                    {promoPopupImageUrl.substring(promoPopupImageUrl.lastIndexOf("/") + 1)}
                  </span>
                </>
              )}
            </div>
            {promoPopupImageUrl && (
              <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-h-[100px] flex items-center justify-center">
                <img src={promoPopupImageUrl} alt="Promo popup preview" className="max-h-16 object-contain rounded" />
              </div>
            )}
            <p className={helpText}>* Displayed as a banner across the top of the drawer. Leave empty for the plain text-only layout.</p>
          </div>
        </div>
      </CollapsibleCard>

      {/* DISPLAY RULES */}
      <CollapsibleCard
        title="Display Rules & Form Options"
        description="When the drawer opens by itself, how often it comes back, and what the form asks for."
        icon={SlidersHorizontal}
      >
        <div className={`space-y-6 transition-all ${isOn ? "" : "opacity-50 pointer-events-none"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Auto-Open Delay (Seconds)</Label>
              <Input
                type="number"
                min="0"
                value={promoPopupDelaySeconds}
                onChange={(e) => setPromoPopupDelaySeconds(e.target.value)}
                placeholder="5"
              />
              <p className={helpText}>* How long after page load the drawer slides in. Use 0 to open immediately.</p>
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Re-Show After (Days)</Label>
              <Input
                type="number"
                min="0"
                value={promoPopupFrequencyDays}
                onChange={(e) => setPromoPopupFrequencyDays(e.target.value)}
                placeholder="7"
              />
              <p className={helpText}>* Once a visitor closes it, this many days must pass before it auto-opens again. It never auto-opens again after they subscribe.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className={fieldLabel}>Side Tab Label</Label>
            <Input
              type="text"
              value={promoPopupTabLabel}
              onChange={(e) => setPromoPopupTabLabel(e.target.value)}
              placeholder="Get 15% Off"
            />
            <p className={helpText}>* Text on the small handle pinned to the right edge of the screen — visitors click it to reopen the drawer any time.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label className={fieldLabel}>&quot;I Shop For&quot; Dropdown</Label>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${showShopFor ? "bg-primary" : "bg-muted-foreground/30"}`}
                onClick={() => setPromoPopupShowShopFor(showShopFor ? "false" : "true")}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${showShopFor ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <Input
              type="text"
              value={promoPopupShopForOptions}
              onChange={(e) => setPromoPopupShopForOptions(e.target.value)}
              placeholder="Women,Men,Both"
              disabled={!showShopFor}
            />
            <p className={helpText}>* Comma separated choices, saved against the subscriber record. Switch off to drop the dropdown and ask for the email only.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Terms of Service URL</Label>
              <Input
                type="text"
                value={promoPopupTermsUrl}
                onChange={(e) => setPromoPopupTermsUrl(e.target.value)}
                placeholder="/pages/terms-of-service"
              />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Privacy Policy URL</Label>
              <Input
                type="text"
                value={promoPopupPrivacyUrl}
                onChange={(e) => setPromoPopupPrivacyUrl(e.target.value)}
                placeholder="/pages/privacy-policy"
              />
            </div>
          </div>
          <p className={helpText}>* Both links are appended to the consent text. Leave a field blank to omit that link.</p>
        </div>
      </CollapsibleCard>
    </div>
  )
}
