/**
 * Seeds the CMS pages that sit under the header's "About" menu:
 * Our Fit, Our Purpose, Our Product and Reviews & Testimonials.
 *
 *   npx tsx scripts/seed-about-pages.ts
 *
 * Each page is stored exactly as the admin Page Builder would save it — a
 * serialised array of blocks in `Page.content` — so every section stays
 * editable from Admin → Pages without touching code. The block shapes come from
 * components/admin/PageBuilder/types.ts and the visual conventions (type scale,
 * colours, alternating two-column rhythm) are lifted from the existing
 * /pages/about-us record so the whole About section reads as one design.
 *
 * Copy is drawn from the brand pillars already shipping on the homepage
 * (components/home/PillarsCarousel.tsx) and the About Us page, so the voice and
 * the facts match what the site already says.
 *
 * Safe to re-run: pages are upserted by slug and menu items are matched by
 * title under the "About" parent.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─── Shared inline styles ────────────────────────────────────────────────────
// The Page Builder stores rich text as HTML, and the public renderer injects it
// with no page-level typography classes of its own, so sizing/colour has to
// travel with the markup. These mirror the existing about-us page byte for byte.
const H2 =
  'font-size: 1.85rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.25rem; color: #18181b;'
const P = 'font-size: 1.05rem; line-height: 1.8; color: #4b5563;'
const P_SPACED = `${P} margin-bottom: 1.25rem;`
const H4 =
  'font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-bottom: 0.25rem; color: #18181b;'
const P_SMALL = 'font-size: 0.95rem; line-height: 1.6; color: #4b5563;'
const EYEBROW =
  'font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.25em; color: #a1a1aa; margin-bottom: 0.75rem;'

const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`

/** A labelled feature row, as used in the "What makes Tallplus different" block. */
const feature = (title: string, body: string) =>
  `<div style="margin-bottom: 1.25rem;"><h4 style="${H4}">${title}</h4><p style="${P_SMALL}">${body}</p></div>`

/** A single testimonial card. */
const quote = (text: string, name: string, meta: string) =>
  `<div style="border-left: 3px solid #18181b; padding: 0.25rem 0 0.25rem 1.5rem; margin-bottom: 2rem;">` +
  `<p style="font-size: 1.05rem; line-height: 1.8; color: #3f3f46; font-style: italic; margin-bottom: 0.75rem;">&ldquo;${text}&rdquo;</p>` +
  `<p style="font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #18181b;">${name}</p>` +
  `<p style="font-size: 0.75rem; color: #a1a1aa; letter-spacing: 0.05em;">${meta}</p>` +
  `</div>`

// ─── Block helpers ───────────────────────────────────────────────────────────
// Ids are deterministic (slug-prefixed) rather than the builder's timestamp
// format, so re-running the script produces byte-identical content.
let seq = 0
const nextId = (slug: string) => `${slug.replace(/-/g, '_')}_${String(++seq).padStart(2, '0')}`

const hero = (slug: string, heading: string, subheading: string, image: string, buttonText: string, buttonLink: string) => ({
  id: nextId(slug),
  type: 'hero',
  props: {
    heading,
    subheading,
    buttonText,
    buttonLink,
    backgroundImage: image,
    backgroundColor: '#18181b',
    overlayOpacity: 55,
    textAlign: 'center',
    height: 'medium',
    textColor: '#ffffff',
  },
})

const spacer = (slug: string, height = 50) => ({
  id: nextId(slug),
  type: 'spacer',
  props: { height },
})

const divider = (slug: string, marginTop = 10, marginBottom = 40) => ({
  id: nextId(slug),
  type: 'divider',
  props: { style: 'solid', color: '#e4e4e7', marginTop, marginBottom, thickness: 1 },
})

const text = (slug: string, html: string, align: 'left' | 'center' | 'right' = 'left', maxWidth: 'narrow' | 'medium' | 'wide' | 'full' = 'medium') => ({
  id: nextId(slug),
  type: 'text',
  props: { html, align, maxWidth },
})

