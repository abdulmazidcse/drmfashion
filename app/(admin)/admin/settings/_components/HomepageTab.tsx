"use client"

import { Settings, Loader2, Trash2, Image as ImageIcon, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

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
    uploadingTabImage,
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
    handleTabImageUpload,
    handleFieldFileUpload,
    fieldLabel,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
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
                        placeholder="New season"
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
                    </div>

                    {/* MEN VIDEO URL */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Primary Video URL (Left Column Loop)
                      </Label>
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
                        placeholder="Contemporary womenswear with a precise length..."
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
                        placeholder="New season"
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
                    </div>

                    {/* WOMEN VIDEO URL */}
                    <div className="space-y-3">
                      <Label className={fieldLabel}>
                        Primary Video URL (Left Column Loop)
                      </Label>
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
              </div>
            }
          >
            <div className="space-y-6 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                Editing tab: {activeCommunityEditTab === "heights" ? "Heights tab layout config" : activeCommunityEditTab === "fit" ? "Fit tab layout config" : "Purpose tab layout config"}
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
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Image URL</Label>
                    <div className="flex gap-3">
                      <Input type="text" value={tabHeightsImage} onChange={(e) => setTabHeightsImage(e.target.value)} className="font-mono" />
                      <label className="relative cursor-pointer bg-card border border-input hover:bg-muted/50 transition-colors rounded-md px-4 flex items-center justify-center gap-2 group whitespace-nowrap shrink-0 shadow-xs">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleTabImageUpload(e, "heights")}
                          disabled={uploadingTabImage}
                        />
                        {uploadingTabImage ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                          <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <span className="text-sm font-bold text-foreground">Upload</span>
                      </label>
                    </div>
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
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Image URL</Label>
                    <div className="flex gap-3">
                      <Input type="text" value={tabFitImage} onChange={(e) => setTabFitImage(e.target.value)} className="font-mono" />
                      <label className="relative cursor-pointer bg-card border border-input hover:bg-muted/50 transition-colors rounded-md px-4 flex items-center justify-center gap-2 group whitespace-nowrap shrink-0 shadow-xs">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleTabImageUpload(e, "fit")}
                          disabled={uploadingTabImage}
                        />
                        {uploadingTabImage ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                          <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <span className="text-sm font-bold text-foreground">Upload</span>
                      </label>
                    </div>
                  </div>
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
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Image URL</Label>
                    <div className="flex gap-3">
                      <Input type="text" value={tabPurposeImage} onChange={(e) => setTabPurposeImage(e.target.value)} className="font-mono" />
                      <label className="relative cursor-pointer bg-card border border-input hover:bg-muted/50 transition-colors rounded-md px-4 flex items-center justify-center gap-2 group whitespace-nowrap shrink-0 shadow-xs">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleTabImageUpload(e, "purpose")}
                          disabled={uploadingTabImage}
                        />
                        {uploadingTabImage ? (
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                          <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <span className="text-sm font-bold text-foreground">Upload</span>
                      </label>
                    </div>
                  </div>
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
            </div>
          </CollapsibleCard>
    </div>
  )
}
