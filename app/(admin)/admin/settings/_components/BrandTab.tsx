"use client"

import { Fragment } from "react"
import { Globe, Image as ImageIcon, MessageCircle, Plus, Ruler, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CollapsibleCard from "./CollapsibleCard"
import AnnouncementBarCard from "./AnnouncementBarCard"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"
import { DEFAULT_HEIGHTS_GUIDE } from "@/lib/heightsGuide"

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
    heightsGuide,
    updateHeightsGuide,
    updateHeightsCell,
    addHeightsRow,
    removeHeightsRow,
    updateHeightsColumn,
    addHeightsColumn,
    removeHeightsColumn,
    updateHeightsModel,
    addHeightsModel,
    removeHeightsModel,
    fieldLabel,
    helpText,
  } = useSettingsForm()

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

        {/* HEIGHTS & FIT — the first tab of the size-chart modal on every product */}
        <CollapsibleCard
          title="Heights &amp; Fit Guide"
          description="The &ldquo;Our Heights &amp; Fit&rdquo; panel of the size guide. Shown on every product page."
          icon={Ruler}
          defaultCollapsed
        >
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className={fieldLabel}>Heading</Label>
                <Input
                  type="text"
                  value={heightsGuide.heading}
                  onChange={(e) => updateHeightsGuide({ heading: e.target.value })}
                  placeholder="Our Heights"
                />
              </div>
              <div className="space-y-3">
                <Label className={fieldLabel}>Subtitle</Label>
                <Input
                  type="text"
                  value={heightsGuide.subtitle}
                  onChange={(e) => updateHeightsGuide({ subtitle: e.target.value })}
                  placeholder="Most of our customers use their height as a starting point…"
                />
              </div>
            </div>

            {/* Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <Label className={fieldLabel}>Height Table</Label>
                  <p className={helpText}>
                    Remove every row to hide the table entirely. The first column is left-aligned
                    and the last right-aligned on the storefront.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={addHeightsColumn}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 px-3 py-2 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Column
                  </button>
                  <button
                    type="button"
                    onClick={addHeightsRow}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 px-3 py-2 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
              </div>

              {heightsGuide.columns.length === 0 ? (
                <p className="text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-lg p-6 text-center">
                  No columns. Add one to start building the table.
                </p>
              ) : (
                /* Wide tables scroll rather than crushing the inputs. */
                <div className="overflow-x-auto -mx-1 px-1 pb-1">
                  <div
                    className="grid gap-3 items-center min-w-max"
                    style={{
                      gridTemplateColumns: `repeat(${heightsGuide.columns.length}, minmax(180px, 1fr)) auto`,
                    }}
                  >
                    {/* Header row — each cell is the column's own label, with its
                        delete control sitting directly above the column it removes. */}
                    {heightsGuide.columns.map((column, colIdx) => (
                      <div key={`head-${colIdx}`} className="flex items-center justify-between gap-2">
                        <Label className={fieldLabel}>Column {colIdx + 1}</Label>
                        <button
                          type="button"
                          onClick={() => removeHeightsColumn(colIdx)}
                          aria-label={`Remove column ${colIdx + 1}`}
                          className="text-zinc-300 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <span className="w-9" />

                    {heightsGuide.columns.map((column, colIdx) => (
                      <Input
                        key={`header-input-${colIdx}`}
                        type="text"
                        value={column}
                        onChange={(e) => updateHeightsColumn(colIdx, e.target.value)}
                        placeholder={DEFAULT_HEIGHTS_GUIDE.columns[colIdx] || "Column heading"}
                      />
                    ))}
                    <span className="w-9" />

                    {heightsGuide.rows.map((row, rowIdx) => (
                      <Fragment key={`row-${rowIdx}`}>
                        {heightsGuide.columns.map((_, colIdx) => (
                          <Input
                            key={`cell-${rowIdx}-${colIdx}`}
                            type="text"
                            value={row[colIdx] ?? ""}
                            onChange={(e) => updateHeightsCell(rowIdx, colIdx, e.target.value)}
                            placeholder={DEFAULT_HEIGHTS_GUIDE.rows[rowIdx]?.[colIdx] || ""}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => removeHeightsRow(rowIdx)}
                          aria-label={`Remove row ${rowIdx + 1}`}
                          className="w-9 h-9 flex items-center justify-center border border-zinc-200 rounded-md text-zinc-400 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Model photos */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className={fieldLabel}>Model Photos</Label>
                  <p className={helpText}>
                    The photo strip under the table. Models without a photo are skipped; the strip
                    is hidden entirely when none are set.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addHeightsModel}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 px-3 py-2 rounded-md hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Model
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {heightsGuide.models.map((model, idx) => (
                  <div key={idx} className="border border-zinc-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Model {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHeightsModel(idx)}
                        aria-label={`Remove model ${idx + 1}`}
                        className="text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <MediaField
                      label="Photo"
                      hint="Portrait 3:4. About 600×800."
                      value={model.image}
                      // MediaField types onChange as a state setter, so it may
                      // hand back an updater rather than a plain string.
                      onChange={(next) =>
                        updateHeightsModel(idx, {
                          image: typeof next === "function" ? next(model.image) : next,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleCard>
    </div>
  )
}