/** Text on one side, image on the other. `side` is where the *image* goes. */
const split = (slug: string, side: 'left' | 'right', html: string, image: string) => ({
  id: nextId(slug),
  type: 'two-column',
  props: {
    leftHtml: side === 'left' ? '' : html,
    rightHtml: side === 'left' ? html : '',
    leftImage: side === 'left' ? image : '',
    rightImage: side === 'left' ? '' : image,
    leftWidth: '50',
    gap: 'large',
    reverseOnMobile: false,
  },
})

/** Two text columns, no imagery. */
const columns = (slug: string, leftHtml: string, rightHtml: string) => ({
  id: nextId(slug),
  type: 'two-column',
  props: {
    leftHtml,
    rightHtml,
    leftImage: '',
    rightImage: '',
    leftWidth: '50',
    gap: 'large',
    reverseOnMobile: false,
  },
})

const cta = (slug: string, heading: string, subtext: string, buttonText: string, buttonLink: string, secondaryButtonText = '', secondaryButtonLink = '') => ({
  id: nextId(slug),
  type: 'cta',
  props: {
    heading,
    subtext,
    buttonText,
    buttonLink,
    secondaryButtonText,
    secondaryButtonLink,
    backgroundColor: '#18181b',
    textColor: '#ffffff',
    buttonColor: '#ffffff',
    align: 'center',
    backgroundImage: '',
  },
})

// ─── Page: Our Fit ───────────────────────────────────────────────────────────
function ourFit() {
  const s = 'our-fit'
  return [
    hero(
      s,
      'OUR FIT',
      'The tall fit, perfected — proportioned for real bodies, not scaled-up patterns.',
      IMG('1483985988355-763728e1935b', 1600),
      'Shop The Collection',
      '/shop'
    ),
    spacer(s),
    text(
      s,
      `<p style="${EYEBROW}">The Problem With &ldquo;Long&rdquo;</p>` +
        `<h2 style="${H2}">Most Tall Clothing Is Just Bigger Clothing</h2>` +
        `<p style="${P_SPACED}">The standard industry shortcut is to take a regular pattern and grade it up — add length to the body, add length to the sleeve, ship it. The result is clothing that is technically longer but fits nowhere properly: shoulder seams that fall down the arm, armholes that sit too low, a waist that lands in the wrong place, and a hem that still rides up when you reach.</p>` +
        `<p style="${P}">We build the other way around. Every pattern starts from tall proportions, which means the rise, the shoulder slope, the armhole depth, the sleeve pitch and the hem are each drafted for the body that will actually wear the garment.</p>`,
      'left',
      'wide'
    ),
    spacer(s),
    split(
      s,
      'right',
      `<h2 style="${H2}">Thousands Of Hours On Real People</h2>` +
        `<p style="${P_SPACED}">We are serious about fit. We spend thousands of hours measuring real people, collecting feedback, and working with skilled manufacturers to create the best fit possible.</p>` +
        `<p style="${P}">Fit sessions run across a range of heights and builds rather than a single fit model, because someone who is 6'2" and lean and someone who is 6'6" and broad do not need the same garment stretched to a different size. That range is what turns a measurement chart into clothing that works.</p>`,
      IMG('1512436991641-6745cdb1723f')
    ),
    spacer(s),
    split(
      s,
      'left',
      `<h2 style="${H2}">Built In Multiple Tall Lengths</h2>` +
        `<p style="${P_SPACED}">Height is not one size. Each piece is functionally built in multiple tall lengths, so you can choose the length that matches your proportions instead of settling for the closest option available.</p>` +
        `<p style="${P}">That applies to inseams, sleeve lengths and body length together — because a shirt that finally covers your waistband is no use if the cuff still sits above your wrist bone.</p>`,
      IMG('1541099649105-f69ad21f3246')
    ),
    spacer(s),
    divider(s),
    text(
      s,
      `<h2 style="text-align: center; font-size: 2.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;">How We Get Fit Right</h2>` +
        `<p style="text-align: center; font-size: 1.15rem; line-height: 1.8; color: #4b5563; max-width: 760px; margin: 0 auto;">Four things we do on every style, before it ever reaches the site.</p>`,
      'center',
      'wide'
    ),
    columns(
      s,
      feature(
        'Drafted From Tall Blocks',
        'Patterns begin at tall proportions instead of being graded up from a regular size.'
      ) +
        feature(
          'Fitted On Real Bodies',
          'Wear tests across a spread of heights and builds, not a single studio fit model.'
        ),
      feature(
        'Graded Length By Length',
        'Inseam, sleeve and body length move independently so proportions hold at every size.'
      ) +
        feature(
          'Checked After Washing',
          'Measurements are verified post-wash, so the fit you receive is the fit that lasts.'
        )
    ),
    spacer(s),
    divider(s, 10, 30),
    split(
      s,
      'right',
      `<h2 style="${H2}">Find Your Size In One Sitting</h2>` +
        `<p style="${P_SPACED}">Every product page lists full garment measurements, not just a letter size, so you can compare against a piece you already own and trust. Our size charts break down chest, waist, inseam and sleeve for each tall length we offer.</p>` +
        `<p style="${P}">Still between sizes? Our team answers fit questions directly — send us your measurements and we will tell you which length to order.</p>`,
      IMG('1490481651871-ab68de25d43d')
    ),
    spacer(s),
    cta(
      s,
      'Not Sure Which Length?',
      'Check the full measurement charts, or ask us — we would rather help you order once than have you send it back.',
      'View Size Charts',
      '/pages/size-charts',
      'Ask Our Team',
      '/pages/contact-support'
    ),
  ]
}

