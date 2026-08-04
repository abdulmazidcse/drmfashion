/**
 * Seeds the CMS pages linked from the header "HELP" menu (see lib/helpLinks.ts).
 *
 *   npx tsx scripts/seed-help-pages.ts            # only create pages that are missing
 *   npx tsx scripts/seed-help-pages.ts --force    # overwrite existing pages with the template
 *
 * Content is written in the Page Builder block format, so every page stays
 * editable from Admin → Pages after seeding.
 */
import { prisma } from "@/lib/prisma"
import type { Block, BlockType, BlockProps, HeroProps, TextProps, CtaProps } from "@/components/admin/PageBuilder/types"
import { DEFAULT_PROPS } from "@/components/admin/PageBuilder/types"

let blockSeq = 0
function block<T extends BlockType>(type: T, props: Partial<BlockProps>): Block {
  blockSeq += 1
  return {
    id: `block_seed_${blockSeq}`,
    type,
    props: { ...DEFAULT_PROPS[type], ...props } as BlockProps,
  }
}

const hero = (heading: string, subheading: string): Block =>
  block("hero", {
    heading,
    subheading,
    buttonText: "",
    buttonLink: "",
    backgroundImage: "",
    backgroundColor: "#18181b",
    overlayOpacity: 0,
    textAlign: "center",
    height: "small",
    textColor: "#ffffff",
  } as Partial<HeroProps>)

const text = (html: string, maxWidth: TextProps["maxWidth"] = "medium"): Block =>
  block("text", { html, align: "left", maxWidth } as Partial<TextProps>)

const cta = (heading: string, subtext: string, buttonText = "Contact Us", buttonLink = "/pages/contact-support"): Block =>
  block("cta", {
    heading,
    subtext,
    buttonText,
    buttonLink,
    secondaryButtonText: "Continue Shopping",
    secondaryButtonLink: "/shop",
    backgroundColor: "#18181b",
    textColor: "#ffffff",
    buttonColor: "#ffffff",
    align: "center",
    backgroundImage: "",
  } as Partial<CtaProps>)

// ─── Page templates ───────────────────────────────────────────────────────────

