"use client"

import { ArrowDown, ArrowUp, ExternalLink, LifeBuoy, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"
import { MAX_CONTACT_FAQS, type ContactFaq } from "@/lib/contactPage"

/**
 * Everything on /pages/contact-support that used to be fixed in code, plus the
 * office address the footer shows. The contact email stays in Brand Settings,
 * where it is also used for order emails.
 */
export default function ContactPageCard() {
  const { contactPage, updateContactPage, fieldLabel, helpText } = useSettingsForm()

  const setFaqs = (faqs: ContactFaq[]) => updateContactPage({ faqs })
  const updateFaq = (i: number, patch: Partial<ContactFaq>) =>
    setFaqs(contactPage.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  const moveFaq = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= contactPage.faqs.length) return
    const next = [...contactPage.faqs]
    ;[next[i], next[j]] = [next[j], next[i]]
    setFaqs(next)
  }

  return (
    <CollapsibleCard
      title="Contact Page"
      description="The Contact Us page and the office address shown in the footer."
      icon={LifeBuoy}
      defaultCollapsed
      action={
        <a
          href="/pages/contact-support"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          View page <ExternalLink className="h-3.5 w-3.5" />
        </a>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 md:col-span-2">
            <Label className={fieldLabel}>Heading</Label>
            <Input
              value={contactPage.heroTitle}
              onChange={(e) => updateContactPage({ heroTitle: e.target.value })}
              placeholder="How can we help?"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label className={fieldLabel}>Intro text</Label>
            <Textarea
              value={contactPage.heroText}
              onChange={(e) => updateContactPage({ heroText: e.target.value })}
              rows={3}
            />
            <p className={helpText}>Write {"{store}"} to insert the store name.</p>
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Typical reply time</Label>
            <Input
              value={contactPage.replyTime}
              onChange={(e) => updateContactPage({ replyTime: e.target.value })}
              placeholder="Within 1 business day"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Working hours</Label>
            <Input
              value={contactPage.hours}
              onChange={(e) => updateContactPage({ hours: e.target.value })}
              placeholder="Sun – Thu, 10:00 AM – 6:00 PM"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Phone</Label>
            <Input
              value={contactPage.phone}
              onChange={(e) => updateContactPage({ phone: e.target.value })}
              placeholder="+880 1XXX-XXXXXX"
            />
            <p className={helpText}>Leave empty to hide the phone row.</p>
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Google Maps link</Label>
            <Input
              type="url"
              value={contactPage.mapUrl}
              onChange={(e) => updateContactPage({ mapUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/…"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <Label className={fieldLabel}>Office address</Label>
            <Textarea
              value={contactPage.address}
              onChange={(e) => updateContactPage({ address: e.target.value })}
              rows={2}
            />
            <p className={helpText}>Shown on the Contact page and in the footer. Leave empty to hide it in both.</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className={fieldLabel}>Questions (FAQ)</Label>
              <p className={helpText}>Shown under “Before you write”. Remove them all to hide the section.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={contactPage.faqs.length >= MAX_CONTACT_FAQS}
              onClick={() => setFaqs([...contactPage.faqs, { q: "", a: "" }])}
            >
              <Plus className="h-4 w-4" /> Add question
            </Button>
          </div>

          {contactPage.faqs.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No questions — the FAQ section is hidden.
            </p>
          )}

          {contactPage.faqs.map((faq, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Input
                  value={faq.q}
                  onChange={(e) => updateFaq(i, { q: e.target.value })}
                  placeholder="Question"
                  className="font-semibold"
                />
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => moveFaq(i, -1)} title="Move up">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={i === contactPage.faqs.length - 1}
                  onClick={() => moveFaq(i, 1)}
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFaqs(contactPage.faqs.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={faq.a}
                onChange={(e) => updateFaq(i, { a: e.target.value })}
                placeholder="Answer"
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>
    </CollapsibleCard>
  )
}