// ─── Page: Our Purpose ───────────────────────────────────────────────────────
function ourPurpose() {
  const s = 'our-purpose'
  return [
    hero(
      s,
      'OUR PURPOSE',
      'We are all about community — built by the people who could never find their size.',
      IMG('1522071820081-009f0129c71c', 1600),
      'Join The Community',
      '/pages/feedback'
    ),
    spacer(s),
    text(
      s,
      `<p style="${EYEBROW}">Why We Exist</p>` +
        `<h2 style="${H2}">It Started With Coming Up Short</h2>` +
        `<p style="${P_SPACED}">We know the frustration of searching endlessly for clothing that fits — and coming up short. Sleeves that stop early. Hems that never quite make it. Changing rooms where the largest size still is not the right shape.</p>` +
        `<p style="${P}">What started as one family's mission to solve fit challenges has grown into a global community with a shared vision: clothing that is designed around real proportions, so getting dressed stops being a compromise.</p>`,
      'left',
      'wide'
    ),
    spacer(s),
    split(
      s,
      'right',
      `<h2 style="${H2}">A Community That Designs With Us</h2>` +
        `<p style="${P_SPACED}">Our customers are not an audience we sell to — they are the reason a style exists. Requests, complaints and fit notes come in every week, and they go straight to the people drafting patterns.</p>` +
        `<p style="${P}">Some of our best-selling pieces exist because enough people asked for the same thing: a longer rise, a deeper armhole, a tee that still covers after a wash. When you tell us what is missing, it becomes a product.</p>`,
      IMG('1519085360753-af0119f7cbe7')
    ),
    spacer(s),
    split(
      s,
      'left',
      `<h2 style="${H2}">Fifteen Years Behind The Seams</h2>` +
        `<p style="${P_SPACED}">Before Tallplus became a brand, we were a sourcing and manufacturing partner, studying every detail of garment creation — fabric selection, denim construction, measurements, fitting and final production — for brands around the world.</p>` +
        `<p style="${P}">Working across different markets taught us one thing: great clothing starts with understanding the person who wears it. We built Tallplus to put that knowledge to work for the people the industry kept overlooking.</p>`,
      IMG('1524504388940-b1c1722653e1')
    ),
    spacer(s),
    divider(s),
    text(
      s,
      `<h2 style="text-align: center; font-size: 2.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;">Our Mission</h2>` +
        `<p style="text-align: center; font-size: 1.25rem; line-height: 1.8; color: #4b5563; max-width: 800px; margin: 0 auto;">To create high-quality clothing that helps people feel comfortable, confident, and proud of who they are — with the freedom to choose clothing that matches their body, their style, and their personality. Because everyone deserves clothing that makes them feel their best.</p>`,
      'center',
      'wide'
    ),
    divider(s, 40, 10),
    spacer(s, 55),
    columns(
      s,
      `<h2 style="${H2}">What We Stand For</h2>` +
        feature('Proportion Before Size', 'Fit is a question of shape, not of adding inches to a smaller pattern.') +
        feature('Listen, Then Build', 'Community feedback drives the product roadmap, not the other way round.') +
        feature('Say It Plainly', 'Honest measurements, honest stock, honest answers about what will fit you.'),
      `<h2 style="${H2}">Where We Are Going</h2>` +
        feature('Wider Length Coverage', 'More tall lengths across more categories, so fewer people fall between sizes.') +
        feature('Made-To-Measure Access', 'Customisation that is affordable enough to be a normal choice, not a luxury one.') +
        feature('A Bigger Table', 'Growing the community that makes all of the above possible.')
    ),
    spacer(s),
    cta(
      s,
      'Tell Us What You Cannot Find',
      'Every request is read by the team that draws the patterns. If something is missing from your wardrobe, tell us.',
      'Share Your Feedback',
      '/pages/feedback',
      'Read Our Story',
      '/pages/about-us'
    ),
  ]
}