const PAGES: { slug: string; title: string; blocks: Block[] }[] = [
  {
    slug: "help-center",
    title: "Help Center",
    blocks: [
      hero("Help Center", "Answers to the questions we get asked the most — and the fastest way to reach a human."),
      text(`
        <h2>Popular topics</h2>
        <ul>
          <li><a href="/track-order">Track my order</a> — no login needed, just your order number or phone number.</li>
          <li><a href="/pages/shipping-policy">Shipping</a> — delivery times, charges and coverage areas.</li>
          <li><a href="/pages/returns-exchanges">Returns &amp; exchanges</a> — how to send something back or swap a size.</li>
          <li><a href="/pages/size-charts">Size charts</a> — measurements and fit guidance for tall sizing.</li>
          <li><a href="/pages/feedback">Feedback</a> — tell us what to improve.</li>
          <li><a href="/pages/contact-support">Contact us</a> — talk to our support team.</li>
        </ul>
      `, "wide"),
      text(`
        <h2>Orders</h2>
        <h3>How do I know my order went through?</h3>
        <p>You will get a confirmation email with your Order ID as soon as the order is placed. If it hasn't arrived
        within a few minutes, check your spam folder, then <a href="/pages/contact-support">contact us</a> with the
        email address you used at checkout.</p>

        <h3>Where do I find my Order ID?</h3>
        <p>It's in your order confirmation email, and under <a href="/account">My Account → Orders</a> if you checked
        out with an account.</p>

        <h3>Can I change or cancel my order?</h3>
        <p>Reach out as soon as possible. While the order is still marked <strong>Pending</strong> we can usually change
        the size, address or cancel it. Once it moves to <strong>Processing</strong> or <strong>Shipped</strong> it has
        to be handled as a return.</p>

        <h3>I checked out as a guest — can I still track my order?</h3>
        <p>Yes. Open <a href="/track-order">Track My Order</a> and enter the order number from your confirmation email — or the phone number you ordered with. No sign-in required.</p>
      `, "wide"),
      text(`
        <h2>Payments</h2>
        <h3>Which payment methods do you accept?</h3>
        <p>Card payments, plus the online and cash-on-delivery options shown at checkout for your region.</p>

        <h3>Which currency am I charged in?</h3>
        <p>Prices are shown in the currency you pick from the <strong>CURRENCY</strong> selector at the top of the page.
        Your order stores the currency and exchange rate used at the moment you checked out, so your invoice always
        matches what you saw.</p>

        <h3>My payment failed but money was deducted.</h3>
        <p>Failed authorisations are released automatically by the bank, usually within 5–10 business days. Send us the
        transaction reference and we'll follow it up.</p>

        <h3>Do you accept coupons and gift cards?</h3>
        <p>Yes — enter the code in the discount field on the cart or checkout page. One coupon can be used per order,
        and gift-card balances can be combined with any other payment method.</p>
      `, "wide"),
      text(`
        <h2>Products &amp; fit</h2>
        <h3>How does your sizing work?</h3>
        <p>Everything is cut for tall bodies — longer sleeves, longer inseams and a longer body length than standard
        sizing. Check the <a href="/pages/size-charts">size charts</a> before ordering, and measure a garment you
        already own to compare.</p>

        <h3>An item is out of stock — will it come back?</h3>
        <p>Use the stock notification button on the product page and we'll email you the moment that size and colour is
        restocked.</p>

        <h3>Can I ask a question about a specific product?</h3>
        <p>Yes — every product page has a questions section. We answer publicly so other tall customers benefit too.</p>
      `, "wide"),
      text(`
        <h2>Account</h2>
        <h3>Do I need an account to order?</h3>
        <p>No, guest checkout is available. An account simply keeps your order history, addresses, wishlist and reward
        points in one place.</p>

        <h3>I forgot my password.</h3>
        <p>Use the "Forgot password" link on the <a href="/login">login page</a> and follow the reset email.</p>

        <h3>How do reward points work?</h3>
        <p>You earn points on completed orders and can redeem them against a future purchase. Your current balance is
        shown in <a href="/account">My Account</a>.</p>
      `, "wide"),
      cta("Still stuck?", "Our support team answers every message — usually within one business day."),
    ],
  },

  {
    slug: "returns-exchanges",
    title: "Returns & Exchanges",
    blocks: [
      hero("Returns & Exchanges", "Wrong size, wrong fit, or simply not for you — here's how to sort it out."),
      text(`
        <h2>The short version</h2>
        <ul>
          <li>You have <strong>14 days</strong> from delivery to request a return or exchange.</li>
          <li>Items must be <strong>unworn, unwashed, undamaged</strong> and have their original tags attached.</li>
          <li>Exchanges for a different size or colour are free of any restocking charge — you only cover return shipping.</li>
          <li>Refunds go back to the original payment method once the item passes inspection.</li>
        </ul>
      `, "wide"),
      text(`
        <h2>How to start a return</h2>
        <ol>
          <li>Go to <a href="/account">My Account → Orders</a> and open the order in question (or
              <a href="/pages/contact-support">message us</a> with your Order ID if you checked out as a guest).</li>
          <li>Tell us which item you're returning and whether you want an <strong>exchange</strong>, a
              <strong>refund</strong>, or <strong>store credit</strong>.</li>
          <li>We reply with the return address and a reference number — write that number on the parcel.</li>
          <li>Pack the item with its tags and original packaging and hand it to the courier.</li>
        </ol>
        <p>Please don't send anything back before you hear from us — unannounced parcels are hard to match to an order
        and slow your refund down.</p>
      `, "wide"),
      text(`
        <h2>Exchanges</h2>
        <p>Exchanges are the fastest route when the length or fit isn't right. We reserve the replacement size for you
        while your return is in transit, and dispatch it as soon as the original item is received and checked. If the
        size you want has sold out in the meantime, we'll offer store credit or a full refund instead.</p>

        <h2>Refund timelines</h2>
        <ul>
          <li><strong>Inspection:</strong> 1–3 business days after your parcel reaches our warehouse.</li>
          <li><strong>Card refunds:</strong> 5–10 business days for the amount to appear on your statement, depending on your bank.</li>
          <li><strong>Mobile wallet / cash-on-delivery orders:</strong> refunded to the account or number you nominate, usually within 5 business days.</li>
          <li><strong>Store credit:</strong> issued immediately after inspection.</li>
        </ul>
        <p>Original shipping charges are refunded only when the return is caused by a fault on our side.</p>
      `, "wide"),
      text(`
        <h2>Faulty or wrong items</h2>
        <p>If something arrives damaged, defective, or simply isn't what you ordered, contact us within
        <strong>48 hours</strong> of delivery with photos of the item and the packaging. We cover the return shipping
        and send a replacement — or a full refund if you'd rather not wait.</p>

        <h2>What we can't accept</h2>
        <ul>
          <li>Items returned after the 14-day window.</li>
          <li>Worn, washed, altered or tailored items, or items with the tags removed.</li>
          <li>Underwear, socks and other intimate items, for hygiene reasons.</li>
          <li>Made-to-measure and custom-tailored orders, which are produced to your own measurements.</li>
          <li>Gift cards and items marked "final sale" on the product page.</li>
        </ul>
      `, "wide"),
      cta("Need to return something?", "Send us your Order ID and we'll set the return up for you."),
    ],
  },

  {
    slug: "shipping-policy",
    title: "Shipping",
    blocks: [
      hero("Shipping", "When your order leaves us, how long it takes, and what it costs."),
      text(`
        <h2>Order processing</h2>
        <p>Orders are picked, quality-checked and packed within <strong>1–2 business days</strong>. Orders placed on a
        weekend or public holiday start processing the next working day. You'll get an email the moment your parcel is
        handed to the courier.</p>

        <h2>Delivery estimates</h2>
        <table>
          <thead>
            <tr><th>Destination</th><th>Estimated delivery</th></tr>
          </thead>
          <tbody>
            <tr><td>Inside Dhaka</td><td>1–3 business days</td></tr>
            <tr><td>Outside Dhaka</td><td>3–5 business days</td></tr>
            <tr><td>Rest of South Asia</td><td>5–10 business days</td></tr>
            <tr><td>International</td><td>7–15 business days</td></tr>
          </tbody>
        </table>
        <p>These are estimates from the date of dispatch, not the date of order. Customs clearance, weather and peak
        seasons such as Eid or year-end sales can add a few days.</p>
      `, "wide"),
      text(`
        <h2>Shipping charges</h2>
        <p>The exact charge for your address is calculated at checkout before you pay — you'll never be billed for
        shipping afterwards. Charges depend on the destination zone and the weight of the parcel, and free-shipping
        thresholds (when active) are shown in the cart.</p>

        <h2>Duties &amp; taxes on international orders</h2>
        <p>International parcels may attract import duty, VAT or a handling fee in the destination country. These are
        set by local customs and are payable by the recipient — they are not included in the price you pay us.</p>

        <h2>Tracking your parcel</h2>
        <p>Use <a href="/track-order">Track My Order</a> with your order number (or the phone number on the order) to see the current stage: Order
        Placed → Processing → Shipped &amp; In Transit → Delivered. Courier tracking can take a few hours to show
        movement after dispatch.</p>
      `, "wide"),
      text(`
        <h2>Delivery addresses</h2>
        <p>Please double-check your address and phone number at checkout — couriers call before delivery. We can update
        an address only while the order is still <strong>Pending</strong>. We don't currently deliver to PO boxes.</p>

        <h2>Missed deliveries</h2>
        <p>Couriers usually attempt delivery up to three times before returning a parcel to us. If your parcel comes
        back, we'll contact you to arrange redelivery (a second shipping charge may apply) or issue a refund for the
        items.</p>

        <h2>Something went missing?</h2>
        <p>If tracking shows delivered but you don't have the parcel, check with neighbours and building security first,
        then <a href="/pages/contact-support">contact us</a> within 7 days so we can open a case with the courier.</p>
      `, "wide"),
      cta("Question about a delivery?", "Send us your Order ID and we'll chase the courier for you."),
    ],
  },

  {
    slug: "feedback",
    title: "Feedback",
    blocks: [
      hero("Feedback", "Tell us what worked, what didn't, and what you wish we made."),
      text(`
        <h2>Why your feedback matters</h2>
        <p>We build for a body type most brands ignore, so the details you notice — a sleeve that finally reaches your
        wrist, a hem that still rides up — genuinely shape the next production run. Every message is read by the team.</p>

        <h2>What's most useful to us</h2>
        <ul>
          <li><strong>Fit and length:</strong> your height, the size you ordered, and where the garment fell short or ran long.</li>
          <li><strong>Fabric and quality:</strong> how it held up after a few washes.</li>
          <li><strong>The buying experience:</strong> anything confusing on the site, at checkout, or during delivery.</li>
          <li><strong>What we're missing:</strong> the product, colour or size you keep looking for and can't find.</li>
        </ul>
      `, "wide"),
      text(`
        <h2>How to send it</h2>
        <ol>
          <li>Use the <a href="/pages/contact-support">contact form</a> and pick a clear subject such as "Feedback — fit"
              or "Feedback — website".</li>
          <li>Leave a review on the product page — it's the single most helpful thing for the next tall customer sizing up.</li>
          <li>Answer the follow-up email we send after delivery.</li>
        </ol>

        <h2>Reporting a problem instead?</h2>
        <p>If something is wrong with an order rather than a suggestion, the
        <a href="/pages/returns-exchanges">returns &amp; exchanges</a> route is faster — it's handled by the team that can
        replace or refund the item straight away.</p>

        <h2>Accessibility</h2>
        <p>If any part of the site is hard to use with a screen reader, keyboard or magnification, please tell us —
        see our <a href="/pages/accessibility-statement">accessibility statement</a>.</p>
      `, "wide"),
      cta("Share your feedback", "It takes two minutes and it genuinely changes what we make next.", "Write to Us"),
    ],
  },

  {
    slug: "size-charts",
    title: "Size Charts",
    blocks: [
      hero("Size Charts", "Built for tall men 6'0\" – 7'1\" and tall women 5'9\" – 6'6\"."),
      text(`
        <h2>How to measure</h2>
        <ul>
          <li><strong>Chest / bust:</strong> around the fullest part, tape level and snug but not tight.</li>
          <li><strong>Waist:</strong> around your natural waistline, just above the navel.</li>
          <li><strong>Hip:</strong> around the fullest part of the seat.</li>
          <li><strong>Sleeve:</strong> from the centre back of the neck, over the shoulder, down to the wrist bone.</li>
          <li><strong>Inseam:</strong> from the crotch seam straight down to the ankle.</li>
        </ul>
        <p>The most reliable method is to measure a garment you already own and love, laid flat, and compare it with the
        numbers below. Measurements are in inches, and garments are cut with normal tolerances of about ±0.5".</p>
      `, "wide"),
      text(`
        <h2>Men — tops</h2>
        <table>
          <thead><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Sleeve</th><th>Body length</th></tr></thead>
          <tbody>
            <tr><td>S Tall</td><td>36–38</td><td>30–32</td><td>36</td><td>30</td></tr>
            <tr><td>M Tall</td><td>39–41</td><td>33–35</td><td>36.5</td><td>31</td></tr>
            <tr><td>L Tall</td><td>42–44</td><td>36–38</td><td>37</td><td>32</td></tr>
            <tr><td>XL Tall</td><td>45–47</td><td>39–41</td><td>37.5</td><td>33</td></tr>
            <tr><td>2XL Tall</td><td>48–50</td><td>42–44</td><td>38</td><td>34</td></tr>
          </tbody>
        </table>

        <h2>Men — bottoms</h2>
        <table>
          <thead><tr><th>Size</th><th>Waist</th><th>Hip</th><th>Inseam options</th></tr></thead>
          <tbody>
            <tr><td>30</td><td>30</td><td>38</td><td>34 / 36 / 38</td></tr>
            <tr><td>32</td><td>32</td><td>40</td><td>34 / 36 / 38</td></tr>
            <tr><td>34</td><td>34</td><td>42</td><td>34 / 36 / 38</td></tr>
            <tr><td>36</td><td>36</td><td>44</td><td>34 / 36 / 38</td></tr>
            <tr><td>38</td><td>38</td><td>46</td><td>34 / 36 / 38</td></tr>
          </tbody>
        </table>
      `, "wide"),
      text(`
        <h2>Women — tops</h2>
        <table>
          <thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Sleeve</th><th>Body length</th></tr></thead>
          <tbody>
            <tr><td>XS Tall</td><td>32–33</td><td>25–26</td><td>33.5</td><td>26</td></tr>
            <tr><td>S Tall</td><td>34–35</td><td>27–28</td><td>34</td><td>26.5</td></tr>
            <tr><td>M Tall</td><td>36–37</td><td>29–30</td><td>34.5</td><td>27</td></tr>
            <tr><td>L Tall</td><td>38–40</td><td>31–33</td><td>35</td><td>27.5</td></tr>
            <tr><td>XL Tall</td><td>41–43</td><td>34–36</td><td>35.5</td><td>28</td></tr>
          </tbody>
        </table>

        <h2>Women — bottoms</h2>
        <table>
          <thead><tr><th>Size</th><th>Waist</th><th>Hip</th><th>Inseam options</th></tr></thead>
          <tbody>
            <tr><td>26</td><td>26</td><td>36</td><td>34 / 36</td></tr>
            <tr><td>28</td><td>28</td><td>38</td><td>34 / 36</td></tr>
            <tr><td>30</td><td>30</td><td>40</td><td>34 / 36</td></tr>
            <tr><td>32</td><td>32</td><td>42</td><td>34 / 36</td></tr>
            <tr><td>34</td><td>34</td><td>44</td><td>34 / 36</td></tr>
          </tbody>
        </table>
      `, "wide"),
      text(`
        <h2>Between two sizes?</h2>
        <p>For tops, size up if you prefer a relaxed fit or plan to layer; stay with the smaller size for a closer cut.
        For bottoms, pick the waist that matches your measurement and choose the inseam that matches your usual trouser
        length — the inseam is the part standard sizing usually gets wrong.</p>

        <h2>Still not sure?</h2>
        <p>Send us your height and key measurements through the <a href="/pages/contact-support">contact form</a> and
        we'll recommend a size. If it still isn't right, <a href="/pages/returns-exchanges">exchanges</a> are
        straightforward.</p>
      `, "wide"),
      cta("Not sure about your size?", "Send us your measurements and we'll recommend the right fit.", "Ask Our Team"),
    ],
  },
]

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes("--force")

  for (const page of PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: page.slug } })
    const content = JSON.stringify(page.blocks, null, 2)

    if (existing && !force) {
      console.log(`- skipped  /pages/${page.slug} (already exists — rerun with --force to overwrite)`)
      continue
    }

    if (existing) {
      await prisma.page.update({
        where: { slug: page.slug },
        data: { title: page.title, content, published: true },
      })
      console.log(`✎ updated  /pages/${page.slug}`)
    } else {
      await prisma.page.create({
        data: { title: page.title, slug: page.slug, content, published: true },
      })
      console.log(`+ created  /pages/${page.slug}`)
    }
  }
}

main()
  .catch((e) => {
    console.error("[SEED_HELP_PAGES_ERROR]", e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
