"use client"

import { Globe, Image as ImageIcon, MessageCircle, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CollapsibleCard from "./CollapsibleCard"
import AnnouncementBarCard from "./AnnouncementBarCard"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"

export default function BrandTab() {
  const {
    brandStoreName,
    setBrandStoreName,
    brandLogoUrl,
    setBrandLogoUrl,
    brandFaviconUrl,
    setBrandFaviconUrl,
    brandSlogan,
    setBrandSlogan,
    contactEmail,
    whatsappNumber,
    setWhatsappNumber,
    whatsappMessage,
    tawkPropertyId,
    setTawkPropertyId,
    tawkWidgetId,
    setTawkWidgetId,
    setWhatsappMessage,
    setContactEmail,
    socialFacebook,
    setSocialFacebook,
    socialInstagram,
    setSocialInstagram,
    socialYoutube,
    setSocialYoutube,
    socialTiktok,
    setSocialTiktok,
    socialPinterest,
    setSocialPinterest,
    lowStockNoticeEnabled,
    setLowStockNoticeEnabled,
    fieldLabel,
    helpText,
  } = useSettingsForm()

  const lowStockNoticeOn = lowStockNoticeEnabled !== "false"

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* ANNOUNCEMENT BAR — site-wide, so it lives here rather than under Homepage */}
          <AnnouncementBarCard />

          {/* BRAND SETTINGS */}
        <CollapsibleCard
          title="Brand Settings"
          description="Update your store's logo, favicon and slogan."
          icon={ImageIcon}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>
                Store Name
              </Label>
              <Input
                type="text"
                value={brandStoreName}
                onChange={(e) => setBrandStoreName(e.target.value)}
                placeholder="My Store"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MediaField
                label="Logo Image"
                hint="Horizontal logo. About 288×96 (3:1) — it renders at 144×48, so this is 2× for retina. Transparent PNG or SVG."
                value={brandLogoUrl}
                onChange={setBrandLogoUrl}
              />

              <MediaField
                label="Favicon"
                hint="Square image recommended (32×32 or larger). Falls back to the default icon when empty."
                value={brandFaviconUrl}
                onChange={setBrandFaviconUrl}
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Top Bar Slogan
              </Label>
              <Input
                type="text"
                value={brandSlogan}
                onChange={(e) => setBrandSlogan(e.target.value)}
                placeholder="Your Catchy Slogan Here"
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Support Email Address
              </Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@example.com"
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>WhatsApp Number</Label>
              <Input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="8801712345678"
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Country code first, digits only — no +, spaces or dashes. Leave empty to hide the
                WhatsApp button and fall back to the support email notice.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>WhatsApp Prefilled Message</Label>
              <Input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Hi! I have a question about my order."
              />
            </div>
          </div>
        </CollapsibleCard>

        {/* Live Chat */}
        <CollapsibleCard
          title="Live Chat (Tawk.to)"
          description="Real-time chat widget on the storefront. Leave the Property ID empty to turn it off."
          icon={MessageCircle}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Tawk Property ID</Label>
              <Input
                type="text"
                value={tawkPropertyId}
                onChange={(e) => setTawkPropertyId(e.target.value)}
                placeholder="65f1a2b3c4d5e6f7a8b9c0d1"
                className="font-mono"
              />
              <p className={helpText}>
                * Tawk dashboard → Administration → Chat Widget. The embed URL looks like
                embed.tawk.to/<strong>PROPERTY_ID</strong>/<strong>WIDGET_ID</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>Tawk Widget ID</Label>
              <Input
                type="text"
                value={tawkWidgetId}
                onChange={(e) => setTawkWidgetId(e.target.value)}
                placeholder="default"
                className="font-mono"
              />
              <p className={helpText}>
                * Usually the literal word &quot;default&quot; unless you created extra widgets.
              </p>
            </div>
          </div>
        </CollapsibleCard>

        {/* PRODUCT PAGE */}
        <CollapsibleCard
          title="Product Page"
          description="What shoppers are shown alongside the size and colour choices."
          icon={Package}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <Label className={fieldLabel}>Low stock warning</Label>
              <p className={helpText}>
                * Shows &quot;Only N left — order soon&quot; in red once the chosen size has 5 or
                fewer units. Turning this off hides the warning everywhere; &quot;Out of Stock&quot;
                and the Notify Me form are unaffected.
              </p>
            </div>
            <button
              type="button"
              aria-pressed={lowStockNoticeOn}
              className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${lowStockNoticeOn ? "bg-primary" : "bg-muted-foreground/30"}`}
              onClick={() => setLowStockNoticeEnabled(lowStockNoticeOn ? "false" : "true")}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${lowStockNoticeOn ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CollapsibleCard>

        {/* Social Links */}
        <CollapsibleCard
          title="Social Media Links"
          description="Set the URLs for your social media profiles shown in the footer."
          icon={Globe}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className={fieldLabel}>Facebook URL</Label>
              <Input type="url" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Instagram URL</Label>
              <Input type="url" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} placeholder="https://instagram.com/yourhandle" />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>YouTube URL</Label>
              <Input type="url" value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>TikTok URL</Label>
              <Input type="url" value={socialTiktok} onChange={(e) => setSocialTiktok(e.target.value)} placeholder="https://tiktok.com/@yourhandle" />
            </div>
            <div className="space-y-3">
              <Label className={fieldLabel}>Pinterest URL</Label>
              <Input type="url" value={socialPinterest} onChange={(e) => setSocialPinterest(e.target.value)} placeholder="https://pinterest.com/yourprofile" />
            </div>
          </div>
        </CollapsibleCard>
    </div>
  )
}