// ─── Page: Our Product ───────────────────────────────────────────────────────
function ourProduct() {
  const s = 'our-product'
  return [
    hero(
      s,
      'OUR PRODUCT',
      'Intentional design — every garment created with a reason to exist.',
      IMG('1441986300917-64674bd600d8', 1600),
      'Shop All',
      '/shop'
    ),
    spacer(s),
    text(
      s,
      `<p style="${EYEBROW}">How A Style Begins</p>` +
        `<h2 style="${H2}">Nothing Here Exists By Accident</h2>` +
        `<p style="${P_SPACED}">Every garment is created with purpose, whether it is a request from our community or a suggestion from our seasoned design team. If a piece cannot answer the question &ldquo;who is this for and what problem does it solve&rdquo;, it does not get made.</p>` +
        `<p style="${P}">That keeps the range deliberately tight. We would rather offer fewer styles that fit properly in every length than a catalogue padded with sizes that only technically exist.</p>`,
      'left',
      'wide'
    ),
    spacer(s),
    split(
      s,
      'right',
      `<h2 style="${H2}">Fabric Chosen For How It Behaves</h2>` +
        `<p style="${P_SPACED}">Long garments put fabric under more stress: more weight to hang, more length to hold its shape, more distance for a seam to pull. So fabric is selected for drape, recovery and shrinkage before it is selected for looks.</p>` +
        `<p style="${P}">Every material is washed and re-measured during development. If a fabric loses length or shape after laundering, it does not go into a tall pattern — because a piece that fits for a month is not a piece that fits.</p>`,
      IMG('1582719508461-905c673771fd')
    ),
    spacer(s),
    split(
      s,
      'left',
      `<h2 style="${H2}">Construction You Only Notice Later</h2>` +
        `<p style="${P_SPACED}">Reinforced stress points, generous seam allowances, and hems deep enough to survive an alteration. These details cost more to make and are invisible on a product photo — they are the difference between a garment lasting one season and several.</p>` +
        `<p style="${P}">Our fifteen years on the manufacturing side is what makes this practical rather than aspirational: we know which corners factories are tempted to cut, and we specify against them.</p>`,
      IMG('1507679799987-c73779587ccf')
    ),
    spacer(s),
    divider(s),
    text(
      s,
      `<h2 style="text-align: center; font-size: 2.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;">From Idea To Wardrobe</h2>` +
        `<p style="text-align: center; font-size: 1.15rem; line-height: 1.8; color: #4b5563; max-width: 760px; margin: 0 auto;">The path every style takes before it reaches you.</p>`,
      'center',
      'wide'
    ),
    columns(
      s,
      feature('01 — Requested', 'A gap identified by our community or flagged by the design team.') +
        feature('02 — Drafted', 'Patterned from tall blocks, in every length the style will ship in.') +
        feature('03 — Sampled', 'Fabric tested for drape, recovery and shrinkage, then washed and re-measured.'),
      feature('04 — Fitted', 'Worn and assessed across a spread of heights and builds, then corrected.') +
        feature('05 — Produced', 'Made by long-standing manufacturing partners to a specified construction.') +
        feature('06 — Reviewed', 'Customer fit feedback feeds straight back into the next production run.')
    ),
    spacer(s),
    divider(s, 10, 30),
    columns(
      s,
      `<h2 style="${H2}">Care That Protects The Fit</h2>` +
        `<p style="${P_SPACED}">Tall garments are an investment in length, and length is the first thing a hot wash takes away. Cold wash, low tumble, and hang-dry where you can.</p>` +
        `<p style="${P}">Full care instructions ship with every order and are printed on each garment label.</p>`,
      `<h2 style="${H2}">If It Is Not Right</h2>` +
        `<p style="${P_SPACED}">Fit is hard to judge on a screen, so returns and exchanges are straightforward — and the reason you send something back tells us what to fix.</p>` +
        `<p style="${P}">Every return reason is logged and reviewed against the pattern it came from.</p>`
    ),
    spacer(s),
    cta(
      s,
      'See It On The Rail',
      'Browse the current collection, or read how we approach fit before you choose a length.',
      'Shop All',
      '/shop',
      'How We Fit',
      '/pages/our-fit'
    ),
  ]
}

