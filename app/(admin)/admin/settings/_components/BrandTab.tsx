"use client"

import { Globe, Image as ImageIcon } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function BrandTab() {
  const {
    setUploadingLogo,
    setUploadingFavicon,
    brandStoreName,
    setBrandStoreName,
    brandLogoUrl,
    setBrandLogoUrl,
    brandFaviconUrl,
    setBrandFaviconUrl,
    brandSlogan,
    setBrandSlogan,
    contactEmail,
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
    fieldLabel,
    helpText,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
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
              <div className="space-y-3">
                <Label className={fieldLabel}>
                  Logo Image
                </Label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder="URL to logo"
                  />
                  <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl cursor-pointer text-xs flex items-center justify-center shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const files = e.target.files
                        if (!files || files.length === 0) return
                        try {
                          setUploadingLogo(true)
                          const formData = new FormData()
                          formData.append("files", files[0])
                          const res = await api.post("/admin/upload", formData, {
                            headers: { "Content-Type": "multipart/form-data" }
                          })
                          if (res.data.urls && res.data.urls.length > 0) {
                            setBrandLogoUrl(res.data.urls[0])
                          }
                        } catch(err) {
                          Swal.fire({ text: "Failed to upload logo image.", confirmButtonColor: "#18181b" })
                        } finally {
                          setUploadingLogo(false)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {brandLogoUrl && (
                  <div className="mt-4 p-4 border bg-muted/50 rounded-lg flex justify-center">
                    <img src={brandLogoUrl} alt="Logo Preview" className="max-h-16 object-contain" />
                  </div>
                )}
                <p className={helpText}>
                  * Horizontal logo recommended.
                </p>
              </div>

              <div className="space-y-3">
                <Label className={fieldLabel}>
                  Favicon Icon (URL)
                </Label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={brandFaviconUrl}
                    onChange={(e) => setBrandFaviconUrl(e.target.value)}
                    placeholder="URL to favicon"
                  />
                  <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-xl cursor-pointer text-xs flex items-center justify-center shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const files = e.target.files
                        if (!files || files.length === 0) return
                        try {
                          setUploadingFavicon(true)
                          const formData = new FormData()
                          formData.append("files", files[0])
                          const res = await api.post("/admin/upload", formData, {
                            headers: { "Content-Type": "multipart/form-data" }
                          })
                          if (res.data.urls && res.data.urls.length > 0) {
                            setBrandFaviconUrl(res.data.urls[0])
                          }
                        } catch(err) {
                          Swal.fire({ text: "Failed to upload favicon icon.", confirmButtonColor: "#18181b" })
                        } finally {
                          setUploadingFavicon(false)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {brandFaviconUrl && (
                  <div className="mt-4 p-4 border bg-muted/50 rounded-lg flex justify-center">
                    <img src={brandFaviconUrl} alt="Favicon Preview" className="h-10 w-10 object-contain" />
                  </div>
                )}
                <p className={helpText}>
                  * Square image recommended (32×32 or larger). Falls back to the default icon when empty.
                </p>
              </div>
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
