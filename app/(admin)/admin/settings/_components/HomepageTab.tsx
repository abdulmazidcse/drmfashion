"use client"

import { useState } from "react"
import dynamic from "next/dynamic"

import { Settings, Loader2, Trash2, Image as ImageIcon, UploadCloud, Sun, X, FileText, Film, LayoutGrid, Plus, ArrowUp, ArrowDown, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import MediaField from "./MediaField"
import SectionOrderCard from "./SectionOrderCard"
import IconsCard from "./IconsCard"
import VideoBannersCard from "./VideoBannersCard"
import { useSettingsForm, type StyleSectionKey } from "./SettingsFormContext"
import { MAX_HOME_REELS } from "@/lib/homeReels"
import {
  HOME_SHOWCASE_SOURCES,
  MAX_HOME_SHOWCASE_PRODUCTS,
  MAX_HOME_SHOWCASE_ROWS,
  MIN_HOME_SHOWCASE_LIMIT,
  isRenderableShowcaseRow,
} from "@/lib/homeShowcase"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-xs text-muted-foreground border rounded-xl">
      Loading editor…
    </div>
  ),
})

// Renders the seasonal style section's card. Kept generic over `sectionKey`
// rather than inlined, so a second season can be reintroduced by adding one key.
function StyleSectionCard({
  sectionKey,
  icon,
  description,
}: {
  sectionKey: StyleSectionKey
  icon: LucideIcon
  description: string
}) {
  const {
    styleSections,
    updateStyleSection,
    toggleStyleCategory,
    styleEditTab,
    setStyleEditTab,
    allCategories,
    categoriesLoaded,
    fieldLabel,
  } = useSettingsForm()

  const section = styleSections[sectionKey]
  const gender = styleEditTab[sectionKey]
  const selected = section[gender]

  return (
    <CollapsibleCard
      title={section.title || "Summer Styles"}
      description={description}
      icon={icon}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={section.active ? "default" : "secondary"}>
            {section.active ? "Active" : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${section.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={() => updateStyleSection(sectionKey, { active: !section.active })}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${section.active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      }
    >
      <div className={`space-y-6 transition-all ${section.active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className={fieldLabel}>Section Heading</Label>
            <Input
              type="text"
              value={section.title}
              onChange={(e) => updateStyleSection(sectionKey, { title: e.target.value })}
              placeholder="Summer Styles"
              className="font-bold"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Greyed-out word</Label>
            <Input
              type="text"
              value={section.highlight}
              onChange={(e) => updateStyleSection(sectionKey, { highlight: e.target.value })}
              placeholder="Styles"
              className="font-bold"
            />
            <p className="text-[10px] text-muted-foreground">
              Must be part of the heading above — that word is rendered in grey.
            </p>
          </div>
        </div>

        <Separator />

        {/* Men vs Women category lists */}
        <div className="flex border rounded-lg overflow-hidden p-1 bg-muted/50 w-fit">
          {(["men", "women"] as const).map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setStyleEditTab(prev => ({ ...prev, [sectionKey]: g }))}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${gender === g ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {g} tab ({section[g].length})
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Label className={fieldLabel}>
            Categories shown in the {gender} tab
          </Label>

          <div className="flex flex-wrap gap-2 mb-3">
            {selected.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No categories selected — this tab will be empty on the homepage.
              </span>
            )}
            {selected.map(categoryId => {
              const c = allCategories.find(x => x.id === categoryId)
              return (
                <div key={categoryId} className="flex items-center gap-2 bg-muted border rounded-md pl-3 pr-1 py-1 text-xs font-bold">
                  {c ? c.name : categoryId}
                  <button
                    type="button"
                    onClick={() => toggleStyleCategory(sectionKey, gender, categoryId)}
                    className="p-1 hover:bg-muted-foreground/20 rounded-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="border rounded-lg overflow-hidden bg-muted/50 max-h-60 overflow-y-auto">
            {allCategories.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {categoriesLoaded ? "No categories found." : "Loading categories..."}
              </div>
            )}
            {allCategories.map(category => (
              <label key={category.id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-card cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={selected.includes(category.id)}
                  onChange={() => toggleStyleCategory(sectionKey, gender, category.id)}
                  className="w-4 h-4 rounded border-input text-foreground focus:ring-ring"
                />
                <div className="flex items-center gap-3" style={{ paddingLeft: category.depth * 16 }}>
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-8 h-8 object-cover rounded-md" />
                  ) : (
                    <span className="w-8 h-8 rounded-md bg-muted-foreground/10 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
              </label>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Each tile uses the category&apos;s own image and name, and links to its category page.
            A category with no image falls back to a placeholder — set one in Categories.
            Selection order is the display order (max 6 per tab looks best).
          </p>
        </div>
      </div>
    </CollapsibleCard>
  )
}

/**
 * The homepage reels strip. Each row is one vertical clip; the storefront drops
 * any row with no video file, so a half-filled row is safe to leave here while
 * the footage is still being cut.
 */
function ReelsCard() {
  const {
    homeReels,
    updateHomeReelsSection,
    updateHomeReel,
    addHomeReel,
    removeHomeReel,
    moveHomeReel,
    fieldLabel,
  } = useSettingsForm()

  const liveCount = homeReels.reels.filter(r => r.video).length

  return (
    <CollapsibleCard
      title="Homepage Reels"
      description="Vertical clips shown as a scrolling strip. Rows without a video are ignored on the storefront."
      icon={Film}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={homeReels.active && liveCount > 0 ? "default" : "secondary"}>
            {homeReels.active ? (liveCount > 0 ? `${liveCount} live` : "No clips") : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${homeReels.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={() => updateHomeReelsSection({ active: !homeReels.active })}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${homeReels.active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      }
    >
      <div className={`space-y-6 transition-all ${homeReels.active ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className={fieldLabel}>Section Heading</Label>
            <Input
              type="text"
              value={homeReels.title}
              onChange={(e) => updateHomeReelsSection({ title: e.target.value })}
              placeholder="Tall Style In Motion"
              className="font-bold"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Greyed-out word</Label>
            <Input
              type="text"
              value={homeReels.highlight}
              onChange={(e) => updateHomeReelsSection({ highlight: e.target.value })}
              placeholder="In Motion"
              className="font-bold"
            />
            <p className="text-[10px] text-muted-foreground">
              Must be part of the heading above — that word is rendered in grey.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label className={fieldLabel}>Subtitle</Label>
          <Textarea
            value={homeReels.subtitle}
            onChange={(e) => updateHomeReelsSection({ subtitle: e.target.value })}
            placeholder="Short clips of real fits, filmed on real tall bodies."
            rows={2}
          />
        </div>

        <Separator />

        {homeReels.reels.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No reels yet. Add one to start the strip.
          </p>
        ) : (
          <div className="space-y-4">
            {homeReels.reels.map((reel, index) => (
              <div key={index} className="rounded-xl border p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Reel {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveHomeReel(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === homeReels.reels.length - 1}
                      onClick={() => moveHomeReel(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHomeReel(index)}
                      title="Remove reel"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <MediaField
                    label="Video"
                    kind="video"
                    hint="Vertical 9:16 works best. Clips play muted and on loop."
                    value={reel.video}
                    onChange={(next) =>
                      updateHomeReel(index, {
                        video: typeof next === "function" ? next(reel.video) : next,
                      })
                    }
                  />
                  <MediaField
                    label="Poster image"
                    hint="Shown before the clip loads, and when the visitor has reduced motion turned on."
                    value={reel.poster}
                    onChange={(next) =>
                      updateHomeReel(index, {
                        poster: typeof next === "function" ? next(reel.poster) : next,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Caption</Label>
                    <Input
                      type="text"
                      value={reel.caption}
                      onChange={(e) => updateHomeReel(index, { caption: e.target.value })}
                      placeholder="Carman Tapered Jeans on 6'7&quot;"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Link</Label>
                    <Input
                      type="text"
                      value={reel.href}
                      onChange={(e) => updateHomeReel(index, { href: e.target.value })}
                      placeholder="/product/carman-tapered-jeans"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Leave empty and the tile is not clickable.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addHomeReel}
          disabled={homeReels.reels.length >= MAX_HOME_REELS}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add reel
        </Button>
        {homeReels.reels.length >= MAX_HOME_REELS && (
          <p className="text-[10px] text-muted-foreground">
            {MAX_HOME_REELS} is the maximum — the strip scrolls, but past this it just gets slow.
          </p>
        )}
      </div>
    </CollapsibleCard>
  )
}

/**
 * Editorial product strips — "Our Bestselling Jeans" and friends. Each row is a
 * heading plus a source; only `Hand-picked` needs the product list, the other
 * three keep themselves up to date as the catalogue changes.
 */
function ShowcaseCard() {
  const {
    homeShowcase,
    updateHomeShowcaseSection,
    updateHomeShowcaseRow,
    toggleHomeShowcaseProduct,
    addHomeShowcaseRow,
    removeHomeShowcaseRow,
    moveHomeShowcaseRow,
    allProducts,
    productsLoaded,
    allCategories,
    categoriesLoaded,
    fieldLabel,
  } = useSettingsForm()

  // One box per row would need a keyed map for no real gain — the rows are
  // edited one at a time.
  const [productSearch, setProductSearch] = useState("")
  const query = productSearch.trim().toLowerCase()
  const visibleProducts = query
    ? allProducts.filter(p => (p.title || "").toLowerCase().includes(query))
    : allProducts

  const liveCount = homeShowcase.rows.filter(isRenderableShowcaseRow).length

  return (
    <CollapsibleCard
      title="Product Showcase"
      description="Titled product strips on the homepage, e.g. “Our Bestselling Jeans”. Each row picks its own products."
      icon={LayoutGrid}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={homeShowcase.active && liveCount > 0 ? "default" : "secondary"}>
            {homeShowcase.active ? (liveCount > 0 ? `${liveCount} live` : "No rows") : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${homeShowcase.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            onClick={() => updateHomeShowcaseSection({ active: !homeShowcase.active })}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${homeShowcase.active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      }
    >
      <div className={`space-y-6 transition-all ${homeShowcase.active ? '' : 'opacity-50 pointer-events-none'}`}>
        {homeShowcase.rows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No rows yet. Add one to put a product strip on the homepage.
          </p>
        ) : (
          <div className="space-y-4">
            {homeShowcase.rows.map((row, index) => (
              <div key={index} className="rounded-xl border p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Row {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className={`relative mr-2 inline-flex h-6 w-11 items-center rounded-full transition-colors ${row.active ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      onClick={() => updateHomeShowcaseRow(index, { active: !row.active })}
                      title={row.active ? "Visible" : "Hidden"}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${row.active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveHomeShowcaseRow(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === homeShowcase.rows.length - 1}
                      onClick={() => moveHomeShowcaseRow(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHomeShowcaseRow(index)}
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className={`space-y-5 transition-all ${row.active ? '' : 'opacity-50'}`}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Section Heading</Label>
                      <Input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateHomeShowcaseRow(index, { title: e.target.value })}
                        placeholder="Our Bestselling Jeans"
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Greyed-out word</Label>
                      <Input
                        type="text"
                        value={row.highlight}
                        onChange={(e) => updateHomeShowcaseRow(index, { highlight: e.target.value })}
                        placeholder="Jeans"
                        className="font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Must be part of the heading above — that word is rendered in grey. Leave empty for a plain heading.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Subtitle</Label>
                    <Textarea
                      value={row.subtitle}
                      onChange={(e) => updateHomeShowcaseRow(index, { subtitle: e.target.value })}
                      placeholder="Optional line under the heading."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Link label</Label>
                      <Input
                        type="text"
                        value={row.ctaLabel}
                        onChange={(e) => updateHomeShowcaseRow(index, { ctaLabel: e.target.value })}
                        placeholder="Shop all jeans"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Link URL</Label>
                      <Input
                        type="text"
                        value={row.ctaHref}
                        onChange={(e) => updateHomeShowcaseRow(index, { ctaHref: e.target.value })}
                        placeholder="/category/jeans"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Both fields are needed — otherwise no link is shown.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Products come from</Label>
                    <div className="flex flex-wrap gap-2">
                      {HOME_SHOWCASE_SOURCES.map(source => (
                        <button
                          key={source.value}
                          type="button"
                          onClick={() => updateHomeShowcaseRow(index, { source: source.value })}
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                            row.source === source.value
                              ? "border-foreground bg-foreground text-background"
                              : "hover:bg-muted"
                          }`}
                        >
                          {source.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {HOME_SHOWCASE_SOURCES.find(s => s.value === row.source)?.hint}
                    </p>
                  </div>

                  {row.source === "category" && (
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Category</Label>
                      <select
                        value={row.categoryId}
                        onChange={(e) => updateHomeShowcaseRow(index, { categoryId: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                      >
                        <option value="">
                          {categoriesLoaded ? "Select a category…" : "Loading categories…"}
                        </option>
                        {allCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {`${"— ".repeat(category.depth || 0)}${category.name}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        Sub-categories are included, so picking “Jeans” also covers “Men’s Jeans”.
                      </p>
                    </div>
                  )}

                  {row.source === "manual" ? (
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Products ({row.productIds.length}/{MAX_HOME_SHOWCASE_PRODUCTS})
                      </Label>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {row.productIds.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Nothing picked yet — this row stays hidden until it has a product.
                          </span>
                        )}
                        {row.productIds.map(productId => {
                          const p = allProducts.find(x => x.id === productId)
                          return (
                            <div key={productId} className="flex items-center gap-2 rounded-md border bg-muted pl-3 pr-1 py-1 text-xs font-bold">
                              {p ? p.title : productId}
                              <button
                                type="button"
                                onClick={() => toggleHomeShowcaseProduct(index, productId)}
                                className="rounded-md p-1 hover:bg-muted-foreground/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <Input
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products…"
                      />
                      <div className="max-h-60 overflow-y-auto rounded-lg border bg-muted/50">
                        {visibleProducts.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            {productsLoaded ? "No products found." : "Loading products…"}
                          </div>
                        )}
                        {visibleProducts.map(product => {
                          const checked = row.productIds.includes(product.id)
                          const full = !checked && row.productIds.length >= MAX_HOME_SHOWCASE_PRODUCTS
                          return (
                            <label
                              key={product.id}
                              className={`flex items-center gap-3 border-b p-3 transition last:border-0 ${
                                full ? "opacity-40" : "cursor-pointer hover:bg-card"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={full}
                                onChange={() => toggleHomeShowcaseProduct(index, product.id)}
                                className="h-4 w-4 rounded border-input text-foreground focus:ring-ring"
                              />
                              <div className="flex items-center gap-3">
                                {product.thumbnail && (
                                  <img src={product.thumbnail} alt={product.title} className="h-8 w-8 rounded-md object-cover" />
                                )}
                                <span className="text-sm font-medium">{product.title}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        The strip follows the order you tick them in.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label className={fieldLabel}>How many products</Label>
                      <Input
                        type="number"
                        min={MIN_HOME_SHOWCASE_LIMIT}
                        max={MAX_HOME_SHOWCASE_PRODUCTS}
                        value={row.limit}
                        onChange={(e) => updateHomeShowcaseRow(index, { limit: Number(e.target.value) })}
                        className="max-w-[140px] font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Between {MIN_HOME_SHOWCASE_LIMIT} and {MAX_HOME_SHOWCASE_PRODUCTS}. The strip scrolls sideways.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addHomeShowcaseRow}
          disabled={homeShowcase.rows.length >= MAX_HOME_SHOWCASE_ROWS}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add row
        </Button>
        {homeShowcase.rows.length >= MAX_HOME_SHOWCASE_ROWS && (
          <p className="text-[10px] text-muted-foreground">
            {MAX_HOME_SHOWCASE_ROWS} rows is the maximum — past that the homepage is all strips.
          </p>
        )}
      </div>
    </CollapsibleCard>
  )
}

export default function HomepageTab() {
  const {
    activeEditTab,
    setActiveEditTab,
    slideRotationInterval,
    setSlideRotationInterval,
    slideMenActive,
    setSlideMenActive,
    slideMenTitle,
    setSlideMenTitle,
    slideMenSubtitle,
    setSlideMenSubtitle,
    slideMenImage,
    slideMenImageAlt,
    setSlideMenImageAlt,
    setSlideMenImage,
    slideMenVideo,
    setSlideMenVideo,
    slideMenVideoFallback,
    setSlideMenVideoFallback,
    slideMenButtonText,
    setSlideMenButtonText,
    slideMenShopLink,
    setSlideMenShopLink,
    slideMenTopBarTag,
    setSlideMenTopBarTag,
    slideWomenActive,
    setSlideWomenActive,
    slideWomenTitle,
    setSlideWomenTitle,
    slideWomenSubtitle,
    setSlideWomenSubtitle,
    slideWomenImage,
    slideWomenImageAlt,
    setSlideWomenImageAlt,
    setSlideWomenImage,
    slideWomenVideo,
    setSlideWomenVideo,
    slideWomenVideoFallback,
    setSlideWomenVideoFallback,
    slideWomenButtonText,
    setSlideWomenButtonText,
    slideWomenShopLink,
    setSlideWomenShopLink,
    slideWomenTopBarTag,
    setSlideWomenTopBarTag,
    activeCommunityEditTab,
    setActiveCommunityEditTab,
    uploadingMenImage,
    setUploadingMenImage,
    uploadingMenVideo,
    setUploadingMenVideo,
    uploadingMenVideoFallback,
    setUploadingMenVideoFallback,
    uploadingWomenImage,
    setUploadingWomenImage,
    uploadingWomenVideo,
    setUploadingWomenVideo,
    uploadingWomenVideoFallback,
    setUploadingWomenVideoFallback,
    tabHeightsLabel,
    setTabHeightsLabel,
    tabHeightsHeading,
    setTabHeightsHeading,
    tabHeightsDescription,
    setTabHeightsDescription,
    tabHeightsImage,
    setTabHeightsImage,
    tabHeightsCtaText,
    setTabHeightsCtaText,
    tabHeightsCtaLink,
    setTabHeightsCtaLink,
    tabFitLabel,
    setTabFitLabel,
    tabFitHeading,
    setTabFitHeading,
    tabFitDescription,
    setTabFitDescription,
    tabFitImage,
    setTabFitImage,
    tabFitCtaText,
    setTabFitCtaText,
    tabFitCtaLink,
    setTabFitCtaLink,
    tabPurposeLabel,
    setTabPurposeLabel,
    tabPurposeHeading,
    setTabPurposeHeading,
    tabPurposeDescription,
    setTabPurposeDescription,
    tabPurposeImage,
    setTabPurposeImage,
    tabPurposeCtaText,
    setTabPurposeCtaText,
    tabPurposeCtaLink,
    setTabPurposeCtaLink,
    tabProductLabel,
    setTabProductLabel,
    tabProductHeading,
    setTabProductHeading,
    tabProductDescription,
    setTabProductDescription,
    tabProductVideo,
    setTabProductVideo,
    tabProductPoster,
    setTabProductPoster,
    pillarFigureWomen,
    pillarFigureMen1,
    setPillarFigureMen1,
    pillarFigureMen2,
    setPillarFigureMen2,
    pillarFigureMen3,
    setPillarFigureMen3,
    pillarFigureWomen1,
    setPillarFigureWomen1,
    pillarFigureWomen2,
    setPillarFigureWomen2,
    setPillarFigureWomen,
    pillarCompareMenBefore,
    setPillarCompareMenBefore,
    pillarCompareMenAfter,
    setPillarCompareMenAfter,
    pillarCompareWomenBefore,
    setPillarCompareWomenBefore,
    pillarCompareWomenAfter,
    setPillarCompareWomenAfter,
    loading,
    homeDescription,
    setHomeDescription,
    handleFieldFileUpload,
    fieldLabel,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* HOMEPAGE SECTION ORDER */}
          <SectionOrderCard />

          {/* HOMEPAGE HERO SLIDER SETTINGS */}
        <CollapsibleCard
          title="Homepage Hero Slider Settings"
          description="Control the text, title, images, videos, and autoplay animation of the hero slider."
          icon={ImageIcon}
          action={
            /* Segmented control for Men vs Women slides */
            <div className="flex border rounded-lg overflow-hidden p-1 bg-muted/50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveEditTab("men")}
                className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeEditTab === "men" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Men Slide
              </button>
              <button
                type="button"
                onClick={() => setActiveEditTab("women")}
                className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeEditTab === "women" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Women Slide
              </button>
            </div>
          }
        >
          <div className="space-y-6">
              {/* Rotation Animation Interval */}
              <div className="space-y-3">
                <Label className={fieldLabel}>
                  Auto-Rotate Interval (Milliseconds)
                </Label>
                <Input
                  type="number"
                  value={slideRotationInterval}
                  onChange={(e) => setSlideRotationInterval(e.target.value)}
                  className="font-mono font-bold"
                  placeholder="7000"
                />
                <p className="text-[10px] text-muted-foreground">
                  Time in milliseconds between auto-rotations (e.g. 7000 for 7 seconds). Set to 0 to disable auto-rotation.
                </p>
              </div>

              <Separator />

              <div className="pt-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                    Editing {activeEditTab === "men" ? "Men's Slide Collection" : "Women's Slide Collection"}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Active Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeEditTab === "men") setSlideMenActive(!slideMenActive)
                        else setSlideWomenActive(!slideWomenActive)
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        (activeEditTab === "men" ? slideMenActive : slideWomenActive) ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${
                        (activeEditTab === "men" ? slideMenActive : slideWomenActive) ? 'translate-x-4.5' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                {activeEditTab === "men" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* MEN TITLE */}
                    <div className="space-y-3 md:col-span-2">
                      <Label className={fieldLabel}>
                        Title
                      </Label>
                      <Textarea
                        rows={2}
                        value={slideMenTitle}
                        onChange={(e) => setSlideMenTitle(e.target.value)}
                        className="font-extrabold"
                        placeholder="FINALLY, CLOTHES THAT FIT."
                      />
                      <p className="text-[10px] text-muted-foreground">Use regular line breaks for multiple lines of text.</p>
                    </div>

                    {/* MEN SUBTITLE */}
                    <div className="space-y-3 md:col-span-2">
                      <Label className={fieldLabel}>
                        Subtitle Description Text
                      </Label>
                      <Input
                        type="text"
                        value={slideMenSubtitle}
                        onChange={(e) => setSlideMenSubtitle(e.target.value)}
                        placeholder="Designed specifically for men..."
                      />
                    </div>

                    {/* MEN TOP BAR TAG */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Top Bar Small Tag
                      </Label>
                      <Input
                        type="text"
                        value={slideMenTopBarTag}
                        onChange={(e) => setSlideMenTopBarTag(e.target.value)}
                        className="font-bold"
                        placeholder="Made for Tall"
                      />
                    </div>

                    {/* MEN BUTTON TEXT */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Button Text
                      </Label>
                      <Input
                        type="text"
                        value={slideMenButtonText}
                        onChange={(e) => setSlideMenButtonText(e.target.value)}
                        className="font-bold"
                        placeholder="Shop Men"
                      />
                    </div>

                    {/* MEN SHOP LINK */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Shop Link
                      </Label>
                      <Input
                        type="text"
                        value={slideMenShopLink}
                        onChange={(e) => setSlideMenShopLink(e.target.value)}
                        className="font-mono"
                        placeholder="/shop"
                      />
                    </div>

                    {/* MEN IMAGE */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Image URL (Right Column)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        About <strong>1600×1600</strong> (square). With both slides on, each one is
                        cropped to 4:5 on mobile and roughly 7:6 on desktop — so keep the subject
                        centred. If only one slide is active it spans full width at 16:9, where
                        1920×1080 is the better source.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingMenImage ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideMenImage, setUploadingMenImage)}
                            disabled={uploadingMenImage}
                          />
                        </label>
                        {slideMenImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideMenImage("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideMenImage && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideMenImage}>
                            {slideMenImage.substring(slideMenImage.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideMenImage && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-h-[100px] flex items-center justify-center">
                          <img src={slideMenImage} alt="Men Slide Preview" className="max-h-16 object-contain rounded" />
                        </div>
                      )}
                      <div className="pt-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">
                          Image alt text (for SEO and screen readers)
                        </Label>
                        <Input
                          value={slideMenImageAlt}
                          onChange={(e) => setSlideMenImageAlt(e.target.value)}
                          placeholder="Empty falls back to the slide title above"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* MEN VIDEO URL */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Primary Video URL (Left Column Loop)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        <strong>1600×1600</strong> MP4 (H.264), same centred crop as the image.
                        Keep it under <strong>~8 MB</strong> — it autoplays on every visit, so file
                        size is the single biggest cost on the homepage.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingMenVideo ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideMenVideo, setUploadingMenVideo)}
                            disabled={uploadingMenVideo}
                          />
                        </label>
                        {slideMenVideo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideMenVideo("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideMenVideo && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideMenVideo}>
                            {slideMenVideo.substring(slideMenVideo.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideMenVideo && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-w-[240px]">
                          <video src={slideMenVideo} controls className="max-h-24 w-full object-cover rounded" />
                        </div>
                      )}
                    </div>

                    {/* MEN VIDEO FALLBACK */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Fallback Video URL (Left Column Loop)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Same specs as the primary video — <strong>1600×1600</strong> MP4, under
                        ~8 MB. Used only when the primary URL is empty or fails to load.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingMenVideoFallback ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideMenVideoFallback, setUploadingMenVideoFallback)}
                            disabled={uploadingMenVideoFallback}
                          />
                        </label>
                        {slideMenVideoFallback && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideMenVideoFallback("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove fallback video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideMenVideoFallback && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideMenVideoFallback}>
                            {slideMenVideoFallback.substring(slideMenVideoFallback.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideMenVideoFallback && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-w-[240px]">
                          <video src={slideMenVideoFallback} controls className="max-h-24 w-full object-cover rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* WOMEN TITLE */}
                    <div className="space-y-3 md:col-span-2">
                      <Label className={fieldLabel}>
                        Title
                      </Label>
                      <Textarea
                        rows={2}
                        value={slideWomenTitle}
                        onChange={(e) => setSlideWomenTitle(e.target.value)}
                        className="font-extrabold"
                        placeholder="ELEGANCE IN EVERY INCH."
                      />
                      <p className="text-[10px] text-muted-foreground">Use regular line breaks for multiple lines of text.</p>
                    </div>

                    {/* WOMEN SUBTITLE */}
                    <div className="space-y-3 md:col-span-2">
                      <Label className={fieldLabel}>
                        Subtitle Description Text
                      </Label>
                      <Input
                        type="text"
                        value={slideWomenSubtitle}
                        onChange={(e) => setSlideWomenSubtitle(e.target.value)}
                        placeholder="Tailored specifically for tall women..."
                      />
                    </div>

                    {/* WOMEN TOP BAR TAG */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Top Bar Small Tag
                      </Label>
                      <Input
                        type="text"
                        value={slideWomenTopBarTag}
                        onChange={(e) => setSlideWomenTopBarTag(e.target.value)}
                        className="font-bold"
                        placeholder="Made for Tall"
                      />
                    </div>

                    {/* WOMEN BUTTON TEXT */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Button Text
                      </Label>
                      <Input
                        type="text"
                        value={slideWomenButtonText}
                        onChange={(e) => setSlideWomenButtonText(e.target.value)}
                        className="font-bold"
                        placeholder="Shop Women"
                      />
                    </div>

                    {/* WOMEN SHOP LINK */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Shop Link
                      </Label>
                      <Input
                        type="text"
                        value={slideWomenShopLink}
                        onChange={(e) => setSlideWomenShopLink(e.target.value)}
                        className="font-mono"
                        placeholder="/shop"
                      />
                    </div>

                    {/* WOMEN IMAGE */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Image URL (Right Column)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        About <strong>1600×1600</strong> (square). With both slides on, each one is
                        cropped to 4:5 on mobile and roughly 7:6 on desktop — so keep the subject
                        centred. If only one slide is active it spans full width at 16:9, where
                        1920×1080 is the better source.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingWomenImage ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideWomenImage, setUploadingWomenImage)}
                            disabled={uploadingWomenImage}
                          />
                        </label>
                        {slideWomenImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideWomenImage("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideWomenImage && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideWomenImage}>
                            {slideWomenImage.substring(slideWomenImage.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideWomenImage && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-h-[100px] flex items-center justify-center">
                          <img src={slideWomenImage} alt="Women Slide Preview" className="max-h-16 object-contain rounded" />
                        </div>
                      )}
                      <div className="pt-1">
                        <Label className="text-[11px] font-normal text-muted-foreground">
                          Image alt text (for SEO and screen readers)
                        </Label>
                        <Input
                          value={slideWomenImageAlt}
                          onChange={(e) => setSlideWomenImageAlt(e.target.value)}
                          placeholder="Empty falls back to the slide title above"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* WOMEN VIDEO URL */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Primary Video URL (Left Column Loop)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        <strong>1600×1600</strong> MP4 (H.264), same centred crop as the image.
                        Keep it under <strong>~8 MB</strong> — it autoplays on every visit, so file
                        size is the single biggest cost on the homepage.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingWomenVideo ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideWomenVideo, setUploadingWomenVideo)}
                            disabled={uploadingWomenVideo}
                          />
                        </label>
                        {slideWomenVideo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideWomenVideo("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideWomenVideo && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideWomenVideo}>
                            {slideWomenVideo.substring(slideWomenVideo.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideWomenVideo && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-w-[240px]">
                          <video src={slideWomenVideo} controls className="max-h-24 w-full object-cover rounded" />
                        </div>
                      )}
                    </div>

                    {/* WOMEN VIDEO FALLBACK */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Fallback Video URL (Left Column Loop)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Same specs as the primary video — <strong>1600×1600</strong> MP4, under
                        ~8 MB. Used only when the primary URL is empty or fails to load.
                      </p>
                      <div className="flex gap-3 items-center">
                        <label className="cursor-pointer bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-md transition flex items-center gap-2 border shrink-0 font-bold text-xs uppercase tracking-wider select-none">
                          <UploadCloud className="w-4 h-4" />
                          {uploadingWomenVideoFallback ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFieldFileUpload(e, setSlideWomenVideoFallback, setUploadingWomenVideoFallback)}
                            disabled={uploadingWomenVideoFallback}
                          />
                        </label>
                        {slideWomenVideoFallback && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlideWomenVideoFallback("")}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove fallback video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {slideWomenVideoFallback && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={slideWomenVideoFallback}>
                            {slideWomenVideoFallback.substring(slideWomenVideoFallback.lastIndexOf("/") + 1)}
                          </span>
                        )}
                      </div>
                      {slideWomenVideoFallback && (
                        <div className="mt-2 p-2 border bg-muted/30 rounded-md w-fit max-w-[240px]">
                          <video src={slideWomenVideoFallback} controls className="max-h-24 w-full object-cover rounded" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleCard>

          {/* HOMEPAGE COMMUNITY TABS SETTINGS */}
          <CollapsibleCard
            title="Homepage Community Section Settings"
            description='Control labels, headings, body text, buttons, and images for the dynamic brand value tabs ("Our Heights", "Our Fit", "Our Purpose").'
            icon={Settings}
            action={
              <div className="flex border rounded-lg overflow-hidden p-1 bg-muted/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveCommunityEditTab("heights")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeCommunityEditTab === "heights" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Heights Tab
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCommunityEditTab("fit")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeCommunityEditTab === "fit" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Fit Tab
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCommunityEditTab("purpose")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeCommunityEditTab === "purpose" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Purpose Tab
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCommunityEditTab("product")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${activeCommunityEditTab === "product" ? 'bg-card text-foreground shadow-sm border' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Product Tab
                </button>
              </div>
            }
          >
            <div className="space-y-6 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                Editing tab: {
                  activeCommunityEditTab === "heights" ? "Heights tab layout config"
                  : activeCommunityEditTab === "fit" ? "Fit tab layout config"
                  : activeCommunityEditTab === "purpose" ? "Purpose tab layout config"
                  : "Product tab layout config"
                }
              </h3>

              {activeCommunityEditTab === "heights" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Label</Label>
                    <Input type="text" value={tabHeightsLabel} onChange={(e) => setTabHeightsLabel(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Heading / Title</Label>
                    <Input type="text" value={tabHeightsHeading} onChange={(e) => setTabHeightsHeading(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Description Body Text</Label>
                    <Textarea rows={3} value={tabHeightsDescription} onChange={(e) => setTabHeightsDescription(e.target.value)} />
                  </div>
                  <MediaField
                    label="Men Figure"
                    hint="Shown beside the height picker when Men is selected. About 1000×800 (5:4)."
                    value={tabHeightsImage}
                    onChange={setTabHeightsImage}
                  />
                  <MediaField
                    label="Women Figure"
                    hint="Shown beside the height picker when Women is selected. About 1000×800 (5:4)."
                    value={pillarFigureWomen}
                    onChange={setPillarFigureWomen}
                  />

                  <div className="md:col-span-2 space-y-3">
                    <Separator />
                    <Label className={fieldLabel}>Figures per height range</Label>
                    <p className="text-[10px] text-muted-foreground">
                      These line up as a row on the slide, and slide aside to leave the one
                      the visitor picks. Use transparent-background PNG cut-outs, about
                      800×1200 (2:3 portrait), same canvas size for all three — and frame each
                      so the model fills more of the frame the taller the range, since that is
                      what makes the row read as a ladder. Feet should sit at the very bottom
                      edge of the canvas. Any slot left empty falls back to the single figure
                      above.
                    </p>
                  </div>
                  <MediaField
                    label={`Men — 6' to 6'3" (Semi Tall)`}
                    value={pillarFigureMen1}
                    onChange={setPillarFigureMen1}
                  />
                  <MediaField
                    label={`Men — 6'3" to 6'7" (Tall)`}
                    value={pillarFigureMen2}
                    onChange={setPillarFigureMen2}
                  />
                  <MediaField
                    label={`Men — 6'8" to 7'1" (Extra Tall)`}
                    value={pillarFigureMen3}
                    onChange={setPillarFigureMen3}
                  />
                  <div className="hidden md:block" />
                  <MediaField
                    label={`Women — 5'9" to 6'1" (Tall)`}
                    value={pillarFigureWomen1}
                    onChange={setPillarFigureWomen1}
                  />
                  <MediaField
                    label={`Women — 6'2" to 6'6" (Extra Tall)`}
                    value={pillarFigureWomen2}
                    onChange={setPillarFigureWomen2}
                  />

                  <div className="md:col-span-2">
                    <Separator />
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>CTA Button Text</Label>
                    <Input type="text" value={tabHeightsCtaText} onChange={(e) => setTabHeightsCtaText(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>CTA Button Link</Label>
                    <Input type="text" value={tabHeightsCtaLink} onChange={(e) => setTabHeightsCtaLink(e.target.value)} className="font-mono" />
                  </div>
                </div>
              )}

              {activeCommunityEditTab === "fit" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Label</Label>
                    <Input type="text" value={tabFitLabel} onChange={(e) => setTabFitLabel(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Heading / Title</Label>
                    <Input type="text" value={tabFitHeading} onChange={(e) => setTabFitHeading(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Description Body Text</Label>
                    <Textarea rows={3} value={tabFitDescription} onChange={(e) => setTabFitDescription(e.target.value)} />
                  </div>
                  <p className="md:col-span-2 text-xs text-muted-foreground">
                    This tab shows a before/after slider, so it takes four images rather than one —
                    a pair per gender, sitting either side of the drag handle.
                  </p>
                  <MediaField
                    label="Men — Before"
                    hint="About 1000×800 (5:4). Both halves must match exactly, or the slider drifts."
                    value={pillarCompareMenBefore}
                    onChange={setPillarCompareMenBefore}
                  />
                  <MediaField
                    label="Men — After"
                    hint="About 1000×800 (5:4). Same framing as Before."
                    value={pillarCompareMenAfter}
                    onChange={setPillarCompareMenAfter}
                  />
                  <MediaField
                    label="Women — Before"
                    hint="About 1000×800 (5:4). Both halves must match exactly, or the slider drifts."
                    value={pillarCompareWomenBefore}
                    onChange={setPillarCompareWomenBefore}
                  />
                  <MediaField
                    label="Women — After"
                    hint="About 1000×800 (5:4). Same framing as Before."
                    value={pillarCompareWomenAfter}
                    onChange={setPillarCompareWomenAfter}
                  />
                  <div className="space-y-3">
                    <Label className={fieldLabel}>CTA Button Text</Label>
                    <Input type="text" value={tabFitCtaText} onChange={(e) => setTabFitCtaText(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>CTA Button Link</Label>
                    <Input type="text" value={tabFitCtaLink} onChange={(e) => setTabFitCtaLink(e.target.value)} className="font-mono" />
                  </div>
                </div>
              )}

              {activeCommunityEditTab === "purpose" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Label</Label>
                    <Input type="text" value={tabPurposeLabel} onChange={(e) => setTabPurposeLabel(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Heading / Title</Label>
                    <Input type="text" value={tabPurposeHeading} onChange={(e) => setTabPurposeHeading(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Description Body Text</Label>
                    <Textarea rows={3} value={tabPurposeDescription} onChange={(e) => setTabPurposeDescription(e.target.value)} />
                  </div>
                  <MediaField
                    label="Image URL"
                    hint="About 1000×800 (5:4)."
                    value={tabPurposeImage}
                    onChange={setTabPurposeImage}
                  />
                  <div className="space-y-3">
                    <Label className={fieldLabel}>CTA Button Text</Label>
                    <Input type="text" value={tabPurposeCtaText} onChange={(e) => setTabPurposeCtaText(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>CTA Button Link</Label>
                    <Input type="text" value={tabPurposeCtaLink} onChange={(e) => setTabPurposeCtaLink(e.target.value)} className="font-mono" />
                  </div>
                </div>
              )}

              {activeCommunityEditTab === "product" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Label</Label>
                    <Input type="text" value={tabProductLabel} onChange={(e) => setTabProductLabel(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Tab Heading / Title</Label>
                    <Input type="text" value={tabProductHeading} onChange={(e) => setTabProductHeading(e.target.value)} className="font-bold" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Description Body Text</Label>
                    <Textarea rows={3} value={tabProductDescription} onChange={(e) => setTabProductDescription(e.target.value)} />
                  </div>
                  <MediaField
                    label="Slide Video"
                    hint="This slide plays a video instead of a still, so it has no image field. 1920×1080 MP4 (H.264) recommended."
                    value={tabProductVideo}
                    onChange={setTabProductVideo}
                    kind="video"
                  />
                  <MediaField
                    label="Video Poster"
                    hint="Shown while the video loads. About 1000×800 (5:4) — match the video's first frame."
                    value={tabProductPoster}
                    onChange={setTabProductPoster}
                  />
                </div>
              )}

            </div>
          </CollapsibleCard>

          {/* SEASONAL STYLE SECTIONS */}
          <StyleSectionCard
            sectionKey="summer"
            icon={Sun}
            description="Category tiles shown in the seasonal section of the homepage. Turn it off to hide the block."
          />

          {/* FEATURED ICONS */}
          <IconsCard />

          {/* HOMEPAGE VIDEO BANNERS */}
          <VideoBannersCard />

          {/* HOMEPAGE REELS */}
          <ReelsCard />

          {/* PRODUCT SHOWCASE ROWS */}
          <ShowcaseCard />

          {/* HOMEPAGE DESCRIPTION */}
          <CollapsibleCard
            title="Homepage Description"
            description="Free text shown at the bottom of the homepage, just above the footer. Leave empty to hide the block."
            icon={FileText}
          >
            <div className="space-y-3">
              <Label className={fieldLabel}>Description</Label>
              {/* Keyed on `loading`: the editor only reads initialContent once,
                  so mounting it before the saved value arrives would leave it
                  permanently empty. */}
              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground border rounded-xl">
                  Loading editor…
                </div>
              ) : (
                <RichTextEditor
                  initialContent={homeDescription}
                  onChange={setHomeDescription}
                  height={300}
                />
              )}
              <p className="text-[10px] text-muted-foreground">
                Headings, bold, lists and links are all supported.
              </p>
            </div>
          </CollapsibleCard>
    </div>
  )
}