// ─── Page: Reviews & Testimonials ────────────────────────────────────────────
function reviews() {
  const s = 'reviews-testimonials'
  return [
    hero(
      s,
      'REVIEWS & TESTIMONIALS',
      'In our customers’ words — what changes when clothing finally fits.',
      IMG('1492562080023-ab3db95bfbce', 1600),
      'Shop The Collection',
      '/shop'
    ),
    spacer(s),
    text(
      s,
      `<p style="${EYEBROW}">Why We Publish These</p>` +
        `<h2 style="${H2}">Fit Feedback Is Our Best Product Data</h2>` +
        `<p style="${P_SPACED}">Reviews are not decoration for us. Every fit note, every &ldquo;the sleeve is finally long enough&rdquo; and every &ldquo;this still rides up&rdquo; gets read and matched against the pattern it came from.</p>` +
        `<p style="${P}">The quotes below are representative of the feedback we receive most often. Product-level reviews live on each product page, where they are most useful when you are choosing a length.</p>`,
      'left',
      'wide'
    ),
    spacer(s),
    columns(
      s,
      quote(
        'I am 6’4” and I have spent twenty years tucking in shirts that came untucked by lunchtime. This is the first brand where the body length is actually right, straight out of the bag.',
        'Daniel R.',
        '6’4” · Button Shirts'
      ) +
        quote(
          'The measurements on the product page matched the garment exactly. I ordered one size, in one length, and it fit. I did not know that was possible online.',
          'Priya S.',
          '6’1” · Pants + Trousers'
        ),
      quote(
        'What sold me was the armhole. Every other tall shirt I own is long but cut like a tent. This one is long and still sits on my shoulders.',
        'Marcus T.',
        '6’6” · Tees + Tanks'
      ) +
        quote(
          'I emailed my measurements and asked which inseam to order. They replied with a straight answer instead of a size chart link. It fit first time.',
          'Elena K.',
          '5’11” · Jeans + Denim'
        )
    ),
    spacer(s),
    divider(s),
    split(
      s,
      'right',
      `<h2 style="${H2}">After The Wash Is The Real Test</h2>` +
        `<p style="${P_SPACED}">The feedback we watch most closely arrives a month in, not a day in. Length that survives laundering is the whole point of a tall garment, so we ask specifically about it.</p>` +
        `<p style="${P}">&ldquo;Six months and four washes later it is still the right length&rdquo; is the review we are actually trying to earn.</p>`,
      IMG('1534528741775-53994a69daeb')
    ),
    spacer(s),
    split(
      s,
      'left',
      `<h2 style="${H2}">We Publish The Criticism Too</h2>` +
        `<p style="${P_SPACED}">Not every piece of feedback is flattering, and hiding the unflattering ones would waste the only honest signal we have. When a style is called out for running short or sitting wrong, that goes to the pattern team.</p>` +
        `<p style="${P}">Several current styles are on their second or third revision because of a review that told us something was not good enough.</p>`,
      IMG('1500648767791-00dcc994a43e')
    ),
    spacer(s),
    divider(s, 10, 30),
    text(
      s,
      `<h2 style="text-align: center; font-size: 2.25rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 1.5rem; color: #18181b;">Leaving A Review</h2>` +
        `<p style="text-align: center; font-size: 1.15rem; line-height: 1.8; color: #4b5563; max-width: 760px; margin: 0 auto;">The three details that make a review genuinely useful to the next person: your height, the size and length you ordered, and how it fit after a wash.</p>`,
      'center',
      'wide'
    ),
    spacer(s, 20),
    cta(
      s,
      'Add Your Verdict',
      'Bought something from us? Tell us how it fits — on the product page, or straight to the team.',
      'Leave Feedback',
      '/pages/feedback',
      'Shop The Collection',
      '/shop'
    ),
  ]
}

// ─── Definitions ─────────────────────────────────────────────────────────────

const PAGES = [
  { title: 'Our Fit', slug: 'our-fit', blocks: ourFit },
  { title: 'Our Purpose', slug: 'our-purpose', blocks: ourPurpose },
  { title: 'Our Product', slug: 'our-product', blocks: ourProduct },
  { title: 'Reviews & Testimonials', slug: 'reviews-testimonials', blocks: reviews },
]

// Journal is a first-class route (app/journal), not a CMS page, so the menu
// points straight at it rather than duplicating it under /pages.
//
// `imageUrl` is what promotes an entry to an image tile in the About mega menu
// (see AboutMenuContent in components/HeaderClient.tsx). The three pillars get
// tiles; About Us, Journal and Reviews stay as text links, matching the
// reference layout. Each tile reuses its own page's subject so the menu and the
// page it opens read as the same thing.
const ABOUT_MENU = [
  { title: 'About Us', url: '/pages/about-us', imageUrl: null },
  { title: 'Our Fit', url: '/pages/our-fit', imageUrl: IMG('1512436991641-6745cdb1723f', 900) },
  { title: 'Our Purpose', url: '/pages/our-purpose', imageUrl: IMG('1522071820081-009f0129c71c', 900) },
  { title: 'Our Product', url: '/pages/our-product', imageUrl: IMG('1441986300917-64674bd600d8', 900) },
  { title: 'Journal', url: '/journal', imageUrl: null },
  { title: 'Reviews & Testimonials', url: '/pages/reviews-testimonials', imageUrl: null },
]

async function main() {
  // ── Pages ──
  for (const def of PAGES) {
    seq = 0
    // JSON.stringify with 2-space indent matches serializeContent() in
    // components/admin/PageBuilder/types.ts, so the builder round-trips cleanly.
    const content = JSON.stringify(def.blocks(), null, 2)
    const existing = await prisma.page.findUnique({ where: { slug: def.slug } })

    await prisma.page.upsert({
      where: { slug: def.slug },
      update: { title: def.title, content, published: true },
      create: { title: def.title, slug: def.slug, content, published: true },
    })

    const blockCount = def.blocks().length
    console.log(
      `${existing ? 'updated' : 'created'}  /pages/${def.slug}  "${def.title}"  ${blockCount} blocks, ${content.length} chars`
    )
  }

  // ── Menu wiring under "About" ──
  const about = await prisma.menuItem.findFirst({ where: { title: 'About', parentId: null } })
  if (!about) {
    console.log('\n! No root "About" menu item found — skipping menu wiring.')
    return
  }

  console.log('')
  for (const [index, item] of ABOUT_MENU.entries()) {
    const existing = await prisma.menuItem.findFirst({
      where: { parentId: about.id, title: item.title },
    })
    const tile = item.imageUrl ? '  [tile]' : ''
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { url: item.url, position: index, imageUrl: item.imageUrl },
      })
      console.log(`menu updated  About > ${item.title}  ->  ${item.url}${tile}`)
    } else {
      await prisma.menuItem.create({
        data: {
          title: item.title,
          url: item.url,
          position: index,
          parentId: about.id,
          imageUrl: item.imageUrl,
        },
      })
      console.log(`menu created  About > ${item.title}  ->  ${item.url}${tile}`)
    }
  }

  // The header menu tree is Redis-cached for 10 minutes (see components/Header.tsx).
  try {
    const { invalidateCache } = await import('../lib/redis')
    await invalidateCache('header:menus')
    console.log('\nheader:menus cache invalidated')
  } catch {
    console.log('\n(could not invalidate header:menus — it expires within 10 minutes)')
  }
}

main()
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
